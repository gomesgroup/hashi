import React, { useState } from 'react';
import styled from 'styled-components';
import { Session, SessionStatus } from '../types';
import { useSession } from '../hooks/useSession';
import LoadingIndicator from './LoadingIndicator';

interface SessionControlsProps {
  onCreateSession?: () => void;
  onRefreshSession?: () => void;
  onCloseSession?: () => void;
}

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SessionTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const SessionDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
`;

const SessionLabel = styled.span`
  font-weight: 500;
`;

const SessionValue = styled.span`
  font-family: monospace;
`;

const StatusIndicator = styled.div<{ status: SessionStatus }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => {
      switch (props.status) {
        case SessionStatus.ACTIVE:
          return '#48bb78';
        case SessionStatus.INACTIVE:
          return '#ed8936';
        case SessionStatus.EXPIRED:
          return '#e53e3e';
        default:
          return '#a0aec0';
      }
    }};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
`;

const Button = styled.button`
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  border: none;
  background-color: #4299e1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3182ce;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.4);
  }
  
  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
`;

const CloseButton = styled(Button)`
  background-color: #e53e3e;
  
  &:hover {
    background-color: #c53030;
  }
`;

const CreateButton = styled(Button)`
  background-color: #38a169;
  
  &:hover {
    background-color: #2f855a;
  }
`;

const RefreshButton = styled(Button)`
  background-color: #ed8936;
  
  &:hover {
    background-color: #dd6b20;
  }
`;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusText = (status: SessionStatus): string => {
  switch (status) {
    case SessionStatus.ACTIVE:
      return 'Active';
    case SessionStatus.INACTIVE:
      return 'Inactive';
    case SessionStatus.EXPIRED:
      return 'Expired';
    default:
      return 'Unknown';
  }
};

const SessionControls: React.FC<SessionControlsProps> = ({
  onCreateSession,
  onRefreshSession,
  onCloseSession,
}) => {
  const { activeSession, isLoading, error, createSession, refreshSession, closeSession } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      await createSession();
      if (onCreateSession) onCreateSession();
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshSession = async () => {
    if (!activeSession) return;
    
    setIsRefreshing(true);
    try {
      await refreshSession(activeSession.id);
      if (onRefreshSession) onRefreshSession();
    } catch (err) {
      console.error('Failed to refresh session:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    
    setIsClosing(true);
    try {
      await closeSession(activeSession.id);
      if (onCloseSession) onCloseSession();
    } catch (err) {
      console.error('Failed to close session:', err);
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <ControlsContainer>
        <LoadingIndicator />
      </ControlsContainer>
    );
  }

  if (error) {
    return (
      <ControlsContainer>
        <div style={{ color: 'red' }}>{error}</div>
        <Button onClick={handleCreateSession} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create New Session'}
        </Button>
      </ControlsContainer>
    );
  }

  if (!activeSession) {
    return (
      <ControlsContainer>
        <SessionTitle>No Active Session</SessionTitle>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Create a new ChimeraX session to start working with molecular structures.
        </p>
        <CreateButton onClick={handleCreateSession} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create New Session'}
        </CreateButton>
      </ControlsContainer>
    );
  }

  return (
    <ControlsContainer>
      <SessionInfo>
        <SessionTitle>ChimeraX Session</SessionTitle>
        
        <StatusIndicator status={activeSession.status}>
          {getStatusText(activeSession.status)}
        </StatusIndicator>
        
        <SessionDetail>
          <SessionLabel>ID:</SessionLabel>
          <SessionValue>{activeSession.id.substring(0, 8)}...</SessionValue>
        </SessionDetail>
        
        <SessionDetail>
          <SessionLabel>Created:</SessionLabel>
          <SessionValue>{formatDate(activeSession.createdAt)}</SessionValue>
        </SessionDetail>
        
        <SessionDetail>
          <SessionLabel>Last Activity:</SessionLabel>
          <SessionValue>{formatDate(activeSession.lastAccessed)}</SessionValue>
        </SessionDetail>
      </SessionInfo>
      
      <ButtonGroup>
        <RefreshButton 
          onClick={handleRefreshSession} 
          disabled={isRefreshing || activeSession.status === SessionStatus.EXPIRED}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
        
        <CloseButton 
          onClick={handleCloseSession} 
          disabled={isClosing || activeSession.status === SessionStatus.EXPIRED}
        >
          {isClosing ? 'Closing...' : 'Close Session'}
        </CloseButton>
      </ButtonGroup>
    </ControlsContainer>
  );
};

export default SessionControls;