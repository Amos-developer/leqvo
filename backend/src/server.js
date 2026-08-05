const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { runTradeAutomationCycle } = require("./services/tradeAutomation.service");

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Leqvo API is running on port ${env.port}`);
    });

    runTradeAutomationCycle().catch((error) => {
      console.error("Initial trade automation cycle failed:", error.message || error);
    });

    setInterval(() => {
      runTradeAutomationCycle().catch((error) => {
        console.error("Trade automation cycle failed:", error.message || error);
      });
    }, 60 * 1000);
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
