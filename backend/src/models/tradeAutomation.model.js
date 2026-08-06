const database = require("../config/database");

const automationFields = `
  id,
  user_id AS "userId",
  username,
  pair,
  slot_key AS "slotKey",
  allocation_percent AS "allocationPercent",
  is_enabled AS "isEnabled",
  last_signal_code AS "lastSignalCode",
  last_run_at AS "lastRunAt",
  last_result AS "lastResult",
  last_message AS "lastMessage",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const getByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${automationFields}
     FROM trade_automations
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getById = async ({ id, userId }) => {
  const result = await database.query(
    `SELECT ${automationFields}
     FROM trade_automations
     WHERE id = $1
       AND user_id = $2
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
     RETURNING ${automationFields}`,
    [userId, username, pair, slotKey, allocationPercent]
  );

  return result.rows[0];
};

const updateAutomation = async ({ id, userId, isEnabled }) => {
  const result = await database.query(
    `UPDATE trade_automations
     SET is_enabled = COALESCE($3, is_enabled),
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND COALESCE(last_result, 'idle') <> 'executed'
     RETURNING ${automationFields}`,
    [id, userId, isEnabled]
  );

  return result.rows[0] || null;
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
     FROM trade_automations
     WHERE is_enabled = TRUE
       AND slot_key = $1
     ORDER BY created_at ASC`,
    [slotKey]
  );

  return result.rows;
};

const markAutomationRun = async ({ id, signalCode, result, message }) => {
  await database.query(
    `UPDATE trade_automations
     SET last_signal_code = $2,
         last_run_at = NOW(),
         last_result = $3,
         last_message = $4,
         is_enabled = CASE WHEN $3 = 'executed' THEN FALSE ELSE is_enabled END,
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
