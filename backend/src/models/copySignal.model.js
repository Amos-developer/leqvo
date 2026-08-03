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

const createSignal = async ({ pair, currency, signalCode, profitPercent, minDepositRequired, validFrom, validTo, createdBy }) => {
  const result = await database.query(
    `INSERT INTO copy_signals (pair, currency, signal_code, profit_percent, min_deposit_required, valid_from, valid_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${signalFields}`,
    [pair, currency, signalCode, profitPercent, minDepositRequired, validFrom, validTo, createdBy]
  );

  return result.rows[0];
};

const getSignals = async () => {
  const result = await database.query(
    `SELECT ${signalFields}
     FROM copy_signals
     ORDER BY valid_from DESC
     LIMIT 100`
  );

  return result.rows;
};

module.exports = {
  createSignal,
  getSignals
};
