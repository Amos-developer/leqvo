const database = require("../config/database");

const userFields = `
  id,
  username,
  email,
  referral_code AS "referralCode",
  balance,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const createUser = async ({ id, username, email, password, referralCode }) => {
  const result = await database.query(
    `INSERT INTO users (id, username, email, password, referral_code)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${userFields}`,
    [id, username, email, password, referralCode]
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

const findUserWithPasswordByEmail = async (email) => {
  const result = await database.query(
    `SELECT
       ${userFields},
       password
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

const incrementUserBalance = async (id, amount, client = database) => {
  const result = await client.query(
    `UPDATE users
     SET balance = balance + $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING ${userFields}`,
    [amount, id]
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findAllUsers,
  findUserById,
  findUserByEmail,
  findUserWithPasswordByEmail,
  findUserByReferralCode,
  incrementUserBalance
};
