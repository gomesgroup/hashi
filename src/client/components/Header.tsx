import React from 'react';
import styled from 'styled-components';
import { useSession } from '../contexts/SessionContext';

const HeaderContainer = styled.header`
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const Logo = styled.div`
  font-size: 1.5em;
  font-weight: bold;
  color: var(--primary-color);
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.9em;
  color: var(--text-color);

  span {
    margin-right: 20px;
  }
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: var(--error-color);
  border: 1px solid var(--error-color);
  border-radius: var(--border-radius);
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: var(--error-color);
    color: white;
  }
`;

const Header: React.FC = () => {
  const { session, closeSession } = useSession();

  const handleLogout = async () => {
    if (session) {
      await closeSession(session.id);
    }
  };

  return (
    <HeaderContainer>
      <Logo>Hashi</Logo>
      {session && (
        <SessionInfo>
          <span>Session ID: {session.id.substring(0, 8)}...</span>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </SessionInfo>
      )}
    </HeaderContainer>
  );
};

export default Header;