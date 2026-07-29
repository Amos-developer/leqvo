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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const result = await response.json().catch(() => ({
    message: "Request failed"
  }));

  if (!response.ok) {
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

export const getUserById = (id) => {
  return request(`/users/${id}`);
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

export const getPopularCrypto = () => {
  return request("/markets/popular");
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

export const getAdminWithdrawals = () => {
  return request("/admin/withdrawals", {
    headers: getAdminHeaders()
  });
};
