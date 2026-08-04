const getDefaultApiUrl = () => {
  const hostname = window.location.hostname || "localhost";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (window.location.protocol === "https:" && !isLocalHost) {
    return "/api";
  }

  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiUrl();

const request = async (path, options = {}) => {
  const token = localStorage.getItem("leqvoToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const result = await response.json().catch(() => ({
    message: "Request failed"
  }));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("leqvoUser");
      localStorage.removeItem("leqvoToken");
    }

    throw new Error(result.message || "Request failed");
  }

  return result;
};

export const registerUser = (payload) => {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const loginUser = (payload) => {
  return request("/users/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const requestForgotPassword = (payload) => {
  return request("/users/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getUserById = (id) => {
  return request(`/users/${id}`);
};

export const updateMyProfile = (payload) => {
  return request("/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const requestPasswordChangeCode = () => {
  return request("/users/me/password/code", {
    method: "POST"
  });
};

export const changeMyPassword = (payload) => {
  return request("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const requestWithdrawalPinCode = () => {
  return request("/users/me/withdrawal-pin/code", {
    method: "POST"
  });
};

export const setWithdrawalPin = (payload) => {
  return request("/users/me/withdrawal-pin", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const changeWithdrawalPin = (payload) => {
  return request("/users/me/withdrawal-pin/change", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const getMyWithdrawalAddress = () => {
  return request("/withdrawal-addresses");
};

export const submitWithdrawalAddress = (payload) => {
  return request("/withdrawal-addresses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const requestWithdrawalAddressCode = () => {
  return request("/withdrawal-addresses/code", {
    method: "POST"
  });
};

export const getAdminWithdrawalAddresses = () => {
  return request("/withdrawal-addresses/admin");
};

export const updateAdminWithdrawalAddressStatus = (id, payload) => {
  return request(`/withdrawal-addresses/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const unlockAdminWithdrawalAddress = (id, payload = {}) => {
  return request(`/withdrawal-addresses/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "unlock", ...payload })
  });
};

export const getMyKyc = () => {
  return request("/kyc");
};

export const submitKyc = (payload) => {
  return request("/kyc", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getAdminKyc = () => {
  return request("/kyc/admin");
};

export const updateAdminKycStatus = (id, payload) => {
  return request(`/kyc/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const deleteAdminKyc = (id) => {
  return request(`/kyc/admin/${id}`, {
    method: "DELETE"
  });
};

export const transferAccountBalance = (payload) => {
  return request("/users/transfer", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getAccountTransfers = () => {
  return request("/users/transfers");
};

export const createDeposit = (payload) => {
  return request("/deposits/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const refreshDepositStatus = (paymentId) => {
  return request(`/deposits/${paymentId}/refresh`, {
    method: "POST"
  });
};

export const getMyDeposits = () => {
  return request("/deposits/my");
};

export const getMyWithdrawals = () => {
  return request("/withdrawals/my");
};

export const createTrade = (payload) => {
  return request("/trades", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getMyTrades = () => {
  return request("/trades/my");
};

export const previewTradeSignal = (signalCode) => {
  return request(`/copy-signals/preview/${encodeURIComponent(signalCode)}`);
};

export const getAdminCopySignals = () => {
  return request("/copy-signals");
};

export const createAdminCopySignal = (payload) => {
  return request("/copy-signals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getPopularCrypto = () => {
  return request("/markets/popular");
};

export const getTeamOverview = (userId) => {
  return request(`/teams/${userId}`);
};

export const getLuckyBoxStatus = () => {
  return request("/lucky-box");
};

export const openLuckyBox = (boxNumber) => {
  return request("/lucky-box/open", {
    method: "POST",
    body: JSON.stringify({ boxNumber })
  });
};

export const getDailySpinStatus = () => {
  return request("/daily-spin");
};

export const runDailySpin = () => {
  return request("/daily-spin/spin", {
    method: "POST"
  });
};

export const getMyRewards = () => {
  return request("/rewards");
};

const getAdminHeaders = () => {
  const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");

  return {
    "x-user-id": user.id || ""
  };
};

export const getAdminOverview = () => {
  return request("/admin/overview", {
    headers: getAdminHeaders()
  });
};

export const getAdminTransactions = () => {
  return request("/admin/transactions", {
    headers: getAdminHeaders()
  });
};

export const getAdminUsers = () => {
  return request("/admin/users", {
    headers: getAdminHeaders()
  });
};

export const getAdminUserDetails = (id) => {
  return request(`/admin/users/${id}`, {
    headers: getAdminHeaders()
  });
};

export const getAdminBalanceAudit = (id) => {
  return request(`/admin/users/${id}/balance-audit`, {
    headers: getAdminHeaders()
  });
};

export const createAdminUser = (payload) => {
  return request("/admin/users", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
};

export const updateAdminUser = (id, payload) => {
  return request(`/admin/users/${id}`, {
    method: "PATCH",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
};

export const deleteAdminUser = (id) => {
  return request(`/admin/users/${id}`, {
    method: "DELETE",
    headers: getAdminHeaders()
  });
};

export const getAdminDeposits = () => {
  return request("/admin/deposits", {
    headers: getAdminHeaders()
  });
};

export const refreshAdminDeposit = (id) => {
  return request(`/admin/deposits/${id}/refresh`, {
    method: "POST",
    headers: getAdminHeaders()
  });
};

export const creditAdminDeposit = (id) => {
  return request(`/admin/deposits/${id}/credit`, {
    method: "POST",
    headers: getAdminHeaders()
  });
};

export const updateAdminDeposit = (id, payload) => {
  return request(`/admin/deposits/${id}`, {
    method: "PATCH",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
};

export const deleteAdminDeposit = (id) => {
  return request(`/admin/deposits/${id}`, {
    method: "DELETE",
    headers: getAdminHeaders()
  });
};

export const getAdminWithdrawals = () => {
  return request("/admin/withdrawals", {
    headers: getAdminHeaders()
  });
};

export const getAdminTrades = () => {
  return request("/admin/trades", {
    headers: getAdminHeaders()
  });
};

export const getAdminLeaders = () => {
  return request("/admin/leaders", {
    headers: getAdminHeaders()
  });
};

export const grantAdminLeadershipReward = (userId, payload) => {
  return request(`/admin/leaders/${userId}/rewards`, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
};
