require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || "leqvo",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    ssl: process.env.DB_SSL === "true"
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  },
  jwt: {
    secret: process.env.JWT_SECRET || "replace-this-secret-in-production",
    expiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 86400
  },
  nowpayments: {
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    publicKey: process.env.NOWPAYMENTS_PUBLIC_KEY,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
    ipnCallbackUrl: process.env.NOWPAYMENTS_IPN_CALLBACK_URL,
    apiUrl: process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1"
  }
};

module.exports = env;
