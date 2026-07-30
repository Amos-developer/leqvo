const database = require("../config/database");

const ranks = [
  { level: 1, name: "Starter", membersMin: 5, membersMax: 10, levelOneDeposit: 1000, oneTimeReward: 50, weeklySalary: 20 },
  { level: 2, name: "Builder", membersMin: 11, membersMax: 30, levelOneDeposit: 5000, oneTimeReward: 200, weeklySalary: 100 },
  { level: 3, name: "Pro Leader", membersMin: 31, membersMax: 50, levelOneDeposit: 10000, oneTimeReward: 500, weeklySalary: 200 },
  { level: 4, name: "Elite Leader", membersMin: 51, membersMax: 100, levelOneDeposit: 30000, oneTimeReward: 1600, weeklySalary: 400 },
  {
    level: 5,
    name: "Executive Leader",
    membersMin: 101,
    membersMax: 200,
    levelOneDeposit: 500000,
    levelTwoThreeDeposit: 500000,
    oneTimeReward: 4500,
    weeklySalary: 1200
  }
];

const calculateLeadership = ({ activeLevelOneMembers, levelOneDeposit, levelTwoThreeDeposit }) => {
  const achievedRank = [...ranks].reverse().find((rank) => {
    const hasMembers = activeLevelOneMembers >= rank.membersMin;
    const hasLevelOneDeposit = levelOneDeposit >= rank.levelOneDeposit;
    const hasLevelTwoThreeDeposit = !rank.levelTwoThreeDeposit || levelTwoThreeDeposit >= rank.levelTwoThreeDeposit;

    return hasMembers && hasLevelOneDeposit && hasLevelTwoThreeDeposit;
  });
  const nextRank = ranks.find((rank) => rank.level === Number(achievedRank?.level || 0) + 1) || null;

  return {
    rank: achievedRank || null,
    nextRank,
    membersNeeded: nextRank ? Math.max(nextRank.membersMin - activeLevelOneMembers, 0) : 0,
    levelOneDepositNeeded: nextRank ? Math.max(nextRank.levelOneDeposit - levelOneDeposit, 0) : 0,
    levelTwoThreeDepositNeeded: nextRank?.levelTwoThreeDeposit
      ? Math.max(nextRank.levelTwoThreeDeposit - levelTwoThreeDeposit, 0)
      : 0
  };
};

const upsertLeadershipRecord = async ({
  userId,
  username,
  activeLevelOneMembers,
  levelOneDeposit,
  levelTwoThreeDeposit
}) => {
  const leadership = calculateLeadership({
    activeLevelOneMembers,
    levelOneDeposit,
    levelTwoThreeDeposit
  });
  const rank = leadership.rank;

  const result = await database.query(
    `INSERT INTO leadership (
       user_id,
       username,
       rank_level,
       rank_name,
       active_level_one_members,
       level_one_deposit,
       level_two_three_deposit,
       one_time_reward,
       weekly_salary,
       is_qualified,
       next_rank_name,
       members_needed,
       level_one_deposit_needed,
       level_two_three_deposit_needed,
       last_calculated_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       username = EXCLUDED.username,
       rank_level = EXCLUDED.rank_level,
       rank_name = EXCLUDED.rank_name,
       active_level_one_members = EXCLUDED.active_level_one_members,
       level_one_deposit = EXCLUDED.level_one_deposit,
       level_two_three_deposit = EXCLUDED.level_two_three_deposit,
       one_time_reward = EXCLUDED.one_time_reward,
       weekly_salary = EXCLUDED.weekly_salary,
       is_qualified = EXCLUDED.is_qualified,
       next_rank_name = EXCLUDED.next_rank_name,
       members_needed = EXCLUDED.members_needed,
       level_one_deposit_needed = EXCLUDED.level_one_deposit_needed,
       level_two_three_deposit_needed = EXCLUDED.level_two_three_deposit_needed,
       last_calculated_at = NOW(),
       updated_at = NOW()
     RETURNING
       id,
       user_id AS "userId",
       username,
       rank_level AS "rankLevel",
       rank_name AS "rankName",
       active_level_one_members AS "activeLevelOneMembers",
       level_one_deposit AS "levelOneDeposit",
       level_two_three_deposit AS "levelTwoThreeDeposit",
       one_time_reward AS "oneTimeReward",
       weekly_salary AS "weeklySalary",
       is_qualified AS "isQualified",
       next_rank_name AS "nextRankName",
       members_needed AS "membersNeeded",
       level_one_deposit_needed AS "levelOneDepositNeeded",
       level_two_three_deposit_needed AS "levelTwoThreeDepositNeeded",
       last_calculated_at AS "lastCalculatedAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [
      userId,
      username,
      rank?.level || 0,
      rank?.name || "No rank",
      activeLevelOneMembers,
      levelOneDeposit,
      levelTwoThreeDeposit,
      rank?.oneTimeReward || 0,
      rank?.weeklySalary || 0,
      Boolean(rank),
      leadership.nextRank?.name || null,
      leadership.membersNeeded,
      leadership.levelOneDepositNeeded,
      leadership.levelTwoThreeDepositNeeded
    ]
  );

  return result.rows[0];
};

module.exports = {
  ranks,
  calculateLeadership,
  upsertLeadershipRecord
};
