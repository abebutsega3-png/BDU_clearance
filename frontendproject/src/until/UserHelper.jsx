import axios from 'axios';

const userApiUrl = '/api/user';

export const getUserHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchUsers = async (filters, { signal } = {}) => {
  const response = await axios.get(userApiUrl, {
    params: filters,
    headers: getUserHeaders(),
    timeout: 10000,
    signal,
  });
  return response.data;
};
export const getUserIdentifier = (user) => user?._id || user?.id || user?.employeeId || user?.username;

export const fetchUser = async (identifier) => {
  const response = await axios.get(`${userApiUrl}/${encodeURIComponent(identifier)}`, {
    headers: getUserHeaders(),
  });
  return response.data.user;
};

export const createUser = async (userData) => {
  const response = await axios.post(userApiUrl, userData, {
    headers: getUserHeaders(),
  });
  return response.data;
};

export const resetUserPassword = async (userId, password, confirmPassword) => {
  const response = await axios.post(`${userApiUrl}/reset/${encodeURIComponent(userId)}`, {
    password,
    confirmPassword,
  }, {
    headers: getUserHeaders(),
  });
  return response.data;
};
