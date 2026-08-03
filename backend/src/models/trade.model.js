const database = require("../config/database");

const tradeFields = `
  id,
  user_id AS "userId",
  username,
  pair,
  symbol,
  signal_code AS "signalCode",
  allocation_percent AS "allocationPercent",
  amount,
  entry_price AS "entryPrice",
  exit_price AS "exitPrice",
  pnl_amount AS "pnlAmount",
  pnl_percent AS "pnlPercent",
  status,
  is_trial_trade AS "isTrialTrade",
  opened_at AS "openedAt",
  closed_at AS "closedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const createTrade = async ({ user, pair, symbol, signalCode, allocationPercent, amount, entryPrice }) => {
  const firstRealTransferResult = await database.query(
    `SELECT created_at
     FROM account_transfers
     WHERE user_id = $1
       AND from_account = 'main'
       AND to_account = 'trading'
     ORDER BY created_at ASC
     LIMIT 1`,
    [user.id]
  );
  const firstRealTransferAt = firstRealTransferResult.rows[0]?.created_at || null;
  const isTrialTrade = !firstRealTransferAt;

  const result = await database.query(
    `INSERT INTO trades (user_id, username, pair, symbol, signal_code, allocation_percent, amount, entry_price, is_trial_trade)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${tradeFields}`,
    [user.id, user.username, pair, symbol, signalCode, allocationPercent, amount, entryPrice, isTrialTrade]
  );

  return result.rows[0];
};

module.exports = {
  createTrade
};
