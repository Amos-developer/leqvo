const QRCode = require("qrcode");
const env = require("../config/env");
const database = require("../config/database");
const userModel = require("./user.model");

const MINIMUM_CREDIT_AMOUNT = 30;
const CREDITABLE_STATUS = "finished";

const currencyMap = {
  usdt: {
    trc20: "usdttrc20",
    bep20: "usdtbsc"
  },
  usdc: {
    bep20: "usdcbsc"
  },
  bnb: {
    bep20: "bnbbsc"
  }
};

const getPayCurrency = (asset, network) => {
  return currencyMap[asset.toLowerCase()]?.[network.toLowerCase()] || null;
};

const depositFields = `
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
`;

const findActiveDeposit = async ({ userId, payCurrency, payNetwork }) => {
  const result = await database.query(
    `SELECT ${depositFields}
     FROM deposits
     WHERE user_id = $1
       AND pay_currency = $2
       AND pay_network = $3
       AND status IN ('waiting', 'confirming', 'confirmed')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, payCurrency, payNetwork]
  );

  return result.rows[0] || null;
};

const saveDeposit = async ({
  userId,
  username,
  priceAmount,
  payAmount,
  actuallyPaid = 0,
  actuallyPaidAtFiat = 0,
  payCurrency,
  payNetwork,
  paymentId,
  payAddress,
  qrCode,
  status
}) => {
  const result = await database.query(
    `INSERT INTO deposits (
       user_id,
       username,
       price_amount,
       pay_amount,
       actually_paid,
       actually_paid_at_fiat,
       pay_currency,
       pay_network,
       pay_id,
       pay_address,
       qr_code,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${depositFields}`,
    [
      userId,
      username,
      priceAmount,
      payAmount,
      actuallyPaid,
      actuallyPaidAtFiat,
      payCurrency,
      payNetwork,
      paymentId,
      payAddress,
      qrCode,
      status
    ]
  );

  return result.rows[0];
};

const updateDepositPayment = async ({
  depositId,
  priceAmount,
  payAmount,
  paymentId,
  payAddress,
  qrCode,
  status
}) => {
  const result = await database.query(
    `UPDATE deposits
     SET price_amount = $1,
         pay_amount = $2,
         pay_id = $3,
         pay_address = $4,
         qr_code = $5,
         status = $6,
         actually_paid = 0,
         actually_paid_at_fiat = 0,
         credited_at = NULL,
         updated_at = NOW()
     WHERE id = $7
     RETURNING ${depositFields}`,
    [priceAmount, payAmount, paymentId, payAddress, qrCode, status, depositId]
  );

  return result.rows[0];
};

const requestNowPaymentsPayment = async ({ user, asset, network, payCurrency, amount }) => {
  const response = await fetch(`${env.nowpayments.apiUrl}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.nowpayments.apiKey
    },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      pay_currency: payCurrency,
      order_id: `${user.id}-${Date.now()}`,
      order_description: `Leqvo ${asset.toUpperCase()} deposit via ${network.toUpperCase()}`,
      ipn_callback_url: env.nowpayments.ipnCallbackUrl
    })
  });

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result.message || "Failed to create NOWPayments payment");
    error.statusCode = response.status;
    throw error;
  }

  const qrCode = await QRCode.toDataURL(result.pay_address, {
    margin: 1,
    width: 280,
    color: {
      dark: "#f94fa7",
      light: "#ffffff"
    }
  });

  return {
    priceAmount: amount,
    payAmount: result.pay_amount || amount,
    paymentId: String(result.payment_id),
    payAddress: result.pay_address,
    qrCode,
    status: result.payment_status || "waiting"
  };
};

