const database = require("../config/database");

const getOverview = async () => {
  const [
    usersResult,
    depositsResult,
    withdrawalsResult,
    recentUsersResult,
    depositVolumeResult
  ] = await Promise.all([
    database.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::INT AS today,
        COUNT(*) FILTER (WHERE is_admin = TRUE)::INT AS admins
      FROM users
    `),
    database.query(`
      SELECT
        COALESCE(SUM(price_amount) FILTER (WHERE credited_at IS NOT NULL), 0)::NUMERIC AS credited_total,
        COUNT(*) FILTER (WHERE status IN ('waiting', 'confirming', 'confirmed'))::INT AS pending,
        COUNT(*)::INT AS total
      FROM deposits
    `),
    database.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::NUMERIC AS approved_total,
        COUNT(*) FILTER (WHERE status = 'pending')::INT AS pending,
        COUNT(*)::INT AS total
      FROM withdrawals
    `),
    database.query(`
      SELECT id, username, email, balance, is_admin AS "isAdmin", created_at AS "createdAt"
      FROM users
      ORDER BY created_at DESC
      LIMIT 6
    `),
    database.query(`
      SELECT
        TO_CHAR(day, 'Dy') AS day,
        COALESCE(SUM(d.price_amount) FILTER (WHERE d.credited_at IS NOT NULL), 0)::NUMERIC AS value
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS days(day)
      LEFT JOIN deposits d
        ON DATE(d.created_at) = DATE(day)
      GROUP BY day
      ORDER BY day
    `)
  ]);

  const volumeRows = depositVolumeResult.rows;
  const highestVolume = Math.max(...volumeRows.map((row) => Number(row.value)), 1);

  return {
    users: usersResult.rows[0],
    deposits: depositsResult.rows[0],
    withdrawals: withdrawalsResult.rows[0],
    recentUsers: recentUsersResult.rows,
    depositVolume: volumeRows.map((row) => ({
      day: row.day,
      value: Number(row.value).toFixed(2),
      height: Math.max(8, Math.round((Number(row.value) / highestVolume) * 100))
    }))
  };
};

const getUsers = async () => {
  const result = await database.query(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.referral_code AS "referralCode",
      u.referred_by AS "referredBy",
      (SELECT COUNT(*) FROM teams t WHERE t.user_id = u.id)::INT AS "memberCount",
      u.balance,
      u.is_admin AS "isAdmin",
      u.email_verified AS "emailVerified",
      EXISTS (
        SELECT 1
        FROM deposits d
        WHERE d.user_id = u.id
          AND d.credited_at IS NOT NULL
      ) AS "isActive",
      u.created_at AS "createdAt"
    FROM users u
    ORDER BY created_at DESC
  `);

  return result.rows;
};

const getUserSummary = async () => {
  const result = await database.query(`
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM deposits d
          WHERE d.user_id = users.id
            AND d.credited_at IS NOT NULL
        )
      )::INT AS active,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM deposits d
          WHERE d.user_id = users.id
            AND d.credited_at IS NOT NULL
        )
      )::INT AS inactive,
      COUNT(*) FILTER (WHERE email_verified = TRUE)::INT AS verified
    FROM users
  `);

  return result.rows[0];
};

const createUser = async ({ id, username, email, password, referralCode, referredBy = null, balance = 0, isAdmin = false, emailVerified = false }) => {
  const result = await database.query(
    `INSERT INTO users (id, username, email, password, referral_code, referred_by, balance, is_admin, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, username, email, referral_code AS "referralCode", referred_by AS "referredBy", balance, is_admin AS "isAdmin",
       email_verified AS "emailVerified", created_at AS "createdAt"`,
    [id, username, email, password, referralCode, referredBy, balance, isAdmin, emailVerified]
  );

  return result.rows[0];
};

const updateUser = async ({ id, username, email, balance, isAdmin, emailVerified, password }) => {
  const result = await database.query(
    `UPDATE users
     SET username = COALESCE($2, username),
         email = COALESCE($3, email),
         balance = COALESCE($4, balance),
         is_admin = COALESCE($5, is_admin),
         email_verified = COALESCE($6, email_verified),
         password = COALESCE($7, password),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, email, referral_code AS "referralCode", balance, is_admin AS "isAdmin",
       email_verified AS "emailVerified", created_at AS "createdAt"`,
    [id, username, email, balance, isAdmin, emailVerified, password]
  );

  return result.rows[0] || null;
};

const deleteUser = async (id) => {
  const result = await database.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return result.rows[0] || null;
};

const getDeposits = async () => {
  const result = await database.query(`
    SELECT
      id,
      user_id AS "userId",
      username,
      price_amount AS "priceAmount",
      pay_amount AS "payAmount",
      actually_paid AS "actuallyPaid",
      pay_currency AS "payCurrency",
      pay_network AS "payNetwork",
      pay_id AS "paymentId",
      status,
      credited_at AS "creditedAt",
      created_at AS "createdAt"
    FROM deposits
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return result.rows;
};

