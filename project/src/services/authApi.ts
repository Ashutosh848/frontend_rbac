// src/services/authApi.ts
import axios from 'axios';

// Set base URL if needed
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Variable to track if we're currently refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Restore token on app load
const token = localStorage.getItem('access_token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add response interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        // No refresh token, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log('Attempting to refresh token...');
        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        console.log('Token refreshed successfully');
        processQueue(null, newAccessToken);

        // Retry the original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        processQueue(refreshError, null);
        
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Token validation function
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    // You can replace this with any protected endpoint
    // For now, using a common endpoint that should exist in most Django apps
    const response = await axios.get('/api/user/profile/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.status === 200;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

// Alternative token validation using the token verify endpoint
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.post('/api/token/verify/', {
      token: token
    });
    return response.status === 200;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

// Refresh token function
export const refreshAccessToken = async (refreshToken: string) => {
  const response = await axios.post('/api/token/refresh/', {
    refresh: refreshToken
  });
  
  const access = response.data.access;
  localStorage.setItem('access_token', access);
  axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  
  return response.data;
};

// Google Login
export const googleLogin = async (token: string) => {
  const response = await axios.post('/api/google-login/', { token });

  const access = response.data.access;
  const refresh = response.data.refresh;
  
  // Save both tokens and set header
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

  return response.data;
};

// Email & Password Login
export const loginWithEmail = async (email: string, password: string) => {
  const response = await axios.post('/api/token/', {
    email,
    password,
  });

  const access = response.data.access;
  const refresh = response.data.refresh;

  // Save both tokens and set header
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

  console.log('✅ Tokens received and stored');
  return response.data;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  return !!(token && refreshToken);
};

// Get current access token
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// Get current refresh token
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

// Logout function
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  delete axios.defaults.headers.common['Authorization'];
};