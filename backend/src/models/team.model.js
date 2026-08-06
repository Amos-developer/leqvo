const database = require("../config/database");
const leadershipModel = require("./leadership.model");

const createTeamLinks = async ({ inviterId, memberId }) => {
  if (!inviterId || !memberId || inviterId === memberId) {
    return;
  }

  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO teams (user_id, member_id, level)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, member_id) DO NOTHING`,
      [inviterId, memberId]
    );

    const ancestors = await client.query(
      `SELECT user_id AS "userId", level
       FROM teams
       WHERE member_id = $1
         AND level < 5
       ORDER BY level ASC`,
      [inviterId]
    );

    for (const ancestor of ancestors.rows) {
      await client.query(
        `INSERT INTO teams (user_id, member_id, level)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, member_id) DO NOTHING`,
        [ancestor.userId, memberId, Number(ancestor.level) + 1]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getTeamOverview = async (userId) => {
  const [userResult, summaryResult, levelResult, membersResult] = await Promise.all([
    database.query(
      `SELECT id, username, referral_code AS "referralCode"
       FROM users
       WHERE id = $1`,
      [userId]
    ),
    database.query(
      `SELECT
         COUNT(DISTINCT t.member_id)::INT AS "totalMembers",
         COUNT(DISTINCT t.member_id)::INT AS "totalTeam",
         COUNT(DISTINCT t.member_id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM deposits d
             WHERE d.user_id = t.member_id
               AND d.credited_at IS NOT NULL
           )
         )::INT AS "activeMembers",
         COUNT(DISTINCT t.member_id) FILTER (
           WHERE NOT EXISTS (
             SELECT 1 FROM deposits d
             WHERE d.user_id = t.member_id
               AND d.credited_at IS NOT NULL
           )
         )::INT AS "inactiveMembers",
         COALESCE(SUM(d.price_amount) FILTER (WHERE d.credited_at IS NOT NULL), 0)::NUMERIC AS "teamDeposit",
         COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'approved'), 0)::NUMERIC AS "teamWithdrawal",
         COALESCE((
           SELECT SUM(r.amount)
           FROM rewards r
           WHERE r.user_id = $1
             AND r.source IN ('referral_first_deposit_bonus', 'trade_commission')
         ), 0)::NUMERIC AS "totalEarnings"
       FROM teams t
       LEFT JOIN deposits d ON d.user_id = t.member_id
       LEFT JOIN withdrawals w ON w.user_id = t.member_id
       WHERE t.user_id = $1`,
      [userId]
    ),
    database.query(
      `SELECT COUNT(*)::INT AS count
       FROM teams
       WHERE user_id = $1`,
      [userId]
    ),
    database.query(
      `SELECT
         t.level,
         u.id,
         u.username,
         u.email,
         u.balance,
         u.created_at AS "createdAt",
         EXISTS (
           SELECT 1 FROM deposits d
           WHERE d.user_id = u.id
             AND d.credited_at IS NOT NULL
         ) AS "isActive",
         COALESCE((
           SELECT SUM(price_amount)
           FROM deposits d
           WHERE d.user_id = u.id
             AND d.credited_at IS NOT NULL
         ), 0)::NUMERIC AS "totalDeposit"
       FROM teams t
       JOIN users u ON u.id = t.member_id
       WHERE t.user_id = $1
       ORDER BY t.level ASC, t.created_at DESC`,
      [userId]
    )
  ]);

  const summary = summaryResult.rows[0];
  const user = userResult.rows[0];
  const totalTeam = Number(levelResult.rows[0]?.count || 0);
  const leaderLevel = totalTeam >= 500 ? 5 : totalTeam >= 200 ? 4 : totalTeam >= 80 ? 3 : totalTeam >= 20 ? 2 : 1;
  const teamDeposit = Number(summary.teamDeposit || 0);
  const levelOneMembers = membersResult.rows.filter((member) => Number(member.level) === 1);
  const levelTwoThreeMembers = membersResult.rows.filter((member) => [2, 3].includes(Number(member.level)));
  const activeLevelOneMembers = levelOneMembers.filter((member) => member.isActive).length;
  const levelOneDeposit = levelOneMembers.reduce((total, member) => total + Number(member.totalDeposit || 0), 0);
  const levelTwoThreeDeposit = levelTwoThreeMembers.reduce((total, member) => total + Number(member.totalDeposit || 0), 0);
  const leadership = await leadershipModel.upsertLeadershipRecord({
    userId,
    username: user?.username || "",
    activeLevelOneMembers,
    levelOneDeposit,
    levelTwoThreeDeposit
  });

  return {
    summary: {
      ...summary,
      referralCode: user?.referralCode,
      leaderLevel,
      totalEarnings: Number(summary.totalEarnings || 0).toFixed(2),
      leadership
    },
    levels: [1, 2, 3].map((level) => ({
      level,
      members: membersResult.rows.filter((member) => Number(member.level) === level)
    }))
  };
};

module.exports = {
  createTeamLinks,
  getTeamOverview
};
