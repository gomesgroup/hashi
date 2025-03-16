import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { SessionStatus } from '../../shared/types';

/**
 * Interfaces for ChimeraX process management
 */
export interface ChimeraXProcess {
  pid: number;
  port: number;
  process: ChildProcess;
  status: SessionStatus;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
}

export interface ChimeraXOptions {
  port: number;
  sessionId: string;
}

/**
 * ChimeraX Process Management Service
 * Responsible for spawning, monitoring, and terminating ChimeraX processes
 */
class ChimeraXService {
  private processes: Map<string, ChimeraXProcess> = new Map();
  private portCounter: number = config.chimerax.basePort;

  /**
   * Checks if ChimeraX is installed and available
   */
  public async checkChimeraXInstallation(): Promise<boolean> {
    try {
      if (!config.chimerax.chimeraXPath) {
        logger.error('ChimeraX path not configured');
        return false;
      }

      if (!fs.existsSync(config.chimerax.chimeraXPath)) {
        logger.error(`ChimeraX executable not found at ${config.chimerax.chimeraXPath}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking ChimeraX installation:', error);
      return false;
    }
  }

  /**
   * Spawns a new ChimeraX process
   * @param options Options for the ChimeraX process
   * @returns ChimeraX process information
   */
  public async spawnChimeraX(options: Partial<ChimeraXOptions> = {}): Promise<ChimeraXProcess> {
    if (this.processes.size >= config.chimerax.maxInstances) {
      throw new Error('Maximum number of ChimeraX instances reached');
    }

    const port = options.port || this.getNextAvailablePort();
    const sessionId = options.sessionId || '';

    try {
      logger.info(`Spawning ChimeraX process for session ${sessionId} on port ${port}`);
      
      // Create arguments for ChimeraX with REST API enabled
      const args = [
        '--nogui',
        '--offscreen',
        '--rest',
        `--rest-port=${port}`,
        '--rest-single-client'
      ];

      // Spawn the ChimeraX process
      const process = spawn(config.chimerax.chimeraXPath, args, {
        detached: false, // Process will be terminated when Node.js exits
        stdio: ['ignore', 'pipe', 'pipe'] // Redirect stdout and stderr
      });

      // Create ChimeraX process object
      const chimeraxProcess: ChimeraXProcess = {
        pid: process.pid || 0,
        port,
        process,
        status: SessionStatus.INITIALIZING,
        sessionId,
        startTime: new Date(),
        lastActivity: new Date()
      };

      // Set up logging for stdout and stderr
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          logger.debug(`ChimeraX [${sessionId}] stdout: ${data.toString().trim()}`);
          
          // Check for REST API ready message
          if (data.toString().includes('REST server listening')) {
            chimeraxProcess.status = SessionStatus.READY;
            logger.info(`ChimeraX REST API ready for session ${sessionId} on port ${port}`);
          }
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data) => {
          logger.error(`ChimeraX [${sessionId}] stderr: ${data.toString().trim()}`);
        });
      }

      // Handle process exit
      process.on('exit', (code, signal) => {
        logger.info(`ChimeraX process for session ${sessionId} exited with code ${code} and signal ${signal}`);
        chimeraxProcess.status = SessionStatus.TERMINATED;
        this.processes.delete(sessionId);
      });

      // Handle process errors
      process.on('error', (error) => {
        logger.error(`ChimeraX process error for session ${sessionId}:`, error);
        chimeraxProcess.status = SessionStatus.ERROR;
      });

      // Store the process in the map
      if (sessionId) {
        this.processes.set(sessionId, chimeraxProcess);
      }

      // Wait for the process to initialize
      await this.waitForProcessReady(chimeraxProcess);
      
      return chimeraxProcess;
    } catch (error) {
      logger.error(`Error spawning ChimeraX process for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Terminates a ChimeraX process
   * @param sessionId Session ID associated with the process
   */
  public async terminateChimeraX(sessionId: string): Promise<boolean> {
    try {
      const process = this.processes.get(sessionId);
      
      if (!process) {
        logger.warn(`No ChimeraX process found for session ${sessionId}`);
        return false;
      }

      logger.info(`Terminating ChimeraX process for session ${sessionId}`);
      
      // Send REST API command to exit ChimeraX gracefully
      // This is better than killing the process directly
      try {
        // TODO: Implement REST API call to exit ChimeraX gracefully
        // For now, we'll just kill the process
      } catch (error) {
        logger.warn(`Failed to exit ChimeraX gracefully for session ${sessionId}. Killing process.`, error);
      }

      // Kill the process
      process.process.kill();
      
      // Remove from the process map
      this.processes.delete(sessionId);
      
      return true;
    } catch (error) {
      logger.error(`Error terminating ChimeraX process for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Gets information about a ChimeraX process
   * @param sessionId Session ID
   * @returns ChimeraX process information
   */
  public getChimeraXProcess(sessionId: string): ChimeraXProcess | undefined {
    return this.processes.get(sessionId);
  }

  /**
   * Gets all ChimeraX processes
   * @returns Map of all ChimeraX processes
   */
  public getAllProcesses(): Map<string, ChimeraXProcess> {
    return this.processes;
  }

  /**
   * Waits for a ChimeraX process to be ready
   * @param process ChimeraX process
   * @returns Promise that resolves when the process is ready
   */
  private async waitForProcessReady(process: ChimeraXProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set a timeout for process initialization
      const timeout = setTimeout(() => {
        reject(new Error(`ChimeraX process initialization timed out for session ${process.sessionId}`));
      }, 30000); // 30 seconds timeout

      // Check process status periodically
      const interval = setInterval(() => {
        if (process.status === SessionStatus.READY) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        } else if (process.status === SessionStatus.ERROR || process.status === SessionStatus.TERMINATED) {
          clearTimeout(timeout);
          clearInterval(interval);
          reject(new Error(`ChimeraX process failed to initialize for session ${process.sessionId}`));
        }
      }, 100);
    });
  }

  /**
   * Updates the activity timestamp for a ChimeraX process
   * @param sessionId Session ID
   */
  public updateActivity(sessionId: string): void {
    const process = this.processes.get(sessionId);
    if (process) {
      process.lastActivity = new Date();
    }
  }

  /**
   * Gets the next available port for a ChimeraX process
   * @returns Available port
   */
  private getNextAvailablePort(): number {
    // Simple port assignment for now - in a real implementation, 
    // we would check if the port is already in use
    const port = this.portCounter;
    this.portCounter++;
    return port;
  }

  /**
   * Cleans up idle ChimeraX processes
   * @param idleTimeout Idle timeout in milliseconds
   */
  public async cleanupIdleProcesses(idleTimeout: number = 30 * 60 * 1000): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, process] of this.processes.entries()) {
      const idleTime = now.getTime() - process.lastActivity.getTime();
      
      if (idleTime > idleTimeout) {
        logger.info(`Terminating idle ChimeraX process for session ${sessionId}. Idle for ${idleTime / 1000} seconds`);
        await this.terminateChimeraX(sessionId);
      }
    }
  }
}

export default new ChimeraXService();