const createNowPaymentsPayment = async ({ user, asset, network, amount }) => {
  const payCurrency = getPayCurrency(asset, network);
  const payNetwork = network.toLowerCase();

  if (!payCurrency) {
    const error = new Error("Unsupported asset or network");
    error.statusCode = 400;
    throw error;
  }

  if (!env.nowpayments.apiKey) {
    const error = new Error("NOWPayments API key is not configured");
    error.statusCode = 500;
    throw error;
  }

  const activeDeposit = await findActiveDeposit({
    userId: user.id,
    payCurrency,
    payNetwork
  });

  if (activeDeposit) {
    if (Number(activeDeposit.priceAmount) !== Number(amount)) {
      const payment = await requestNowPaymentsPayment({
        user,
        asset,
        network,
        payCurrency,
        amount
      });
      const updatedDeposit = await updateDepositPayment({
        depositId: activeDeposit.id,
        ...payment
      });

      return {
        ...updatedDeposit,
        asset: asset.toUpperCase(),
        network: network.toUpperCase(),
        reused: true,
        amountUpdated: true
      };
    }

    return {
      ...activeDeposit,
      asset: asset.toUpperCase(),
      network: network.toUpperCase(),
      reused: true
    };
  }

  const payment = await requestNowPaymentsPayment({
    user,
    asset,
    network,
    payCurrency,
    amount
  });

  const deposit = await saveDeposit({
    userId: user.id,
    username: user.username,
    priceAmount: payment.priceAmount,
    payAmount: payment.payAmount,
    payCurrency,
    payNetwork,
    paymentId: payment.paymentId,
    payAddress: payment.payAddress,
    qrCode: payment.qrCode,
    status: payment.status
  });

  return {
    ...deposit,
    asset: asset.toUpperCase(),
    network: network.toUpperCase(),
    reused: false
  };
};

const getNowPaymentsStatus = async (paymentId) => {
  const response = await fetch(`${env.nowpayments.apiUrl}/payment/${paymentId}`, {
    headers: {
      "x-api-key": env.nowpayments.apiKey
    }
  });

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result.message || "Failed to fetch NOWPayments status");
    error.statusCode = response.status;
    throw error;
  }

  return result;
};

const findDepositByPaymentId = async (paymentId, client = database) => {
  const result = await client.query(
    `SELECT ${depositFields}
     FROM deposits
     WHERE pay_id = $1`,
    [String(paymentId)]
  );

  return result.rows[0] || null;
};

const shouldCreditDeposit = (deposit) => {
  const status = deposit.status;
  const expectedUsd = Number(deposit.priceAmount || 0);
  const expectedCrypto = Number(deposit.payAmount || 0);
  const actuallyPaid = Number(deposit.actuallyPaid || 0);
  const paidAtFiat = Number(deposit.actuallyPaidAtFiat || 0);

  return (
    status === CREDITABLE_STATUS &&
    !deposit.creditedAt &&
    expectedUsd >= MINIMUM_CREDIT_AMOUNT &&
    actuallyPaid >= expectedCrypto &&
    (paidAtFiat === 0 || paidAtFiat >= MINIMUM_CREDIT_AMOUNT)
  );
};

const applyPaymentUpdate = async ({
  paymentId,
  status,
  actuallyPaid = 0,
  actuallyPaidAtFiat = 0,
  payAmount
}) => {
  const client = await database.pool.connect();

  try {
    await client.query("BEGIN");

    const existingDeposit = await findDepositByPaymentId(paymentId, client);

    if (!existingDeposit) {
      const error = new Error("Deposit not found");
      error.statusCode = 404;
      throw error;
    }

    const updatedResult = await client.query(
      `UPDATE deposits
       SET status = $1,
           actually_paid = $2,
           actually_paid_at_fiat = $3,
           pay_amount = COALESCE($4, pay_amount),
           updated_at = NOW()
       WHERE pay_id = $5
       RETURNING ${depositFields}`,
      [
        status || existingDeposit.status,
        Number(actuallyPaid || 0),
        Number(actuallyPaidAtFiat || 0),
        payAmount === undefined ? null : Number(payAmount),
        String(paymentId)
      ]
    );

    let deposit = updatedResult.rows[0];

    if (shouldCreditDeposit(deposit)) {
      await userModel.incrementUserBalance(deposit.userId, deposit.priceAmount, client);

      const creditedResult = await client.query(
        `UPDATE deposits
         SET credited_at = NOW(),
             updated_at = NOW()
         WHERE pay_id = $1
         RETURNING ${depositFields}`,
        [String(paymentId)]
      );

      deposit = creditedResult.rows[0];
    }

    await client.query("COMMIT");
    return deposit;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const refreshDepositStatus = async (paymentId) => {
  const status = await getNowPaymentsStatus(paymentId);

  return applyPaymentUpdate({
    paymentId: status.payment_id,
    status: status.payment_status,
    actuallyPaid: status.actually_paid,
    actuallyPaidAtFiat: status.actually_paid_at_fiat,
    payAmount: status.pay_amount
  });
};

module.exports = {
  getPayCurrency,
  findActiveDeposit,
  findDepositByPaymentId,
  createNowPaymentsPayment,
  applyPaymentUpdate,
  refreshDepositStatus
};
