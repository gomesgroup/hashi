import React, { createContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextProps extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create auth context with default values
export const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshToken: async () => false,
  clearError: () => {},
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });

  // Check for existing token and validate it on startup
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthState(prevState => ({ ...prevState, isLoading: false }));
        return;
      }

      try {
        // Validate token with the server
        apiClient.setAuthToken(token);
        const response = await apiClient.get<{user: User}>('/auth/me');
        
        setAuthState({
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: 'Authentication expired. Please log in again.',
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.post<{ 
        user: User; 
        token: string; 
        refreshToken: string;
      }>('/auth/login', { email, password });
      
      // Store tokens
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);
      
      // Update auth state
      apiClient.setAuthToken(response.token);
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.response?.data?.message || 'Login failed. Please check your credentials and try again.',
      }));
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
    
    try {
      await apiClient.post('/auth/register', { name, email, password });
      
      // Successfully registered but not automatically logged in
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Registration failed:', error);
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.response?.data?.message || 'Registration failed. Please try again.',
      }));
      throw error;
    }
  };

  const logout = (): void => {
    // Clear tokens and auth state
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('sessionId');
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });
    
    // Try to notify the server about logout
    apiClient.post('/auth/logout').catch(error => {
      console.error('Logout notification failed:', error);
      // Non-blocking error, user is still logged out locally
    });
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post<{ token: string; refreshToken: string; }>('/auth/refresh', { refreshToken });
      
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
        }
        
        apiClient.setAuthToken(response.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const clearError = (): void => {
    setAuthState(prevState => ({ ...prevState, error: null }));
  };

  const contextValue: AuthContextProps = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;