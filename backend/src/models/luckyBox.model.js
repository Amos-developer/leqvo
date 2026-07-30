const database = require("../config/database");
const userModel = require("./user.model");

const prizes = [0.5, 1, 3, 5, 8, 10, 15, 17, 20];

const drawPrize = () => {
  if (Math.random() < 0.98) {
    return 0.5;
  }

  const rarePrizes = prizes.filter((prize) => prize !== 0.5);

  return rarePrizes[Math.floor(Math.random() * rarePrizes.length)];
};

const getStatus = async (userId) => {
  const result = await database.query(
    `SELECT
       id,
       user_id AS "userId",
       username,
       box_number AS "boxNumber",
       prize_amount AS "prizeAmount",
       opened_on AS "openedOn",
       opened_at AS "openedAt"
     FROM lucky_box
     WHERE user_id = $1
     ORDER BY opened_at DESC
     LIMIT 8`,
    [userId]
  );
  const todayResult = await database.query(
    `SELECT
       id,
       box_number AS "boxNumber",
       prize_amount AS "prizeAmount",
       opened_on AS "openedOn",
       opened_at AS "openedAt"
     FROM lucky_box
     WHERE user_id = $1
       AND opened_on = CURRENT_DATE
     LIMIT 1`,
    [userId]
  );

  return {
    canOpen: !todayResult.rows[0],
    today: todayResult.rows[0] || null,
    history: result.rows
  };
};

const openBox = async ({ user, boxNumber }) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT
         id,
         box_number AS "boxNumber",
         prize_amount AS "prizeAmount",
         opened_on AS "openedOn",
         opened_at AS "openedAt"
       FROM lucky_box
       WHERE user_id = $1
         AND opened_on = CURRENT_DATE
       LIMIT 1
       FOR UPDATE`,
      [user.id]
    );

    if (existingResult.rows[0]) {
      await client.query("ROLLBACK");

      return {
        alreadyOpened: true,
        reward: existingResult.rows[0],
        user
      };
    }

    const prizeAmount = drawPrize();
    const rewardResult = await client.query(
      `INSERT INTO lucky_box (user_id, username, box_number, prize_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         user_id AS "userId",
         username,
         box_number AS "boxNumber",
         prize_amount AS "prizeAmount",
         opened_on AS "openedOn",
         opened_at AS "openedAt"`,
      [user.id, user.username, boxNumber, prizeAmount]
    );
    const updatedUser = await userModel.incrementUserBalance(user.id, prizeAmount, client);

    await client.query("COMMIT");

    return {
      alreadyOpened: false,
      reward: rewardResult.rows[0],
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
  prizes,
  getStatus,
  openBox
};
