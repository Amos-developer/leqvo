const database = require("../config/database");
const rewardModel = require("./reward.model");

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
  automation_id AS "automationId",
  execution_mode AS "executionMode",
  pnl_amount AS "pnlAmount",
  pnl_percent AS "pnlPercent",
  status,
  is_trial_trade AS "isTrialTrade",
  opened_at AS "openedAt",
  closed_at AS "closedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const TRADE_COMMISSION_LEVELS = {
  1: 0.10,
  2: 0.03,
  3: 0.02
};

const awardTradeCommissions = async ({ tradeId, memberUserId, pnlAmount, closedAt }, client) => {
  const profitAmount = Number(pnlAmount || 0);

  if (profitAmount <= 0) {
    return;
  }

  const uplinesResult = await client.query(
    `SELECT
       t.user_id AS "userId",
       t.level,
       u.username
     FROM teams t
     JOIN users u ON u.id = t.user_id
     WHERE t.member_id = $1
       AND t.level IN (1, 2, 3)
     ORDER BY t.level ASC`,
    [memberUserId]
  );

  for (const upline of uplinesResult.rows) {
    const level = Number(upline.level || 0);
    const percent = TRADE_COMMISSION_LEVELS[level];

    if (!percent) {
      continue;
    }

    const commissionAmount = Number((profitAmount * percent).toFixed(8));

    if (commissionAmount <= 0) {
      continue;
    }

    const commissionReward = await rewardModel.createRewardEntry(
      {
        userId: upline.userId,
        username: upline.username,
        source: "trade_commission",
        title: `Level ${level} Trade Commission`,
        amount: commissionAmount,
        referenceId: `trade-${tradeId}-level-${level}`,
        awardedAt: closedAt || new Date()
      },
      client
    );

    if (commissionReward) {
      await client.query(
        `UPDATE users
         SET balance = balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [commissionAmount, upline.userId]
      );
    }
  }
};

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
    const closedAt = new Date();

    creditedAmount += settledAmount;

    await client.query(
      `UPDATE trades
       SET pnl_amount = $2,
           pnl_percent = $3,
           status = 'win',
           closed_at = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [trade.id, pnlAmount, profitPercent, closedAt]
    );

    await awardTradeCommissions({
      tradeId: trade.id,
      memberUserId: userId,
      pnlAmount,
      closedAt
    }, client);
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

const settleCompletedTradesForAll = async () => {
  const dueUsersResult = await database.query(
    `SELECT DISTINCT user_id AS "userId"
     FROM trades
     WHERE status = 'active'
       AND settles_at IS NOT NULL
       AND settles_at <= NOW()`
  );

  for (const row of dueUsersResult.rows) {
    await settleCompletedTradesForUser(row.userId);
  }
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
  automationId = null,
  executionMode = "manual"
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

    const settlesAt = new Date(Date.now() + 40 * 60 * 1000);

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
         is_trial_trade,
         automation_id,
         execution_mode
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        isTrialTrade,
        automationId,
        executionMode
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

const findTradesByUserId = async (userId) => {
  await settleCompletedTradesForUser(userId);

  const result = await database.query(
    `SELECT ${tradeFields}
     FROM trades
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

module.exports = {
  createTrade,
  settleCompletedTradesForUser,
  settleCompletedTradesForAll,
  findTradesByUserId
};
