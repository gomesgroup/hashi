import React from 'react';
import styled from 'styled-components';

interface LoadingIndicatorProps {
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

const Container = styled.div<{ fullScreen?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${props => props.fullScreen ? `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 9999;
  ` : ''}
  padding: 20px;
`;

const Spinner = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--primary-color);
  animation: spin 1s linear infinite;
  
  ${props => {
    switch (props.size) {
      case 'small':
        return 'width: 20px; height: 20px;';
      case 'large':
        return 'width: 60px; height: 60px;';
      case 'medium':
      default:
        return 'width: 40px; height: 40px;';
    }
  }}
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Message = styled.p`
  margin-top: 10px;
  color: var(--text-color);
  font-size: 16px;
  text-align: center;
`;

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  fullScreen = false, 
  size = 'medium',
  message
}) => {
  return (
    <Container fullScreen={fullScreen}>
      <Spinner size={size} />
      {message && <Message>{message}</Message>}
    </Container>
  );
};

export default LoadingIndicator;