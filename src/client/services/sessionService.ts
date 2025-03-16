import api from './api';
import { Session } from '../types';

export const sessionService = {
  /**
   * Create a new ChimeraX session
   */
  createSession: async (): Promise<Session> => {
    const response = await api.post('/sessions');
    return response.data;
  },

  /**
   * Get session information by ID
   */
  getSession: async (sessionId: string): Promise<Session> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get all active sessions
   */
  getAllSessions: async (): Promise<Session[]> => {
    const response = await api.get('/sessions');
    return response.data;
  },

  /**
   * Refresh session to keep it active
   */
  refreshSession: async (sessionId: string): Promise<boolean> => {
    const response = await api.put(`/sessions/${sessionId}/refresh`);
    return response.status === 200;
  },

  /**
   * Close and cleanup a session
   */
  closeSession: async (sessionId: string): Promise<boolean> => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.status === 200;
  },
};