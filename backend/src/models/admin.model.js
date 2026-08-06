const database = require("../config/database");
const leadershipModel = require("./leadership.model");
const userModel = require("./user.model");
const depositModel = require("./deposit.model");

const getOverview = async () => {
  const [
    usersResult,
    depositsResult,
    withdrawalsResult,
    tradesResult,
    recentUsersResult,
    depositVolumeResult,
    recentTransactionsResult
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
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'active')::INT AS active,
        COUNT(*) FILTER (WHERE status IN ('win', 'loose'))::INT AS finished,
        COUNT(DISTINCT user_id)::INT AS users
      FROM trades
    `),
    database.query(`
      SELECT
        id,
        username,
        email,
        balance,
        is_admin AS "isAdmin",
        created_at AS "createdAt",
        EXISTS (
          SELECT 1
          FROM deposits d
          WHERE d.user_id = users.id
            AND d.credited_at IS NOT NULL
        ) AS "isActive"
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
    `),
    database.query(`
      ${buildTransactionsQuery(10)}
    `)
  ]);

  const volumeRows = depositVolumeResult.rows;
  const highestVolume = Math.max(...volumeRows.map((row) => Number(row.value)), 1);

  return {
    users: usersResult.rows[0],
    deposits: depositsResult.rows[0],
    withdrawals: withdrawalsResult.rows[0],
    trades: tradesResult.rows[0],
    recentUsers: recentUsersResult.rows,
    recentTransactions: recentTransactionsResult.rows,
    depositVolume: volumeRows.map((row) => ({
      day: row.day,
      value: Number(row.value).toFixed(2),
      height: Math.max(8, Math.round((Number(row.value) / highestVolume) * 100))
    }))
  };
};

const buildTransactionsQuery = (limit) => `
  SELECT *
  FROM (
    SELECT
      d.id,
      d.user_id AS "userId",
      d.username,
      'Deposit'::TEXT AS type,
      d.price_amount::NUMERIC AS amount,
      CASE
        WHEN d.credited_at IS NOT NULL THEN 'Completed'
        ELSE INITCAP(d.status)
      END AS status,
      COALESCE(d.credited_at, d.updated_at, d.created_at) AS "activityTime",
      UPPER(d.pay_currency) AS asset,
      UPPER(d.pay_network) AS network,
      d.pay_id AS reference,
      NULL::TEXT AS pair,
      CONCAT(UPPER(d.pay_currency), ' / ', UPPER(d.pay_network)) AS detail
    FROM deposits d

    UNION ALL

    SELECT
      w.id,
      w.user_id AS "userId",
      w.username,
      'Withdrawal'::TEXT AS type,
      w.amount::NUMERIC AS amount,
      INITCAP(w.status) AS status,
      COALESCE(w.processed_at, w.requested_at, w.created_at) AS "activityTime",
      UPPER(w.asset) AS asset,
      UPPER(w.network) AS network,
      NULL::TEXT AS reference,
      NULL::TEXT AS pair,
      CONCAT(UPPER(w.asset), ' / ', UPPER(w.network)) AS detail
    FROM withdrawals w

    UNION ALL

    SELECT
      t.id,
      t.user_id AS "userId",
      t.username,
      'Trade'::TEXT AS type,
      t.amount::NUMERIC AS amount,
      CASE
        WHEN t.status = 'win' THEN 'Completed'
        WHEN t.status = 'loose' THEN 'Failed'
        ELSE INITCAP(t.status)
      END AS status,
      COALESCE(t.closed_at, t.opened_at, t.created_at) AS "activityTime",
      'USDT'::TEXT AS asset,
      NULL::TEXT AS network,
      t.signal_code AS reference,
      t.pair,
      REPLACE(t.pair, 'USDT', '/USDT') AS detail
    FROM trades t
  ) transactions
  ORDER BY "activityTime" DESC
  ${limit ? `LIMIT ${Number(limit)}` : ""}
`;

const getTransactions = async () => {
  const result = await database.query(buildTransactionsQuery());
  return result.rows;
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
      actually_paid_at_fiat AS "actuallyPaidAtFiat",
      pay_currency AS "payCurrency",
      pay_network AS "payNetwork",
      pay_id AS "paymentId",
      pay_address AS "payAddress",
      qr_code AS "qrCode",
      status,
      credited_at AS "creditedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM deposits
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return result.rows;
};

const creditDeposit = async (id) => {
  return depositModel.creditDepositManually(id);
};

const updateDeposit = async (id, payload) => {
  return depositModel.updateDepositByAdmin(id, payload);
};

const deleteDeposit = async (id) => {
  return depositModel.deleteDepositByAdmin(id);
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

const getTrades = async () => {
  const [tradesResult, summaryResult] = await Promise.all([
    database.query(`
      SELECT
        t.id,
        t.user_id AS "userId",
        t.username,
        u.email,
        t.pair,
        t.symbol,
        t.signal_code AS "signalCode",
        t.allocation_percent AS "allocationPercent",
        t.amount,
        t.entry_price AS "entryPrice",
        t.exit_price AS "exitPrice",
        t.pnl_amount AS "pnlAmount",
        t.pnl_percent AS "pnlPercent",
        t.status,
        t.opened_at AS "openedAt",
        t.closed_at AS "closedAt",
        t.created_at AS "createdAt"
      FROM trades t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.opened_at DESC
      LIMIT 200
    `),
    database.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'active')::INT AS active,
        COUNT(*) FILTER (WHERE status IN ('win', 'loose'))::INT AS completed,
        COUNT(DISTINCT user_id)::INT AS users
      FROM trades
    `)
  ]);

  return {
    trades: tradesResult.rows,
    summary: summaryResult.rows[0]
  };
};

