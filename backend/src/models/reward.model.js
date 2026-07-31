const database = require("../config/database");

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
         COALESCE(SUM(amount) FILTER (WHERE source = 'leadership'), 0)::NUMERIC AS "leadershipAmount"
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
  getRewardsByUser
};
