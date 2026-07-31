const database = require("../config/database");
const userModel = require("./user.model");

const segments = [
  { label: "$0.10", amount: 0.1, weight: 30 },
  { label: "$0.20", amount: 0.2, weight: 24 },
  { label: "$0.50", amount: 0.5, weight: 18 },
  { label: "$1.00", amount: 1, weight: 12 },
  { label: "$2.00", amount: 2, weight: 8 },
  { label: "$3.00", amount: 3, weight: 5 },
  { label: "$5.00", amount: 5, weight: 2 },
  { label: "$10.00", amount: 10, weight: 1 }
];

const drawSegment = () => {
  if (Math.random() < 0.99) {
    return { ...segments[0], index: 0 };
  }

  const rareSegments = segments.slice(1);
  const selectedIndex = Math.floor(Math.random() * rareSegments.length);

  return { ...rareSegments[selectedIndex], index: selectedIndex + 1 };
};

const getStatus = async (userId) => {
  const [todayResult, latestResult, historyResult] = await Promise.all([
    database.query(
      `SELECT
         id,
         spin_date AS "spinDate",
         streak_day AS "streakDay",
         prize_label AS "prizeLabel",
         prize_amount AS "prizeAmount",
         segment_index AS "segmentIndex",
         spun_at AS "spunAt"
       FROM daily_spin
       WHERE user_id = $1
         AND spin_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    ),
    database.query(
      `SELECT
         spin_date AS "spinDate",
         streak_day AS "streakDay"
       FROM daily_spin
       WHERE user_id = $1
       ORDER BY spin_date DESC
       LIMIT 1`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         spin_date AS "spinDate",
         streak_day AS "streakDay",
         prize_label AS "prizeLabel",
         prize_amount AS "prizeAmount",
         segment_index AS "segmentIndex",
         spun_at AS "spunAt"
       FROM daily_spin
       WHERE user_id = $1
       ORDER BY spun_at DESC
       LIMIT 20`,
      [userId]
    )
  ]);
  const latest = latestResult.rows[0] || null;
  const missedYesterday = latest ? new Date(latest.spinDate).toDateString() !== new Date(Date.now() - 86400000).toDateString() && !todayResult.rows[0] : false;

  return {
    canSpin: !todayResult.rows[0],
    today: todayResult.rows[0] || null,
    latest,
    missedYesterday,
    nextStreakDay: latest && !missedYesterday ? Number(latest.streakDay || 0) + 1 : 1,
    segments: segments.map(({ label, amount }, index) => ({ label, amount, index })),
    history: historyResult.rows
  };
};

const spin = async (user) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const todayResult = await client.query(
      `SELECT
         id,
         spin_date AS "spinDate",
         streak_day AS "streakDay",
         prize_label AS "prizeLabel",
         prize_amount AS "prizeAmount",
         segment_index AS "segmentIndex",
         spun_at AS "spunAt"
       FROM daily_spin
       WHERE user_id = $1
         AND spin_date = CURRENT_DATE
       LIMIT 1
       FOR UPDATE`,
      [user.id]
    );

    if (todayResult.rows[0]) {
      await client.query("ROLLBACK");

      return {
        alreadySpun: true,
        spin: todayResult.rows[0],
        user
      };
    }

    const latestResult = await client.query(
      `SELECT spin_date AS "spinDate", streak_day AS "streakDay"
       FROM daily_spin
       WHERE user_id = $1
       ORDER BY spin_date DESC
       LIMIT 1`,
      [user.id]
    );
    const latest = latestResult.rows[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const latestDate = latest?.spinDate ? new Date(latest.spinDate).toISOString().slice(0, 10) : "";
    const streakDay = latestDate === yesterday ? Number(latest.streakDay || 0) + 1 : 1;
    const prize = drawSegment();
    const spinResult = await client.query(
      `INSERT INTO daily_spin (user_id, username, streak_day, prize_label, prize_amount, segment_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         user_id AS "userId",
         username,
         spin_date AS "spinDate",
         streak_day AS "streakDay",
         prize_label AS "prizeLabel",
         prize_amount AS "prizeAmount",
         segment_index AS "segmentIndex",
         spun_at AS "spunAt"`,
      [user.id, user.username, streakDay, prize.label, prize.amount, prize.index]
    );
    const updatedUser = await userModel.incrementUserBalance(user.id, prize.amount, client);

    await client.query("COMMIT");

    return {
      alreadySpun: false,
      spin: spinResult.rows[0],
      user: updatedUser
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  segments,
  getStatus,
  spin
};
