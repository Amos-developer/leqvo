const database = require("../config/database");

const baseFields = `
  id AS "userId",
  username,
  withdrawal_asset AS "activeAsset",
  withdrawal_network AS "activeNetwork",
  withdrawal_address AS "activeAddress",
  withdrawal_address_status AS "activeStatus",
  withdrawal_address_note AS "activeNote",
  withdrawal_address_reviewed_by AS "activeReviewedBy",
  withdrawal_address_reviewed_at AS "activeReviewedAt",
  withdrawal_address_submitted_at AS "activeSubmittedAt",
  pending_withdrawal_asset AS "pendingAsset",
  pending_withdrawal_network AS "pendingNetwork",
  pending_withdrawal_address AS "pendingAddress",
  pending_withdrawal_status AS "pendingStatus",
  pending_withdrawal_note AS "pendingNote",
  pending_withdrawal_reviewed_by AS "pendingReviewedBy",
  pending_withdrawal_reviewed_at AS "pendingReviewedAt",
  pending_withdrawal_submitted_at AS "pendingSubmittedAt",
  updated_at AS "updatedAt"
`;

const mapAddressRecord = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.userId,
    userId: row.userId,
    username: row.username,
    asset: row.pendingAddress ? row.pendingAsset : row.activeAsset,
    network: row.pendingAddress ? row.pendingNetwork : row.activeNetwork,
    address: row.pendingAddress || row.activeAddress,
    status: row.pendingAddress ? row.pendingStatus || "pending" : row.activeStatus || "approved",
    note: row.pendingAddress ? row.pendingNote || "" : row.activeNote || "",
    reviewedBy: row.pendingAddress ? row.pendingReviewedBy : row.activeReviewedBy,
    reviewedAt: row.pendingAddress ? row.pendingReviewedAt : row.activeReviewedAt,
    submittedAt: row.pendingAddress ? row.pendingSubmittedAt : row.activeSubmittedAt,
    activeAddress: row.activeAddress
      ? {
          asset: row.activeAsset,
          network: row.activeNetwork,
          address: row.activeAddress,
          status: row.activeStatus || "approved",
          note: row.activeNote || "",
          reviewedBy: row.activeReviewedBy,
          reviewedAt: row.activeReviewedAt,
          submittedAt: row.activeSubmittedAt
        }
      : null,
    pendingAddress: row.pendingAddress
      ? {
          asset: row.pendingAsset,
          network: row.pendingNetwork,
          address: row.pendingAddress,
          status: row.pendingStatus || "pending",
          note: row.pendingNote || "",
          reviewedBy: row.pendingReviewedBy,
          reviewedAt: row.pendingReviewedAt,
          submittedAt: row.pendingSubmittedAt
        }
      : null
  };
};

const getLatestByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${baseFields}
     FROM users
     WHERE id = $1
       AND (withdrawal_address IS NOT NULL OR pending_withdrawal_address IS NOT NULL)`,
    [userId]
  );

  return mapAddressRecord(result.rows[0]);
};

const createAddress = async ({ user, asset, network, address }) => {
  const result = await database.query(
    `UPDATE users
     SET pending_withdrawal_asset = $2,
         pending_withdrawal_network = $3,
         pending_withdrawal_address = $4,
         pending_withdrawal_status = 'pending',
         pending_withdrawal_note = NULL,
         pending_withdrawal_reviewed_by = NULL,
         pending_withdrawal_reviewed_at = NULL,
         pending_withdrawal_submitted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${baseFields}`,
    [user.id, asset, network, address]
  );

  return mapAddressRecord(result.rows[0]);
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
    `SELECT ${baseFields}
     FROM users
     WHERE pending_withdrawal_address IS NOT NULL
     ORDER BY
       CASE WHEN pending_withdrawal_status = 'pending' THEN 0 ELSE 1 END,
       pending_withdrawal_submitted_at DESC`
  );

  return result.rows.map(mapAddressRecord);
};

const updateStatus = async ({ id, status, note, reviewedBy }) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT ${baseFields}
       FROM users
       WHERE id = $1
         AND pending_withdrawal_address IS NOT NULL
       FOR UPDATE`,
      [id]
    );
    const current = currentResult.rows[0];

    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    let updateQuery = "";
    let params = [];

    if (status === "approved") {
      updateQuery = `
        UPDATE users
        SET withdrawal_asset = pending_withdrawal_asset,
            withdrawal_network = pending_withdrawal_network,
            withdrawal_address = pending_withdrawal_address,
            withdrawal_address_status = 'approved',
            withdrawal_address_note = $2,
            withdrawal_address_reviewed_by = $3,
            withdrawal_address_reviewed_at = NOW(),
            withdrawal_address_submitted_at = pending_withdrawal_submitted_at,
            pending_withdrawal_asset = NULL,
            pending_withdrawal_network = NULL,
            pending_withdrawal_address = NULL,
            pending_withdrawal_status = 'not_set',
            pending_withdrawal_note = NULL,
            pending_withdrawal_reviewed_by = NULL,
            pending_withdrawal_reviewed_at = NULL,
            pending_withdrawal_submitted_at = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${baseFields}`;
      params = [id, note || "", reviewedBy];
    } else {
      updateQuery = `
        UPDATE users
        SET pending_withdrawal_status = 'rejected',
            pending_withdrawal_note = $2,
            pending_withdrawal_reviewed_by = $3,
            pending_withdrawal_reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${baseFields}`;
      params = [id, note || "", reviewedBy];
    }

    const result = await client.query(updateQuery, params);

    await client.query("COMMIT");
    return mapAddressRecord(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
