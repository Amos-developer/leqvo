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
  target_profit_percent AS "targetProfitPercent",
  settles_at AS "settlesAt",
  pnl_amount AS "pnlAmount",
  pnl_percent AS "pnlPercent",
  status,
  is_trial_trade AS "isTrialTrade",
  opened_at AS "openedAt",
  closed_at AS "closedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const settleCompletedTradesForUser = async (userId, client = database) => {
  const activeTradesResult = await client.query(
    `SELECT
       id,
       amount,
       target_profit_percent AS "targetProfitPercent"
     FROM trades
     WHERE user_id = $1
       AND status = 'active'
       AND settles_at IS NOT NULL
       AND settles_at <= NOW()
     ORDER BY settles_at ASC
     FOR UPDATE`,
    [userId]
  );

  const trades = activeTradesResult.rows;

  if (!trades.length) {
    return {
      settledCount: 0,
      creditedAmount: 0
    };
  }

  let creditedAmount = 0;

  for (const trade of trades) {
    const amount = Number(trade.amount || 0);
    const profitPercent = Number(trade.targetProfitPercent || 0);
    const pnlAmount = Number(((amount * profitPercent) / 100).toFixed(8));
    const settledAmount = Number((amount + pnlAmount).toFixed(8));

    creditedAmount += settledAmount;

    await client.query(
      `UPDATE trades
       SET pnl_amount = $2,
           pnl_percent = $3,
           status = 'win',
           closed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [trade.id, pnlAmount, profitPercent]
    );
  }

  await client.query(
    `UPDATE users
     SET trading_balance = trading_balance + $2,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, creditedAmount]
  );

  return {
    settledCount: trades.length,
    creditedAmount
  };
};

const createTrade = async ({
  user,
  pair,
  symbol,
  signalCode,
  allocationPercent,
  amount,
  entryPrice,
  targetProfitPercent,
  settlesAt
}) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    await settleCompletedTradesForUser(user.id, client);

    const firstRealTransferResult = await client.query(
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

    const userResult = await client.query(
      `SELECT id, username, trading_balance
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [user.id]
    );
    const currentUser = userResult.rows[0];

    if (!currentUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (Number(currentUser.trading_balance || 0) < Number(amount)) {
      const error = new Error("Trading account balance is not enough");
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      `UPDATE users
       SET trading_balance = trading_balance - $2,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id, amount]
    );

    const result = await client.query(
      `INSERT INTO trades (
         user_id,
         username,
         pair,
         symbol,
         signal_code,
         allocation_percent,
         amount,
         entry_price,
         target_profit_percent,
         settles_at,
         is_trial_trade
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${tradeFields}`,
      [
        user.id,
        user.username,
        pair,
        symbol,
        signalCode,
        allocationPercent,
        amount,
        entryPrice,
        targetProfitPercent,
        settlesAt,
        isTrialTrade
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createTrade,
  settleCompletedTradesForUser
};
