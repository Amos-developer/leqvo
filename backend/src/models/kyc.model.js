const database = require("../config/database");

const kycFields = `
  id,
  user_id AS "userId",
  username,
  email,
  id_front AS "idFront",
  id_back AS "idBack",
  selfie,
  status,
  note,
  reviewed_by AS "reviewedBy",
  reviewed_at AS "reviewedAt",
  submitted_at AS "submittedAt",
  updated_at AS "updatedAt"
`;

const getLatestByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${kycFields}
     FROM kyc_submissions
     WHERE user_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const createSubmission = async ({ user, idFront, idBack, selfie }) => {
  const result = await database.query(
    `INSERT INTO kyc_submissions (user_id, username, email, id_front, id_back, selfie)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${kycFields}`,
    [user.id, user.username, user.email, idFront, idBack, selfie]
  );

  return result.rows[0];
};

const getAll = async () => {
  const result = await database.query(
    `SELECT ${kycFields}
     FROM kyc_submissions
     ORDER BY
       CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
       submitted_at DESC`
  );

  return result.rows;
};

const updateStatus = async ({ id, status, note, reviewedBy }) => {
  const result = await database.query(
    `UPDATE kyc_submissions
     SET status = $2,
         note = $3,
         reviewed_by = $4,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${kycFields}`,
    [id, status, note || "", reviewedBy]
  );

  return result.rows[0] || null;
};

const deleteSubmission = async (id) => {
  const result = await database.query(
    `DELETE FROM kyc_submissions
     WHERE id = $1
     RETURNING ${kycFields}`,
    [id]
  );

  return result.rows[0] || null;
};

module.exports = {
  getLatestByUserId,
  createSubmission,
  getAll,
  updateStatus,
  deleteSubmission
};
