const database = require("../config/database");

const createRewardEntry = async ({
  userId,
  username,
  source,
  title,
  amount,
  status = "credited",
  referenceId = null,
  awardedAt = new Date()
}, client = database) => {
  const result = await client.query(
    `INSERT INTO rewards (user_id, username, source, title, amount, status, reference_id, awarded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING
     RETURNING
       id,
       user_id AS "userId",
       username,
       source,
       title,
       amount,
       status,
       reference_id AS "referenceId",
       awarded_at AS "awardedAt"`,
    [userId, username, source, title, amount, status, referenceId, awardedAt]
  );

  return result.rows[0] || null;
};

const getRewardsByUser = async (userId) => {
  const syncQueries = [
    database.query(
      `INSERT INTO rewards (user_id, username, source, title, amount, status, reference_id, awarded_at)
       SELECT
         user_id,
         username,
         'lucky_box',
         'Lucky Box Prize',
         prize_amount,
         'credited',
         'lucky_box-' || id,
         opened_at
       FROM lucky_box
       WHERE user_id = $1
       ON CONFLICT (source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING`,
      [userId]
    ),
    database.query(
      `INSERT INTO rewards (user_id, username, source, title, amount, status, reference_id, awarded_at)
       SELECT
         user_id,
         username,
         'daily_spin',
         'Daily Spin Reward',
         prize_amount,
         'credited',
         'daily_spin-' || id,
         spun_at
       FROM daily_spin
       WHERE user_id = $1
       ON CONFLICT (source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING`,
      [userId]
    ),
    database.query(
      `INSERT INTO rewards (user_id, username, source, title, amount, status, reference_id, awarded_at)
       SELECT
         user_id,
         username,
         'leadership',
         CASE
           WHEN reward_type = 'weekly' THEN 'Leadership Weekly Salary'
           WHEN reward_type = 'one_time' THEN 'Leadership One-time Reward'
           ELSE 'Leadership Reward'
         END,
         amount,
         'credited',
         'leadership-' || id,
         granted_at
       FROM leadership_rewards
       WHERE user_id = $1
       ON CONFLICT (source, reference_id) WHERE reference_id IS NOT NULL DO NOTHING`,
      [userId]
    )
  ];

  await Promise.all(syncQueries);

  const [summaryResult, rewardsResult] = await Promise.all([
    database.query(
      `SELECT
         COUNT(*)::INT AS total,
         COALESCE(SUM(amount), 0)::NUMERIC AS "totalAmount",
         COALESCE(SUM(amount) FILTER (WHERE source = 'lucky_box'), 0)::NUMERIC AS "luckyBoxAmount",
         COALESCE(SUM(amount) FILTER (WHERE source = 'daily_spin'), 0)::NUMERIC AS "dailySpinAmount",
         COALESCE(SUM(amount) FILTER (WHERE source = 'leadership'), 0)::NUMERIC AS "leadershipAmount",
         COALESCE(SUM(amount) FILTER (WHERE source = 'referral_first_deposit_bonus'), 0)::NUMERIC AS "referralDepositBonusAmount",
         COALESCE(SUM(amount) FILTER (WHERE source = 'trade_commission'), 0)::NUMERIC AS "tradeCommissionAmount"
       FROM rewards
       WHERE user_id = $1`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         user_id AS "userId",
         username,
         source,
         title,
         amount,
         status,
         reference_id AS "referenceId",
         awarded_at AS "awardedAt"
       FROM rewards
       WHERE user_id = $1
       ORDER BY awarded_at DESC
       LIMIT 100`,
      [userId]
    )
  ]);

  return {
    summary: summaryResult.rows[0],
    rewards: rewardsResult.rows
  };
};

module.exports = {
  createRewardEntry,
  getRewardsByUser
};
