import axios from 'axios';

const clearanceApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/clearance';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: clearanceApiUrl,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const handleNetworkError = (error) => {
  if (error.code === 'ECONNABORTED') {
    throw new Error('Request timeout. The server took too long to respond. Please check your internet connection or try again.');
  }
  if (error.message === 'Network Error' || !error.response) {
    throw new Error(`Network error: Unable to connect to the server at ${clearanceApiUrl}. Please check if the server is running and your internet connection is active.`);
  }
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw error;
};

export const fetchClearances = async () => {
  try {
    const response = await axiosInstance.get('/');
    return response.data.clearances || [];
  } catch (error) {
    handleNetworkError(error);
  }
};

export const createClearance = async (clearanceData) => {
  try {
    const response = await axiosInstance.post('/add', clearanceData);
    return response.data;
  } catch (error) {
    handleNetworkError(error);
  }
};

export const updateClearance = async (clearanceId, clearanceData) => {
  try {
    const response = await axiosInstance.put(`/${clearanceId}`, clearanceData);
    return response.data;
  } catch (error) {
    handleNetworkError(error);
  }
};

export const deleteClearance = async (clearanceId) => {
  try {
    const response = await axiosInstance.delete(`/${clearanceId}`);
    return response.data;
  } catch (error) {
    handleNetworkError(error);
  }
};
