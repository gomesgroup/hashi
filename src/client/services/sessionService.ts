import axios from 'axios';
import { Session, SessionStatus } from '../types';

// Use mock session data for testing
const mockSession: Session = {
  id: 'test-session-123',
  createdAt: new Date().toISOString(),
  lastAccessed: new Date().toISOString(),
  status: SessionStatus.ACTIVE
};

export const sessionService = {
  /**
   * Create a new ChimeraX session
   */
  createSession: async (): Promise<Session> => {
    // For development testing, return a mock session immediately
    console.log('Creating mock session...');
    return mockSession;

    // In production, this would call the API
    // const response = await api.post('/sessions');
    // return response.data;
  },

  /**
   * Get session information by ID
   */
  getSession: async (sessionId: string): Promise<Session> => {
    // For development testing, return the mock session if IDs match
    console.log(`Getting mock session: ${sessionId}`);
    if (sessionId === mockSession.id || sessionId === 'test-session-123') {
      return {
        ...mockSession,
        lastAccessed: new Date().toISOString()
      };
    }
    
    // If we get here, simulate an invalid session
    throw new Error('Session not found');
    
    // In production, this would call the API
    // const response = await api.get(`/sessions/${sessionId}`);
    // return response.data;
  },

  /**
   * Get all active sessions
   */
  getAllSessions: async (): Promise<Session[]> => {
    // Return an array with only our mock session
    return [mockSession];
    
    // In production, this would call the API
    // const response = await api.get('/sessions');
    // return response.data;
  },

  /**
   * Refresh session to keep it active
   */
  refreshSession: async (sessionId: string): Promise<boolean> => {
    // Always succeed for our mock session
    console.log(`Refreshing mock session: ${sessionId}`);
    return true;
    
    // In production, this would call the API
    // const response = await api.put(`/sessions/${sessionId}/refresh`);
    // return response.status === 200;
  },

  /**
   * Close and cleanup a session
   */
  closeSession: async (sessionId: string): Promise<boolean> => {
    // Always succeed for our mock session
    console.log(`Closing mock session: ${sessionId}`);
    return true;
    
    // In production, this would call the API
    // const response = await api.delete(`/sessions/${sessionId}`);
    // return response.status === 200;
  },
};