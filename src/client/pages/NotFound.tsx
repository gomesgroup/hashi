import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 0 20px;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  color: var(--primary-color);
  margin: 0;
`;

const ErrorMessage = styled.h2`
  font-size: 2rem;
  color: var(--text-color);
  margin: 10px 0 30px;
`;

const Description = styled.p`
  color: var(--text-color);
  max-width: 600px;
  margin-bottom: 30px;
  line-height: 1.6;
`;

const HomeButton = styled(Link)`
  background-color: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border-radius: var(--border-radius);
  text-decoration: none;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
    text-decoration: none;
  }
`;

const NotFound: React.FC = () => {
  return (
    <Container>
      <ErrorCode>404</ErrorCode>
      <ErrorMessage>Page Not Found</ErrorMessage>
      <Description>
        The page you are looking for doesn't exist or has been moved.
        Please check the URL or navigate back to the dashboard.
      </Description>
      <HomeButton to="/">Back to Dashboard</HomeButton>
    </Container>
  );
};

export default NotFound;