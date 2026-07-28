const database = require("../config/database");

const getDatabaseStatus = async () => {
  const result = await database.query("SELECT NOW() AS current_time");

  return {
    status: "ok",
    currentTime: result.rows[0].current_time
  };
};

module.exports = {
  getDatabaseStatus
};
