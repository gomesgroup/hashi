/**
 * Shared types between client and server
 */

export interface Session {
  id: string;
  created: Date;
  lastActive: Date;
  port: number;
  status: SessionStatus;
}

export enum SessionStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  TERMINATED = 'terminated',
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
}

export interface MoleculeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded: Date;
  sessionId?: string;
}