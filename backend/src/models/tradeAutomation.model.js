const database = require("../config/database");

const automationFields = `
  ta.id,
  ta.user_id AS "userId",
  ta.username,
  ta.pair,
  ta.slot_key AS "slotKey",
  ta.allocation_percent AS "allocationPercent",
  ta.is_enabled AS "isEnabled",
  ta.last_signal_code AS "lastSignalCode",
  ta.last_run_at AS "lastRunAt",
  ta.last_result AS "lastResult",
  ta.last_message AS "lastMessage",
  ta.created_at AS "createdAt",
  ta.updated_at AS "updatedAt",
  latest_trade.id AS "latestTradeId",
  latest_trade.signal_code AS "latestTradeSignalCode",
  latest_trade.status AS "latestTradeStatus",
  latest_trade.opened_at AS "latestTradeOpenedAt",
  latest_trade.closed_at AS "latestTradeClosedAt",
  latest_trade.execution_mode AS "latestTradeExecutionMode"
`;

const automationFromClause = `
  FROM trade_automations ta
  LEFT JOIN LATERAL (
    SELECT
      t.id,
      t.signal_code,
      t.status,
      t.opened_at,
      t.closed_at,
      t.execution_mode
    FROM trades t
    WHERE t.automation_id = ta.id
    ORDER BY t.created_at DESC
    LIMIT 1
  ) latest_trade ON TRUE
`;

const getByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${automationFields}
     ${automationFromClause}
     WHERE ta.user_id = $1
     ORDER BY ta.created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getById = async ({ id, userId }) => {
  const result = await database.query(
    `SELECT ${automationFields}
     ${automationFromClause}
     WHERE ta.id = $1
       AND ta.user_id = $2
     LIMIT 1`,
    [id, userId]
  );

  return result.rows[0] || null;
};

const createAutomation = async ({ userId, username, pair, slotKey, allocationPercent }) => {
  const result = await database.query(
    `INSERT INTO trade_automations (
       user_id,
       username,
       pair,
       slot_key,
       allocation_percent
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, username, pair, slotKey, allocationPercent]
  );

  return getById({
    id: result.rows[0]?.id,
    userId
  });
};

const updateAutomation = async ({ id, userId, isEnabled }) => {
  const result = await database.query(
    `UPDATE trade_automations
     SET is_enabled = COALESCE($3::BOOLEAN, is_enabled),
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND COALESCE(last_result, 'idle') <> 'executed'
     RETURNING id`,
    [id, userId, isEnabled]
  );

  if (!result.rows[0]?.id) {
    return null;
  }

  return getById({
    id: result.rows[0].id,
    userId
  });
};

const deleteAutomation = async ({ id, userId }) => {
  const result = await database.query(
    `DELETE FROM trade_automations
     WHERE id = $1
       AND user_id = $2
       AND COALESCE(last_result, 'idle') <> 'executed'
     RETURNING id`,
    [id, userId]
  );

  return result.rows[0] || null;
};

const getEnabledAutomationsBySignal = async ({ slotKey }) => {
  const result = await database.query(
    `SELECT ${automationFields}
     ${automationFromClause}
     WHERE ta.is_enabled = TRUE
       AND ta.slot_key = $1
     ORDER BY ta.created_at ASC`,
    [slotKey]
  );

  return result.rows;
};

const markAutomationRun = async ({ id, signalCode, result, message }) => {
  await database.query(
    `UPDATE trade_automations
     SET last_signal_code = $2,
         last_run_at = NOW(),
         last_result = $3::VARCHAR,
         last_message = $4,
         is_enabled = CASE WHEN $3::VARCHAR = 'executed' THEN FALSE ELSE is_enabled END,
         updated_at = NOW()
     WHERE id = $1`,
    [id, signalCode, result, message]
  );
};

module.exports = {
  getById,
  getByUserId,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  getEnabledAutomationsBySignal,
  markAutomationRun
};
