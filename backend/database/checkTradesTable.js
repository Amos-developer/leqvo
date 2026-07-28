require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "leqvo",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

const checkTradesTable = async () => {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'trades'
    ORDER BY ordinal_position;
  `);

  console.table(result.rows);
};

checkTradesTable()
  .catch((error) => {
    console.error("Failed to check trades table:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
