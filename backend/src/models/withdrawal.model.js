const database = require("../config/database");

const withdrawalFields = `
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
  processed_at AS "processedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const findWithdrawalsByUserId = async (userId) => {
  const result = await database.query(
    `SELECT ${withdrawalFields}
     FROM withdrawals
     WHERE user_id = $1
     ORDER BY requested_at DESC, created_at DESC`,
    [userId]
  );

  return result.rows;
};

module.exports = {
  findWithdrawalsByUserId
};
