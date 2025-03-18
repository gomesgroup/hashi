import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Define interfaces outside of the class
interface RetryQueueItem {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  config: AxiosRequestConfig;
  retryCount: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private retryQueue: Map<string, RetryQueueItem> = new Map();
  private isRefreshing = false;
  private retryLimit = 3;

  constructor() {
    this.baseURL = '/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for adding auth token and session ID
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if it exists
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add session ID to URL if needed
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && config.url && !config.url.includes('/sessions/') && 
            !config.url.includes('/login') && !config.url.includes('/auth/')) {
          config.url = config.url.replace(/^\//, ''); // Remove leading slash if present
          config.url = `/sessions/${sessionId}/${config.url}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // Don't retry if we don't have a config or if retry count exceeds limit
        const retryCount = (originalRequest as any)._retryCount || 0;
        if (!originalRequest || retryCount >= this.retryLimit) {
          return Promise.reject(error);
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          // Don't try to refresh if we're already on a refresh request
          if (originalRequest.url === '/auth/refresh' || 
              this.isRefreshingToken(originalRequest)) {
            this.clearAuth();
            return Promise.reject(error);
          }

          // Queue the failed request for retry after token refresh
          const requestKey = this.getRequestKey(originalRequest);
          const retryPromise = new Promise((resolve, reject) => {
            this.retryQueue.set(requestKey, {
              resolve,
              reject,
              config: originalRequest,
              retryCount: retryCount + 1
            });
          });

          // Initiate token refresh if it's not already in progress
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            
            try {
              await this.refreshAuthToken();
              // Process the retry queue with the new token
              this.processRetryQueue();
            } catch (refreshError) {
              // If refresh fails, reject all queued requests
              this.rejectRetryQueue(refreshError);
              this.clearAuth();
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshing = false;
            }
          }

          return retryPromise;
        }
        
        // Handle session timeout and other errors
        if (error.response?.status === 403 || error.response?.status === 404) {
          // Handle specific permissions or not found errors
          // Leave this to be handled by components
        } else if (error.response?.status >= 500) {
          // Server errors - could add logging or metrics here
          console.error('Server error:', error.response?.data);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private isRefreshingToken(config: AxiosRequestConfig): boolean {
    return config.url?.includes('/auth/refresh') || false;
  }

  private getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method || 'GET'}-${config.url}-${JSON.stringify(config.params || {})}-${JSON.stringify(config.data || {})}`;
  }

  private async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await this.client.post('/auth/refresh', { refreshToken });
      
      if (response.data && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private processRetryQueue(): void {
    this.retryQueue.forEach((item, key) => {
      const { config, resolve, reject, retryCount } = item;
      
      // Add retry count to the request
      (config as any)._retryCount = retryCount;
      
      // Retry the request with the new token
      this.client(config)
        .then(response => {
          resolve(response);
          this.retryQueue.delete(key);
        })
        .catch(error => {
          reject(error);
          this.retryQueue.delete(key);
        });
    });
  }

  private rejectRetryQueue(error: any): void {
    this.retryQueue.forEach((item, key) => {
      item.reject(error);
      this.retryQueue.delete(key);
    });
  }

  private clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('sessionId');
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Generic request method
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for common HTTP methods
  public async get<T>(url: string, params?: any): Promise<T> {
    return this.request<T>({ method: 'GET', url, params });
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  public async delete<T>(url: string, params?: any): Promise<T> {
    return this.request<T>({ method: 'DELETE', url, params });
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  public setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;