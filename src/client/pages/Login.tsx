import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';
import LoadingIndicator from '../components/LoadingIndicator';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--background-color);
`;

const LoginCard = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 40px;
  max-width: 400px;
  width: 100%;
  text-align: center;

  @media (max-width: 480px) {
    max-width: 90%;
    padding: 20px;
  }
`;

const Logo = styled.h1`
  color: var(--primary-color);
  margin-bottom: 30px;
`;

const Description = styled.p`
  color: var(--text-color);
  margin-bottom: 30px;
  line-height: 1.6;
`;

const Button = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 100%;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: var(--error-color);
  margin-bottom: 20px;
  font-size: 14px;
`;

const Login: React.FC = () => {
  const { createSession, isLoading, error, resetError } = useSession();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    resetError();
    setLocalError(null);

    const session = await createSession();
    if (session) {
      navigate('/');
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>Hashi</Logo>
        <Description>
          Welcome to Hashi, a web interface for UCSF ChimeraX.
          Create a new session to start visualizing molecular structures.
        </Description>

        {(error || localError) && (
          <ErrorMessage>
            {error || localError}
          </ErrorMessage>
        )}

        {isLoading ? (
          <LoadingIndicator size="small" message="Creating session..." />
        ) : (
          <Button onClick={handleCreateSession} disabled={isLoading}>
            Create a new ChimeraX session
          </Button>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;