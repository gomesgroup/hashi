import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useError } from '../contexts/ErrorContext';

const ErrorContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: var(--error-color);
  color: white;
  padding: 15px 20px;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  z-index: 1000;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  margin-left: 10px;
  padding: 0 5px;
`;

const ErrorNotification: React.FC = () => {
  const { error, clearError } = useError();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
      
      // Auto dismiss after 5 seconds
      const timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(clearError, 300); // Wait for animation before clearing
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [error, clearError]);

  if (!error || !visible) {
    return null;
  }

  const handleClose = () => {
    setVisible(false);
    setTimeout(clearError, 300); // Wait for animation before clearing
  };

  return (
    <ErrorContainer style={{ animation: visible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in' }}>
      <div>{error.message}</div>
      <CloseButton onClick={handleClose}>&times;</CloseButton>
    </ErrorContainer>
  );
};

export default ErrorNotification;