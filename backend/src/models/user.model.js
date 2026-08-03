const database = require("../config/database");

const userFields = `
  id,
  username,
  email,
  referral_code AS "referralCode",
  referred_by AS "referredBy",
  balance,
  trading_balance AS "tradingBalance",
  trading_started_at AS "tradingStartedAt",
  trading_unlocks_at AS "tradingUnlocksAt",
  (withdrawal_pin IS NOT NULL) AS "hasWithdrawalPin",
  withdrawal_pin_set_at AS "withdrawalPinSetAt",
  withdrawal_asset AS "withdrawalAsset",
  withdrawal_network AS "withdrawalNetwork",
  withdrawal_address AS "withdrawalAddress",
  withdrawal_address_status AS "withdrawalAddressStatus",
  withdrawal_address_note AS "withdrawalAddressNote",
  withdrawal_address_reviewed_by AS "withdrawalAddressReviewedBy",
  withdrawal_address_reviewed_at AS "withdrawalAddressReviewedAt",
  withdrawal_address_submitted_at AS "withdrawalAddressSubmittedAt",
  is_admin AS "isAdmin",
  email_verified AS "emailVerified",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const createUser = async ({ id, username, email, password, referralCode, referredBy = null }) => {
  const result = await database.query(
    `INSERT INTO users (id, username, email, password, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${userFields}`,
    [id, username, email, password, referralCode, referredBy]
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

const findUserByUsername = async (username) => {
  const result = await database.query(
    `SELECT ${userFields}
     FROM users
     WHERE username = $1`,
    [username]
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

const findUserWithWithdrawalPinById = async (id) => {
  const result = await database.query(
    `SELECT
       ${userFields},
       withdrawal_pin AS "withdrawalPin"
     FROM users
     WHERE id = $1`,
    [id]
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

const updateUserProfile = async ({ id, username }) => {
  const result = await database.query(
    `UPDATE users
     SET username = COALESCE($2, username),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${userFields}`,
    [id, username]
  );

  return result.rows[0] || null;
};

const createPasswordChangeCode = async ({ userId, code, expiresAt }) => {
  await database.query(
    `UPDATE password_change_codes
     SET used_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId]
  );

  const result = await database.query(
    `INSERT INTO password_change_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING
       id,
       user_id AS "userId",
       code,
       expires_at AS "expiresAt",
       created_at AS "createdAt"`,
    [userId, code, expiresAt]
  );

  return result.rows[0];
};

const findValidPasswordChangeCode = async ({ userId, code }) => {
  const result = await database.query(
    `SELECT
       id,
       user_id AS "userId",
       code,
       expires_at AS "expiresAt",
       used_at AS "usedAt",
       created_at AS "createdAt"
     FROM password_change_codes
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

const changePassword = async ({ userId, password, codeId }) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET password = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [password, userId]
    );

    await client.query(
      `UPDATE password_change_codes
       SET used_at = NOW()
       WHERE id = $1`,
      [codeId]
    );

    await client.query("COMMIT");

    return findUserById(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const createWithdrawalPinCode = async ({ userId, code, expiresAt }) => {
  await database.query(
    `UPDATE withdrawal_pin_codes
     SET used_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId]
  );

  const result = await database.query(
    `INSERT INTO withdrawal_pin_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING
       id,
       user_id AS "userId",
       code,
       expires_at AS "expiresAt",
       created_at AS "createdAt"`,
    [userId, code, expiresAt]
  );

  return result.rows[0];
};