const getWithdrawals = async () => {
  const result = await database.query(`
    SELECT
      id,
      user_id AS "userId",
      username,
      amount,
      fee_amount AS "feeAmount",
      asset,
      network,
      address,
      status,
      requested_at AS "requestedAt",
      processed_at AS "processedAt"
    FROM withdrawals
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return result.rows;
};

const getUserDetails = async (id) => {
  const [userResult, depositTotalsResult, withdrawalTotalsResult, depositsResult, withdrawalsResult] = await Promise.all([
    database.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.referral_code AS "referralCode",
         u.referred_by AS "referredBy",
         (SELECT COUNT(*) FROM teams t WHERE t.user_id = u.id)::INT AS "memberCount",
         u.balance,
         u.is_admin AS "isAdmin",
         u.email_verified AS "emailVerified",
         u.created_at AS "createdAt",
         u.updated_at AS "updatedAt",
         EXISTS (
           SELECT 1 FROM deposits d
           WHERE d.user_id = u.id
             AND d.credited_at IS NOT NULL
         ) AS "isActive"
       FROM users u
       WHERE u.id = $1`,
      [id]
    ),
    database.query(
      `SELECT
         COALESCE(SUM(price_amount) FILTER (WHERE credited_at IS NOT NULL), 0)::NUMERIC AS total,
         COUNT(*)::INT AS count
       FROM deposits
       WHERE user_id = $1`,
      [id]
    ),
    database.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::NUMERIC AS total,
         COUNT(*)::INT AS count
       FROM withdrawals
       WHERE user_id = $1`,
      [id]
    ),
    database.query(
      `SELECT
         id,
         price_amount AS "priceAmount",
         actually_paid AS "actuallyPaid",
         pay_currency AS "payCurrency",
         pay_network AS "payNetwork",
         status,
         credited_at AS "creditedAt",
         created_at AS "createdAt"
       FROM deposits
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    ),
    database.query(
      `SELECT
         id,
         amount,
         fee_amount AS "feeAmount",
         asset,
         network,
         address,
         status,
         requested_at AS "requestedAt",
         processed_at AS "processedAt"
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    )
  ]);

  const user = userResult.rows[0] || null;

  if (!user) {
    return null;
  }

  const activities = [
    ...depositsResult.rows.map((deposit) => ({
      id: `deposit-${deposit.id}`,
      type: "Deposit",
      title: `${deposit.payCurrency} ${deposit.payNetwork}`,
      amount: deposit.priceAmount,
      status: deposit.status,
      date: deposit.createdAt
    })),
    ...withdrawalsResult.rows.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      type: "Withdrawal",
      title: `${withdrawal.asset} ${withdrawal.network}`,
      amount: withdrawal.amount,
      status: withdrawal.status,
      date: withdrawal.requestedAt
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    user,
    totals: {
      balance: user.balance,
      deposits: depositTotalsResult.rows[0].total,
      depositCount: depositTotalsResult.rows[0].count,
      withdrawals: withdrawalTotalsResult.rows[0].total,
      withdrawalCount: withdrawalTotalsResult.rows[0].count
    },
    deposits: depositsResult.rows,
    withdrawals: withdrawalsResult.rows,
    activities
  };
};

module.exports = {
  getOverview,
  getUserSummary,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserDetails,
  getDeposits,
  getWithdrawals
};
