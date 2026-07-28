const getDefaultApiUrl = () => {
  const hostname = window.location.hostname || "localhost";

  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiUrl();

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const result = await response.json();

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
