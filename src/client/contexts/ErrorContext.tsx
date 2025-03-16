import React, { createContext, useState, useContext } from 'react';
import { ErrorContextProps, Error, ProviderProps } from '../types';

// Create context with default values
const ErrorContext = createContext<ErrorContextProps>({
  error: null,
  setError: () => {},
  addError: () => {},
  clearError: () => {},
});

// Hook for accessing the error context
export const useError = () => useContext(ErrorContext);

// Provider component that wraps the app
export const ErrorProvider: React.FC<ProviderProps> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);

  const addError = (message: string) => {
    setError({
      message,
      timestamp: Date.now(),
    });
  };

  const clearError = () => {
    setError(null);
  };

  // Create the context value object
  const value: ErrorContextProps = {
    error,
    setError,
    addError,
    clearError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};