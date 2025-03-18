import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Session, SessionStatus } from '../types';
import { useSession } from '../hooks/useSession';
import LoadingIndicator from './LoadingIndicator';

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
`;

const ListTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const EmptyMessage = styled.p`
  font-size: 14px;
  color: #666;
  font-style: italic;
  text-align: center;
  margin: 20px 0;
`;

const SessionCard = styled.div<{ isActive: boolean; status: SessionStatus }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 6px;
  background-color: ${props => props.isActive ? '#ebf8ff' : '#f7fafc'};
  border: 1px solid ${props => props.isActive ? '#90cdf4' : '#e2e8f0'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.isActive ? '#63b3ed' : '#cbd5e0'};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  opacity: ${props => props.status === SessionStatus.EXPIRED ? 0.6 : 1};
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SessionId = styled.span`
  font-family: monospace;
  font-size: 13px;
  color: #4a5568;
`;

const StatusBadge = styled.span<{ status: SessionStatus }>`
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: white;
  background-color: ${props => {
    switch (props.status) {
      case SessionStatus.ACTIVE:
        return '#48bb78';
      case SessionStatus.INACTIVE:
        return '#ed8936';
      case SessionStatus.EXPIRED:
        return '#a0aec0';
      default:
        return '#a0aec0';
    }
  }};
`;

const TimeInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #718096;
`;

const TimeLabel = styled.span`
  color: #4a5568;
`;

const RefreshButton = styled.button`
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background-color: #4299e1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-end;
  
  &:hover {
    background-color: #3182ce;
  }
  
  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
`;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
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

const SessionList: React.FC<SessionListProps> = ({ onSessionSelect }) => {
  const { sessions = [], activeSession, isLoading, error, fetchSessions } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    // Fetch sessions when component mounts
    if (fetchSessions) {
      fetchSessions();
    }
  }, [fetchSessions]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchSessions) {
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleSessionClick = (sessionId: string) => {
    onSessionSelect(sessionId);
  };
  
  if (isLoading && !sessions.length) {
    return (
      <ListContainer>
        <ListTitle>ChimeraX Sessions</ListTitle>
        <LoadingIndicator />
      </ListContainer>
    );
  }
  
  if (error) {
    return (
      <ListContainer>
        <ListTitle>ChimeraX Sessions</ListTitle>
        <div style={{ color: 'red' }}>{error}</div>
        <RefreshButton onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </ListContainer>
    );
  }
  
  return (
    <ListContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ListTitle>ChimeraX Sessions</ListTitle>
        <RefreshButton onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </div>
      
      {sessions.length === 0 ? (
        <EmptyMessage>No sessions found</EmptyMessage>
      ) : (
        sessions.map((session: Session) => (
          <SessionCard 
            key={session.id}
            isActive={activeSession?.id === session.id}
            status={session.status}
            onClick={() => handleSessionClick(session.id)}
          >
            <SessionHeader>
              <SessionId>Session {session.id.substring(0, 8)}...</SessionId>
              <StatusBadge status={session.status}>
                {getStatusText(session.status)}
              </StatusBadge>
            </SessionHeader>
            
            <TimeInfo>
              <span>
                <TimeLabel>Created:</TimeLabel> {formatDate(session.createdAt)}
              </span>
              <span>
                <TimeLabel>Last active:</TimeLabel> {formatDate(session.lastAccessed)}
              </span>
            </TimeInfo>
          </SessionCard>
        ))
      )}
      
      {isLoading && sessions.length > 0 && <LoadingIndicator size="small" />}
    </ListContainer>
  );
};

export default SessionList;