const database = require("../config/database");

const addressFields = `
  id AS "id",
  id AS "userId",
  username,
  withdrawal_asset AS "asset",
  withdrawal_network AS "network",
  withdrawal_address AS "address",
  withdrawal_address_status AS "status",
  withdrawal_address_note AS "note",
  withdrawal_address_reviewed_by AS "reviewedBy",
  withdrawal_address_reviewed_at AS "reviewedAt",
  withdrawal_address_submitted_at AS "submittedAt",
  updated_at AS "updatedAt"
`;

const getLatestByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${addressFields}
     FROM users
     WHERE id = $1
       AND withdrawal_address IS NOT NULL`,
    [userId]
  );

  return result.rows[0] || null;
};

const createAddress = async ({ user, asset, network, address }) => {
  const result = await database.query(
    `UPDATE users
     SET withdrawal_asset = $2,
         withdrawal_network = $3,
         withdrawal_address = $4,
         withdrawal_address_status = 'pending',
         withdrawal_address_note = NULL,
         withdrawal_address_reviewed_by = NULL,
         withdrawal_address_reviewed_at = NULL,
         withdrawal_address_submitted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${addressFields}`,
    [user.id, asset, network, address]
  );

  return result.rows[0];
};

const createAddressCode = async ({ userId, code, expiresAt }) => {
  await database.query(
    `UPDATE withdrawal_address_codes
     SET used_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId]
  );

  const result = await database.query(
    `INSERT INTO withdrawal_address_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id AS "userId", code, expires_at AS "expiresAt", created_at AS "createdAt"`,
    [userId, code, expiresAt]
  );

  return result.rows[0];
};

const findValidAddressCode = async ({ userId, code }) => {
  const result = await database.query(
    `SELECT id
     FROM withdrawal_address_codes
     WHERE user_id = $1
       AND code = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, code]
  );

  return result.rows[0] || null;
};

const markAddressCodeUsed = async (id) => {
  await database.query(
    `UPDATE withdrawal_address_codes
     SET used_at = NOW()
     WHERE id = $1`,
    [id]
  );
};

const getAll = async () => {
  const result = await database.query(
    `SELECT ${addressFields}
     FROM users
     WHERE withdrawal_address IS NOT NULL
     ORDER BY
       CASE WHEN withdrawal_address_status = 'pending' THEN 0 ELSE 1 END,
       withdrawal_address_submitted_at DESC`
  );

  return result.rows;
};

const updateStatus = async ({ id, status, note, reviewedBy }) => {
  const result = await database.query(
    `UPDATE users
     SET withdrawal_address_status = $2,
         withdrawal_address_note = $3,
         withdrawal_address_reviewed_by = $4,
         withdrawal_address_reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND withdrawal_address IS NOT NULL
     RETURNING ${addressFields}`,
    [id, status, note || "", reviewedBy]
  );

  return result.rows[0] || null;
};

module.exports = {
  getLatestByUserId,
  createAddress,
  createAddressCode,
  findValidAddressCode,
  markAddressCodeUsed,
  getAll,
  updateStatus
};
