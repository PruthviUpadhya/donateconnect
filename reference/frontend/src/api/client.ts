import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let inMemoryToken: string | null = null;
let logoutCallback: (() => void) | null = null;

export const setAuthTokenInMemory = (token: string | null) => {
  inMemoryToken = token;
};

export const registerLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// Response Interceptor: Catch 401 Unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && logoutCallback) {
      logoutCallback();
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
