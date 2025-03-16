import axios, { AxiosRequestConfig } from 'axios';

// Create an axios instance with default settings
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Get session ID from localStorage
    const sessionId = localStorage.getItem('sessionId');
    
    // If the path doesn't already include the session ID and a session ID exists
    if (sessionId && config.url && !config.url.includes('/sessions/') && !config.url.includes('/login')) {
      // Add the session ID to the URL
      config.url = config.url.replace(/^\//, ''); // Remove leading slash if present
      config.url = `/sessions/${sessionId}/${config.url}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle session timeout
    if (error.response && error.response.status === 401) {
      // Clear session data
      localStorage.removeItem('sessionId');
      
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export default api;