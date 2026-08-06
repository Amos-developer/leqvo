const database = require("../config/database");

const signalFields = `
  id,
  pair,
  currency,
  signal_code AS "signalCode",
  profit_percent AS "profitPercent",
  min_deposit_required AS "minDepositRequired",
  valid_from AS "validFrom",
  valid_to AS "validTo",
  status,
  created_by AS "createdBy",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const expireElapsedSignals = async () => {
  await database.query(
    `UPDATE copy_signals
     SET status = 'expired',
         updated_at = NOW()
     WHERE status = 'active'
       AND valid_to < NOW()`
  );
};

const createSignal = async ({ pair, currency, signalCode, profitPercent, minDepositRequired, validFrom, validTo, createdBy }) => {
  const result = await database.query(
    `INSERT INTO copy_signals (pair, currency, signal_code, profit_percent, min_deposit_required, valid_from, valid_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${signalFields}`,
    [pair, currency, signalCode, profitPercent, minDepositRequired, validFrom, validTo, createdBy]
  );

  return result.rows[0];
};

const findSignalByValidFrom = async (validFrom) => {
  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     WHERE valid_from = $1
     LIMIT 1`,
    [validFrom]
  );

  return result.rows[0] || null;
};

const getSignals = async () => {
  await expireElapsedSignals();

  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     ORDER BY valid_from DESC
     LIMIT 100`
  );

  return result.rows;
};

const findSignalByCode = async (signalCode) => {
  await expireElapsedSignals();

  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     WHERE signal_code = $1
     LIMIT 1`,
    [signalCode]
  );

  return result.rows[0] || null;
};

const findActiveSignalByPair = async (pair) => {
  await expireElapsedSignals();

  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     WHERE pair = $1
       AND status = 'active'
       AND valid_from <= NOW()
       AND valid_to >= NOW()
     ORDER BY valid_from DESC
     LIMIT 1`,
    [pair]
  );

  return result.rows[0] || null;
};

const getActiveSignals = async () => {
  await expireElapsedSignals();

  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     WHERE status = 'active'
       AND valid_from <= NOW()
       AND valid_to >= NOW()
     ORDER BY valid_from ASC`
  );

  return result.rows;
};

const hasBonusSignalAccess = async (userId, minimumDepositRequired) => {
  const threshold = Number(minimumDepositRequired || 0);

  if (!userId || threshold <= 0) {
    return true;
  }

  const result = await database.query(
    `SELECT EXISTS (
       SELECT 1
       FROM deposits d
       WHERE d.user_id = $1
         AND d.credited_at IS NOT NULL
         AND d.price_amount >= $2
     ) AS "hasSelfQualified",
     EXISTS (
       SELECT 1
       FROM deposits d
       JOIN users u ON u.id = d.user_id
       WHERE u.referred_by = $1
         AND d.credited_at IS NOT NULL
         AND d.price_amount >= $2
     ) AS "hasReferralQualified"`,
    [userId, threshold]
  );

  const eligibility = result.rows[0] || {};

  return Boolean(eligibility.hasSelfQualified || eligibility.hasReferralQualified);
};

module.exports = {
  expireElapsedSignals,
  createSignal,
  findSignalByValidFrom,
  getSignals,
  findSignalByCode,
  findActiveSignalByPair,
  getActiveSignals,
  hasBonusSignalAccess
};