const getTradeAutomations = async () => {
  const [automationsResult, summaryResult] = await Promise.all([
    database.query(`
      SELECT
        ta.id,
        ta.user_id AS "userId",
        ta.username,
        u.email,
        ta.slot_key AS "slotKey",
        ta.allocation_percent AS "allocationPercent",
        ta.is_enabled AS "isEnabled",
        ta.last_signal_code AS "lastSignalCode",
        ta.last_run_at AS "lastRunAt",
        ta.last_result AS "lastResult",
        ta.last_message AS "lastMessage",
        ta.created_at AS "createdAt",
        ta.updated_at AS "updatedAt"
      FROM trade_automations ta
      JOIN users u ON u.id = ta.user_id
      ORDER BY ta.created_at DESC
    `),
    database.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE is_enabled = TRUE)::INT AS active,
        COUNT(*) FILTER (WHERE is_enabled = FALSE)::INT AS paused,
        COUNT(DISTINCT user_id)::INT AS users
      FROM trade_automations
    `)
  ]);

  return {
    automations: automationsResult.rows,
    summary: summaryResult.rows[0]
  };
};

const refreshLeadershipRecords = async () => {
  const usersResult = await database.query(`
    SELECT id, username
    FROM users
    WHERE is_admin = FALSE
  `);

  const records = [];

  for (const user of usersResult.rows) {
    const membersResult = await database.query(
      `SELECT
         t.level,
         EXISTS (
           SELECT 1 FROM deposits d
           WHERE d.user_id = t.member_id
             AND d.credited_at IS NOT NULL
         ) AS "isActive",
         COALESCE((
           SELECT SUM(price_amount)
           FROM deposits d
           WHERE d.user_id = t.member_id
             AND d.credited_at IS NOT NULL
         ), 0)::NUMERIC AS "totalDeposit"
       FROM teams t
       WHERE t.user_id = $1`,
      [user.id]
    );
    const levelOneMembers = membersResult.rows.filter((member) => Number(member.level) === 1);
    const levelTwoThreeMembers = membersResult.rows.filter((member) => [2, 3].includes(Number(member.level)));
    const activeLevelOneMembers = levelOneMembers.filter((member) => member.isActive).length;
    const levelOneDeposit = levelOneMembers.reduce((total, member) => total + Number(member.totalDeposit || 0), 0);
    const levelTwoThreeDeposit = levelTwoThreeMembers.reduce((total, member) => total + Number(member.totalDeposit || 0), 0);

    records.push(await leadershipModel.upsertLeadershipRecord({
      userId: user.id,
      username: user.username,
      activeLevelOneMembers,
      levelOneDeposit,
      levelTwoThreeDeposit
    }));
  }

  return records;
};

const getLeaders = async () => {
  await refreshLeadershipRecords();

  const [leadersResult, rewardsResult] = await Promise.all([
    database.query(`
      SELECT
        l.id,
        l.user_id AS "userId",
        l.username,
        u.email,
        u.balance,
        l.rank_level AS "rankLevel",
        l.rank_name AS "rankName",
        l.active_level_one_members AS "activeLevelOneMembers",
        l.level_one_deposit AS "levelOneDeposit",
        l.level_two_three_deposit AS "levelTwoThreeDeposit",
        l.one_time_reward AS "oneTimeReward",
        l.weekly_salary AS "weeklySalary",
        l.is_qualified AS "isQualified",
        l.next_rank_name AS "nextRankName",
        l.members_needed AS "membersNeeded",
        l.level_one_deposit_needed AS "levelOneDepositNeeded",
        l.level_two_three_deposit_needed AS "levelTwoThreeDepositNeeded",
        l.last_calculated_at AS "lastCalculatedAt",
        COALESCE((
          SELECT SUM(amount)
          FROM leadership_rewards lr
          WHERE lr.user_id = l.user_id
        ), 0)::NUMERIC AS "totalGranted"
      FROM leadership l
      JOIN users u ON u.id = l.user_id
      ORDER BY l.rank_level DESC, l.active_level_one_members DESC, l.level_one_deposit DESC
    `),
    database.query(`
      SELECT
        id,
        user_id AS "userId",
        username,
        reward_type AS "rewardType",
        amount,
        note,
        granted_by AS "grantedBy",
        granted_at AS "grantedAt"
      FROM leadership_rewards
      ORDER BY granted_at DESC
      LIMIT 40
    `)
  ]);

  const summary = {
    total: leadersResult.rows.length,
    qualified: leadersResult.rows.filter((leader) => leader.isQualified).length,
    totalGranted: leadersResult.rows.reduce((total, leader) => total + Number(leader.totalGranted || 0), 0),
    topRank: leadersResult.rows[0]?.rankName || "No rank"
  };

  return {
    leaders: leadersResult.rows,
    rewards: rewardsResult.rows,
    summary
  };
};

const grantLeadershipReward = async ({ userId, rewardType, amount, note, grantedBy }) => {
  const user = await userModel.findUserById(userId);

  if (!user) {
    return null;
  }

  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");
    const leadershipResult = await client.query(
      `SELECT id
       FROM leadership
       WHERE user_id = $1`,
      [userId]
    );
    const updatedUser = await userModel.incrementUserBalance(userId, amount, client);
    const rewardResult = await client.query(
      `INSERT INTO leadership_rewards (user_id, username, leadership_id, reward_type, amount, note, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         user_id AS "userId",
         username,
         reward_type AS "rewardType",
         amount,
         note,
         granted_by AS "grantedBy",
         granted_at AS "grantedAt"`,
      [userId, user.username, leadershipResult.rows[0]?.id || null, rewardType, amount, note || "", grantedBy]
    );

    await client.query("COMMIT");

    return {
      reward: rewardResult.rows[0],
      user: updatedUser
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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

const getBalanceAudit = async (userId) => {
  const [
    userResult,
    totalsResult,
    depositsResult,
    withdrawalsResult,
    tradesResult,
    transfersResult,
    teamRewardsResult,
    rewardsResult
  ] = await Promise.all([
    database.query(
      `SELECT
         id,
         username,
         email,
         balance,
         trading_balance AS "tradingBalance",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM users
       WHERE id = $1`,
      [userId]
    ),
    database.query(
      `SELECT
         COALESCE((SELECT SUM(price_amount) FROM deposits WHERE user_id = $1 AND credited_at IS NOT NULL), 0)::NUMERIC AS "totalDeposit",
         COALESCE((SELECT SUM(amount) FROM withdrawals WHERE user_id = $1 AND status = 'approved'), 0)::NUMERIC AS "totalWithdrawal",
         COALESCE((SELECT SUM(amount) FROM trades WHERE user_id = $1), 0)::NUMERIC AS "totalTradeAmount",
         COALESCE((SELECT SUM(pnl_amount) FROM trades WHERE user_id = $1), 0)::NUMERIC AS "totalTradeProfit",
         (
           COALESCE((SELECT SUM(amount) FROM leadership_rewards WHERE user_id = $1), 0) +
           COALESCE((
             SELECT SUM(amount)
             FROM rewards
             WHERE user_id = $1
               AND source IN ('referral_first_deposit_bonus', 'trade_commission')
           ), 0)
         )::NUMERIC AS "teamEarnings",
         COALESCE((SELECT COUNT(*) FROM trades WHERE user_id = $1), 0)::INT AS "tradeCount",
         COALESCE((SELECT COUNT(*) FROM trades WHERE user_id = $1 AND status = 'active'), 0)::INT AS "activeTradeCount",
         COALESCE((SELECT COUNT(*) FROM withdrawals WHERE user_id = $1), 0)::INT AS "withdrawalCount",
         COALESCE((SELECT COUNT(*) FROM deposits WHERE user_id = $1), 0)::INT AS "depositCount"
      `,
      [userId]
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
       LIMIT 100`,
      [userId]
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
         processed_at AS "processedAt",
         created_at AS "createdAt"
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY requested_at DESC
       LIMIT 100`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         pair,
         signal_code AS "signalCode",
         allocation_percent AS "allocationPercent",
         amount,
         entry_price AS "entryPrice",
         exit_price AS "exitPrice",
         pnl_amount AS "pnlAmount",
         pnl_percent AS "pnlPercent",
         status,
         opened_at AS "openedAt",
         closed_at AS "closedAt"
       FROM trades
       WHERE user_id = $1
       ORDER BY opened_at DESC
       LIMIT 100`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         from_account AS "fromAccount",
         to_account AS "toAccount",
         amount,
         fee_amount AS "feeAmount",
         net_amount AS "netAmount",
         created_at AS "createdAt"
       FROM account_transfers
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         reward_type AS "rewardType",
         amount,
         note,
         granted_at AS "grantedAt"
       FROM leadership_rewards
       WHERE user_id = $1
       ORDER BY granted_at DESC
       LIMIT 100`,
      [userId]
    ),
    database.query(
      `SELECT
         id,
         source,
         title,
         amount,
         status,
         awarded_at AS "awardedAt"
       FROM rewards
       WHERE user_id = $1
       ORDER BY awarded_at DESC
       LIMIT 100`,
      [userId]
    )
  ]);

  const user = userResult.rows[0] || null;

  if (!user) {
    return null;
  }

  const activities = [
    ...depositsResult.rows.map((item) => ({
      id: `deposit-${item.id}`,
      category: "finance",
      type: "Deposit",
      title: `${item.payCurrency} ${item.payNetwork}`,
      amount: item.priceAmount,
      status: item.status,
      beforeBalance: null,
      afterBalance: item.creditedAt ? "Credited to main balance" : null,
      date: item.creditedAt || item.createdAt
    })),
    ...withdrawalsResult.rows.map((item) => ({
      id: `withdrawal-${item.id}`,
      category: "finance",
      type: "Withdrawal",
      title: `${item.asset} ${item.network}`,
      amount: item.amount,
      status: item.status,
      beforeBalance: null,
      afterBalance: item.status === "approved" ? "Deducted from main balance" : null,
      date: item.processedAt || item.requestedAt
    })),
    ...tradesResult.rows.map((item) => ({
      id: `trade-${item.id}`,
      category: "trades",
      type: "Trade",
      title: `${item.pair} · ${item.signalCode}`,
      amount: item.amount,
      status: item.status,
      profit: item.pnlAmount,
      beforeBalance: null,
      afterBalance: null,
      date: item.closedAt || item.openedAt
    })),
    ...transfersResult.rows.map((item) => ({
      id: `transfer-${item.id}`,
      category: "activity",
      type: "Transfer",
      title: `${item.fromAccount} to ${item.toAccount}`,
      amount: item.amount,
      status: Number(item.feeAmount || 0) > 0 ? `fee ${item.feeAmount}` : "completed",
      beforeBalance: null,
      afterBalance: `Net ${item.netAmount}`,
      date: item.createdAt
    })),
    ...teamRewardsResult.rows.map((item) => ({
      id: `team-${item.id}`,
      category: "team",
      type: "Team Reward",
      title: item.rewardType,
      amount: item.amount,
      status: "credited",
      beforeBalance: null,
      afterBalance: "Added to main balance",
      date: item.grantedAt
    })),
    ...rewardsResult.rows.map((item) => ({
      id: `reward-${item.id}`,
      category: "activity",
      type: "Reward",
      title: item.title,
      amount: item.amount,
      status: item.status,
      beforeBalance: null,
      afterBalance: "Added to main balance",
      date: item.awardedAt
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    user,
    totals: totalsResult.rows[0],
    deposits: depositsResult.rows,
    withdrawals: withdrawalsResult.rows,
    trades: tradesResult.rows,
    transfers: transfersResult.rows,
    teamRewards: teamRewardsResult.rows,
    rewards: rewardsResult.rows,
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
  getBalanceAudit,
  getDeposits,
  creditDeposit,
  updateDeposit,
  deleteDeposit,
  getWithdrawals,
  getTrades,
  getTradeAutomations,
  getTransactions,
  getLeaders,
  grantLeadershipReward
};
