const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Leqvo API is running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start Leqvo API:", error.message || error);
    console.error("Database target:", {
      host: env.database.host,
      port: env.database.port,
      name: env.database.name,
      user: env.database.user,
      ssl: env.database.ssl
    });
    process.exit(1);
  }
};

startServer();
