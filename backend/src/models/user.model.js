const database = require("../config/database");

const userFields = `
  id,
  username,
  email,
  referral_code AS "referralCode",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const createUser = async ({ username, email, password, referralCode }) => {
  const result = await database.query(
    `INSERT INTO users (username, email, password, referral_code)
     VALUES ($1, $2, $3, $4)
     RETURNING ${userFields}`,
    [username, email, password, referralCode]
  );

  return result.rows[0];
};

const findAllUsers = async () => {
  const result = await database.query(
    `SELECT ${userFields}
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
};

const findUserById = async (id) => {
  const result = await database.query(
    `SELECT ${userFields}
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

const findUserByEmail = async (email) => {
  const result = await database.query(
    `SELECT ${userFields}
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
};

const findUserByReferralCode = async (referralCode) => {
  const result = await database.query(
    `SELECT ${userFields}
     FROM users
     WHERE referral_code = $1`,
    [referralCode]
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findAllUsers,
  findUserById,
  findUserByEmail,
  findUserByReferralCode
};
