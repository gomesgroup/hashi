import { useContext } from 'react';
import { AuthContext, User } from '../contexts/AuthContext';

interface UseAuthReturnType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook to access authentication context
 * 
 * @returns Authentication state and methods
 */
export const useAuth = (): UseAuthReturnType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;