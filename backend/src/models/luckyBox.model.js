const database = require("../config/database");
const userModel = require("./user.model");

const prizes = [0.5, 1, 3, 5, 8, 10, 15, 17, 20];
const QUALIFYING_DEPOSIT_AMOUNT = 100;

const drawPrize = () => {
  if (Math.random() < 0.98) {
    return 0.5;
  }

  const rarePrizes = prizes.filter((prize) => prize !== 0.5);

  return rarePrizes[Math.floor(Math.random() * rarePrizes.length)];
};

const historyFields = `
  id,
  user_id AS "userId",
  username,
  box_number AS "boxNumber",
  prize_amount AS "prizeAmount",
  source_type AS "sourceType",
  source_user_id AS "sourceUserId",
  qualifying_deposit_id AS "qualifyingDepositId",
  opened_on AS "openedOn",
  opened_at AS "openedAt"
`;

const getEligibleSources = async (userId, client = database) => {
  const result = await client.query(
    `WITH self_sources AS (
       SELECT
         d.id AS "depositId",
         'self'::VARCHAR AS "sourceType",
         d.user_id AS "sourceUserId",
         u.username AS "sourceUsername",
         d.price_amount AS "qualifyingAmount",
         d.credited_at AS "qualifiedAt"
       FROM deposits d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1
         AND d.credited_at IS NOT NULL
         AND d.price_amount >= $2
         AND NOT EXISTS (
           SELECT 1
           FROM lucky_box lb
           WHERE lb.source_type = 'self'
             AND lb.qualifying_deposit_id = d.id
         )
     ),
     referral_sources AS (
       SELECT
         d.id AS "depositId",
         'referral'::VARCHAR AS "sourceType",
         d.user_id AS "sourceUserId",
         u.username AS "sourceUsername",
         d.price_amount AS "qualifyingAmount",
         d.credited_at AS "qualifiedAt"
       FROM deposits d
       JOIN users u ON u.id = d.user_id
       WHERE u.referred_by = $1
         AND d.credited_at IS NOT NULL
         AND d.price_amount >= $2
         AND NOT EXISTS (
           SELECT 1
           FROM lucky_box lb
           WHERE lb.source_type = 'referral'
             AND lb.qualifying_deposit_id = d.id
         )
     )
     SELECT *
     FROM (
       SELECT * FROM self_sources
       UNION ALL
       SELECT * FROM referral_sources
     ) eligible
     ORDER BY "qualifiedAt" ASC, "depositId" ASC`,
    [userId, QUALIFYING_DEPOSIT_AMOUNT]
  );

  return result.rows;
};

const getStatus = async (userId) => {
  const [historyResult, eligibleSources] = await Promise.all([
    database.query(
      `SELECT ${historyFields}
       FROM lucky_box
       WHERE user_id = $1
       ORDER BY opened_at DESC
       LIMIT 12`,
      [userId]
    ),
    getEligibleSources(userId)
  ]);

  const selfQualifiedCount = eligibleSources.filter((source) => source.sourceType === "self").length;
  const referralQualifiedCount = eligibleSources.filter((source) => source.sourceType === "referral").length;

  return {
    canOpen: eligibleSources.length > 0,
    availableChances: eligibleSources.length,
    selfQualifiedCount,
    referralQualifiedCount,
    nextSource: eligibleSources[0] || null,
    history: historyResult.rows
  };
};

const openBox = async ({ user, boxNumber }) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const eligibleSources = await getEligibleSources(user.id, client);
    const source = eligibleSources[0];

    if (!source) {
      await client.query("ROLLBACK");

      return {
        noChanceAvailable: true,
        user
      };
    }

    const prizeAmount = drawPrize();
    const rewardResult = await client.query(
      `INSERT INTO lucky_box (
         user_id,
         username,
         box_number,
         prize_amount,
         source_type,
         source_user_id,
         qualifying_deposit_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${historyFields}`,
      [
        user.id,
        user.username,
        boxNumber,
        prizeAmount,
        source.sourceType,
        source.sourceUserId,
        source.depositId
      ]
    );

    const updatedUser = await userModel.incrementUserBalance(user.id, prizeAmount, client);

    await client.query("COMMIT");

    return {
      noChanceAvailable: false,
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
  QUALIFYING_DEPOSIT_AMOUNT,
  getStatus,
  openBox
};
