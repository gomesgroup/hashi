import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../services/sessionService';
import { Session, SessionContextProps, SessionStatus, ProviderProps } from '../types';
import { useError } from './ErrorContext';

// Create context with default values
const SessionContext = createContext<SessionContextProps>({
  session: null,
  isLoading: false,
  error: null,
  createSession: async () => null,
  getSession: async () => null,
  refreshSession: async () => false,
  closeSession: async () => false,
  resetError: () => {},
});

// Hook for accessing the session context
export const useSession = () => useContext(SessionContext);

// Provider component that wraps the app
export const SessionProvider: React.FC<ProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { addError } = useError();
  const navigate = useNavigate();

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        setIsLoading(true);
        try {
          const sessionData = await sessionService.getSession(savedSessionId);
          if (sessionData.status === SessionStatus.ACTIVE) {
            setSession(sessionData);
          } else {
            // Session is expired or inactive
            localStorage.removeItem('sessionId');
            navigate('/login');
          }
        } catch (err) {
          console.error('Failed to fetch existing session:', err);
          localStorage.removeItem('sessionId');
          navigate('/login');
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkExistingSession();
  }, [navigate]);

  // Set up session refresh interval
  useEffect(() => {
    if (!session) return;
    
    // Refresh session every 5 minutes to keep it active
    const interval = setInterval(async () => {
      try {
        const success = await sessionService.refreshSession(session.id);
        if (!success) {
          addError('Failed to refresh session. Your session may expire soon.');
        }
      } catch (err) {
        console.error('Session refresh failed:', err);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session, addError]);

  const createSession = async (): Promise<Session | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newSession = await sessionService.createSession();
      setSession(newSession);
      localStorage.setItem('sessionId', newSession.id);
      return newSession;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create session';
      setError(errorMsg);
      addError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getSession = async (sessionId: string): Promise<Session | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sessionData = await sessionService.getSession(sessionId);
      setSession(sessionData);
      return sessionData;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to get session';
      setError(errorMsg);
      addError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async (sessionId: string): Promise<boolean> => {
    try {
      return await sessionService.refreshSession(sessionId);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to refresh session';
      setError(errorMsg);
      addError(errorMsg);
      return false;
    }
  };

  const closeSession = async (sessionId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await sessionService.closeSession(sessionId);
      if (success) {
        setSession(null);
        localStorage.removeItem('sessionId');
        navigate('/login');
      }
      return success;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to close session';
      setError(errorMsg);
      addError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  // Create the context value object
  const value: SessionContextProps = {
    session,
    isLoading,
    error,
    createSession,
    getSession,
    refreshSession,
    closeSession,
    resetError,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};