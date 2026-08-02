const database = require("../config/database");

const addressFields = `
  id,
  user_id AS "userId",
  username,
  asset,
  network,
  address,
  status,
  note,
  reviewed_by AS "reviewedBy",
  reviewed_at AS "reviewedAt",
  submitted_at AS "submittedAt",
  updated_at AS "updatedAt"
`;

const getLatestByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${addressFields}
     FROM withdrawal_addresses
     WHERE user_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const createAddress = async ({ user, asset, network, address }) => {
  const result = await database.query(
    `INSERT INTO withdrawal_addresses (user_id, username, asset, network, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${addressFields}`,
    [user.id, user.username, asset, network, address]
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
     FROM withdrawal_addresses
     ORDER BY
       CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
       submitted_at DESC`
  );

  return result.rows;
};

const updateStatus = async ({ id, status, note, reviewedBy }) => {
  const result = await database.query(
    `UPDATE withdrawal_addresses
     SET status = $2,
         note = $3,
         reviewed_by = $4,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
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
