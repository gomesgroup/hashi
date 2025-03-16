import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import chimeraxService from './chimerax';
import { Session, SessionStatus } from '../../shared/types';

/**
 * Interfaces for Session Management
 */
export interface SessionOptions {
  userId?: string;
  filePath?: string;
  pdbId?: string;
}

export interface SessionStorageItem extends Session {
  userId?: string;
  filePath?: string;
  pdbId?: string;
}

/**
 * Session Management Service
 * Responsible for creating, tracking, and terminating user sessions
 */
class SessionService {
  private sessions: Map<string, SessionStorageItem> = new Map();
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes default timeout

  /**
   * Creates a new session with a ChimeraX process
   * @param options Session options
   * @returns Created session
   */
  public async createSession(options: SessionOptions = {}): Promise<Session> {
    try {
      // Generate a unique session ID
      const sessionId = uuidv4();
      logger.info(`Creating new session with ID ${sessionId}`);

      // Spawn a ChimeraX process for this session
      const chimeraxProcess = await chimeraxService.spawnChimeraX({ sessionId });

      // Create the session object
      const now = new Date();
      const session: SessionStorageItem = {
        id: sessionId,
        created: now,
        lastActive: now,
        port: chimeraxProcess.port,
        status: chimeraxProcess.status,
        userId: options.userId,
        filePath: options.filePath,
        pdbId: options.pdbId
      };

      // Store the session
      this.sessions.set(sessionId, session);

      // Set up automatic cleanup after session timeout
      setTimeout(() => this.checkSessionTimeout(sessionId), this.sessionTimeout);

      // If a PDB ID or file path was provided, load it
      if (options.pdbId || options.filePath) {
        // This would be implemented in a real application
        // We would use the ChimeraX REST API to load the file/PDB
        logger.info(`Would load PDB ID ${options.pdbId} or file ${options.filePath} for session ${sessionId}`);
      }

      return {
        id: session.id,
        created: session.created,
        lastActive: session.lastActive,
        port: session.port,
        status: session.status
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Gets a session by ID
   * @param sessionId Session ID
   * @returns Session object
   */
  public getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      created: session.created,
      lastActive: session.lastActive,
      port: session.port,
      status: session.status
    };
  }

  /**
   * Gets all sessions
   * @returns All sessions
   */
  public getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      created: session.created,
      lastActive: session.lastActive,
      port: session.port,
      status: session.status
    }));
  }

  /**
   * Terminates a session and its associated ChimeraX process
   * @param sessionId Session ID
   * @returns True if session was terminated successfully
   */
  public async terminateSession(sessionId: string): Promise<boolean> {
    try {
      logger.info(`Terminating session ${sessionId}`);
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn(`Session ${sessionId} not found`);
        return false;
      }

      // Terminate the ChimeraX process
      await chimeraxService.terminateChimeraX(sessionId);
      
      // Update session status
      session.status = SessionStatus.TERMINATED;
      
      // Remove the session from the map
      this.sessions.delete(sessionId);
      
      return true;
    } catch (error) {
      logger.error(`Error terminating session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Updates session activity timestamp
   * @param sessionId Session ID
   * @returns Session with updated timestamp
   */
  public updateSessionActivity(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const now = new Date();
    session.lastActive = now;
    
    // Update ChimeraX process activity as well
    chimeraxService.updateActivity(sessionId);

    // Set up next timeout check
    setTimeout(() => this.checkSessionTimeout(sessionId), this.sessionTimeout);

    return {
      id: session.id,
      created: session.created,
      lastActive: session.lastActive,
      port: session.port,
      status: session.status
    };
  }

  /**
   * Checks if a session has timed out
   * @param sessionId Session ID to check
   */
  private async checkSessionTimeout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const now = new Date();
    const idleTime = now.getTime() - session.lastActive.getTime();
    
    if (idleTime > this.sessionTimeout) {
      logger.info(`Session ${sessionId} has timed out. Idle for ${idleTime / 1000} seconds`);
      await this.terminateSession(sessionId);
    }
  }

  /**
   * Clean up all timed out sessions
   */
  public async cleanupTimedOutSessions(): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now.getTime() - session.lastActive.getTime();
      
      if (idleTime > this.sessionTimeout) {
        logger.info(`Cleaning up timed out session ${sessionId}. Idle for ${idleTime / 1000} seconds`);
        await this.terminateSession(sessionId);
      }
    }
  }

  /**
   * Validates if a user has access to a session
   * @param sessionId Session ID
   * @param userId User ID
   * @returns True if the user has access to the session
   */
  public validateSessionAccess(sessionId: string, userId?: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // If no user ID is required for the session, allow access
    if (!session.userId) {
      return true;
    }

    // If session requires a user ID, check that it matches
    return session.userId === userId;
  }

  /**
   * Sets the session timeout value
   * @param timeout Timeout in milliseconds
   */
  public setSessionTimeout(timeout: number): void {
    this.sessionTimeout = timeout;
  }
}

export default new SessionService();