const findValidWithdrawalPinCode = async ({ userId, code }) => {
  const result = await database.query(
    `SELECT
       id,
       user_id AS "userId",
       code,
       expires_at AS "expiresAt",
       used_at AS "usedAt",
       created_at AS "createdAt"
     FROM withdrawal_pin_codes
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

const setWithdrawalPin = async ({ userId, withdrawalPin, codeId }) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `UPDATE users
       SET withdrawal_pin = $1,
           withdrawal_pin_set_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING ${userFields}`,
      [withdrawalPin, userId]
    );

    await client.query(
      `UPDATE withdrawal_pin_codes
       SET used_at = NOW()
       WHERE id = $1`,
      [codeId]
    );

    await client.query("COMMIT");

    return userResult.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const changeWithdrawalPin = async ({ userId, withdrawalPin, codeId }) => {
  return setWithdrawalPin({ userId, withdrawalPin, codeId });
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

const transferBalance = async ({ userId, fromAccount, toAccount, amount }) => {
  const client = await database.pool.connect();
  const transferAmount = Number(amount);

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT id, username, balance, trading_balance, trading_started_at, trading_unlocks_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const mainBalance = Number(user.balance || 0);
    const tradingBalance = Number(user.trading_balance || 0);
    const sourceBalance = fromAccount === "main" ? mainBalance : tradingBalance;
    const eligibility = await getTradingEligibility(userId, client);
    const isEarlyTradingExit =
      fromAccount === "trading" && toAccount === "main" && eligibility.hasTradingEntry && !eligibility.canMoveTradingToMain;
    const feeAmount = isEarlyTradingExit ? transferAmount * 0.3 : 0;
    const netAmount = transferAmount - feeAmount;

    if (fromAccount === "main" && toAccount === "trading" && transferAmount < 30) {
      const error = new Error("Minimum transfer from main to trading is 30 USDT");
      error.statusCode = 400;
      throw error;
    }

    if (sourceBalance < transferAmount) {
      const error = new Error(`Insufficient ${fromAccount} account balance`);
      error.statusCode = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE users
       SET balance = balance + $1,
           trading_balance = trading_balance + $2,
           trading_started_at = CASE
             WHEN $4 = 'main' AND $5 = 'trading' AND trading_started_at IS NULL THEN NOW()
             ELSE trading_started_at
           END,
           trading_unlocks_at = CASE
             WHEN $4 = 'main' AND $5 = 'trading' AND trading_unlocks_at IS NULL THEN NOW() + INTERVAL '10 days'
             ELSE trading_unlocks_at
           END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING ${userFields}`,
      [
        fromAccount === "main" ? -transferAmount : netAmount,
        fromAccount === "trading" ? -transferAmount : transferAmount,
        userId,
        fromAccount,
        toAccount
      ]
    );

    const transferResult = await client.query(
      `INSERT INTO account_transfers (user_id, username, from_account, to_account, amount, fee_amount, net_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         user_id AS "userId",
         username,
         from_account AS "fromAccount",
         to_account AS "toAccount",
         amount,
         fee_amount AS "feeAmount",
         net_amount AS "netAmount",
         created_at AS "createdAt"`,
      [user.id, user.username, fromAccount, toAccount, transferAmount, feeAmount, netAmount]
    );

    await client.query("COMMIT");

    return {
      user: updateResult.rows[0],
      transfer: transferResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findTransfersByUserId = async (userId) => {
  const result = await database.query(
    `SELECT
       id,
       user_id AS "userId",
       username,
       from_account AS "fromAccount",
       to_account AS "toAccount",
       amount,
       fee_amount AS "feeAmount",
       net_amount AS "netAmount",
       created_at AS "createdAt"
     FROM account_transfers
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 30`,
    [userId]
  );

  return result.rows;
};

const getTradingEligibility = async (userId, client = database) => {
  const userResult = await client.query(
    `SELECT trading_started_at, trading_unlocks_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];

  if (user?.trading_started_at && user?.trading_unlocks_at) {
    const remainingResult = await client.query(
      `SELECT COUNT(DISTINCT opened_at::DATE)::INT AS completed_days
       FROM trades
       WHERE user_id = $1
         AND opened_at >= $2`,
      [userId, user.trading_started_at]
    );
    const completedTradingDays = Number(remainingResult.rows[0]?.completed_days || 0);
    const remainingTradingDays = Math.max(10 - completedTradingDays, 0);
    const isUnlocked = remainingTradingDays <= 0;

    return {
      hasTradingEntry: true,
      canMoveTradingToMain: isUnlocked,
      canWithdraw: isUnlocked,
      tradingEntryAt: user.trading_started_at,
      unlocksAt: user.trading_unlocks_at,
      remainingDays: remainingTradingDays,
      completedTradingDays,
      remainingTradingDays,
      requiredTradingDays: 10
    };
  }

  const result = await client.query(
    `SELECT
       created_at,
       GREATEST(
         0,
         CEIL(EXTRACT(EPOCH FROM (created_at + INTERVAL '10 days' - NOW())) / 86400)
       )::INT AS remaining_days
     FROM account_transfers
     WHERE user_id = $1
       AND from_account = 'main'
       AND to_account = 'trading'
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  );
  const firstTradingEntry = result.rows[0];

  if (!firstTradingEntry) {
    return {
      hasTradingEntry: false,
      canMoveTradingToMain: false,
      canWithdraw: false,
      tradingEntryAt: null,
      unlocksAt: null,
      remainingDays: 10
    };
  }

  const remainingDays = Number(firstTradingEntry.remaining_days || 0);
  const completedTradingDays = 0;
  const remainingTradingDays = 10;
  const tradingEntryAt = new Date(firstTradingEntry.created_at);
  const unlocksAt = new Date(tradingEntryAt.getTime() + 10 * 24 * 60 * 60 * 1000);
  const isUnlocked = false;

  return {
    hasTradingEntry: true,
    canMoveTradingToMain: isUnlocked,
    canWithdraw: isUnlocked,
    tradingEntryAt: firstTradingEntry.created_at,
    unlocksAt,
    remainingDays: remainingTradingDays,
    completedTradingDays,
    remainingTradingDays,
    requiredTradingDays: 10
  };
};

module.exports = {
  createUser,
  findAllUsers,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  findUserWithPasswordByEmail,
  findUserWithWithdrawalPinById,
  findUserByReferralCode,
  updateUserProfile,
  createPasswordChangeCode,
  findValidPasswordChangeCode,
  changePassword,
  createWithdrawalPinCode,
  findValidWithdrawalPinCode,
  setWithdrawalPin,
  changeWithdrawalPin,
  incrementUserBalance,
  transferBalance,
  findTransfersByUserId,
  getTradingEligibility
};
