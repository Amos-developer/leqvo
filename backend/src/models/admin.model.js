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
      id,
      username,
      email,
      referral_code AS "referralCode",
      balance,
      is_admin AS "isAdmin",
      created_at AS "createdAt"
    FROM users
    ORDER BY created_at DESC
  `);

  return result.rows;
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

module.exports = {
  getOverview,
  getUsers,
  getDeposits,
  getWithdrawals
};
