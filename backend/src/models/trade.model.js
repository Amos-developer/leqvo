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
  opened_at AS "openedAt",
  closed_at AS "closedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const createTrade = async ({ user, pair, symbol, signalCode, allocationPercent, amount, entryPrice }) => {
  const result = await database.query(
    `INSERT INTO trades (user_id, username, pair, symbol, signal_code, allocation_percent, amount, entry_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${tradeFields}`,
    [user.id, user.username, pair, symbol, signalCode, allocationPercent, amount, entryPrice]
  );

  return result.rows[0];
};

module.exports = {
  createTrade
};
