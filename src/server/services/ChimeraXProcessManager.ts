import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import { ChimeraXProcess, ChimeraXCommandResult } from '../types/chimerax';
import fetch from 'node-fetch';

/**
 * ChimeraX Process Manager
 * 
 * Manages the lifecycle of ChimeraX processes, including:
 * - Process creation and termination
 * - Port assignment
 * - Health monitoring
 * - Command execution
 * - Idle session cleanup
 */
export class ChimeraXProcessManager {
  private processes: Map<string, ChimeraXProcess>;
  private portAssignments: Set<number>;
  private readonly basePort: number;
  private readonly maxInstances: number;
  private readonly chimeraXPath: string;

  constructor() {
    this.processes = new Map();
    this.portAssignments = new Set();
    this.basePort = config.chimerax.basePort;
    this.maxInstances = config.chimerax.maxInstances;
    this.chimeraXPath = config.chimerax.chimeraXPath;

    // Initialize process monitoring
    this.startProcessMonitoring();
  }

  /**
   * Spawns a new ChimeraX process
   * @param sessionId Optional session ID (will be generated if not provided)
   * @returns Process information
   */
  public async spawnChimeraXProcess(sessionId?: string): Promise<ChimeraXProcess> {
    // Check if we've reached max instances
    if (this.processes.size >= this.maxInstances) {
      throw new Error('Maximum number of ChimeraX instances reached');
    }

    // Generate session ID if not provided
    const id = sessionId || randomUUID();

    // Find an available port
    const port = this.getAvailablePort();
    if (!port) {
      throw new Error('No available ports for ChimeraX instance');
    }

    try {
      // Spawn ChimeraX process
      const process = this.startChimeraXProcess(port);
      
      // Create process record
      const chimeraXProcess: ChimeraXProcess = {
        id,
        port,
        process,
        pid: process.pid || -1,
        status: 'starting',
        createdAt: new Date(),
        lastActive: new Date(),
      };

      // Store process
      this.processes.set(id, chimeraXProcess);
      this.portAssignments.add(port);

      // Wait for process to initialize
      await this.waitForChimeraXStartup(port);

      // Update status
      chimeraXProcess.status = 'running';
      
      logger.info(`ChimeraX process started with ID: ${id}, PID: ${process.pid}, Port: ${port}`);
      return chimeraXProcess;
    } catch (error) {
      // Clean up if there was an error
      this.portAssignments.delete(port);
      logger.error(`Error starting ChimeraX process: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Gets information about a ChimeraX process
   * @param sessionId The session ID
   * @returns Process information or null if not found
   */
  public getChimeraXProcess(sessionId: string): ChimeraXProcess | null {
    return this.processes.get(sessionId) || null;
  }

  /**
   * Terminates a ChimeraX process
   * @param sessionId The session ID
   * @returns True if process was terminated, false if not found
   */
  public async terminateChimeraXProcess(sessionId: string): Promise<boolean> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      return false;
    }

    try {
      // Kill the process
      if (processInfo.process.kill()) {
        logger.info(`Terminated ChimeraX process with ID: ${sessionId}, PID: ${processInfo.pid}`);
      } else {
        logger.warn(`Failed to terminate ChimeraX process with ID: ${sessionId}, PID: ${processInfo.pid}`);
      }
    } catch (error) {
      logger.error(`Error terminating ChimeraX process: ${(error as Error).message}`);
    }

    // Clean up resources
    this.processes.delete(sessionId);
    this.portAssignments.delete(processInfo.port);
    return true;
  }

  /**
   * Sends a command to a ChimeraX process
   * @param sessionId The session ID
   * @param command The command to send
   * @returns Command execution result
   */
  public async sendCommand(sessionId: string, command: string): Promise<ChimeraXCommandResult> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      return {
        success: false,
        error: 'Session not found',
      };
    }
    
    // Update last active timestamp
    processInfo.lastActive = new Date();
    
    try {
      // Encode command for URL
      const encodedCommand = encodeURIComponent(command);
      const url = `http://localhost:${processInfo.port}/run?command=${encodedCommand}`;
      
      // Send command using REST API
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error(`Error sending command to ChimeraX: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Terminates idle ChimeraX processes
   * @param timeoutMs Idle timeout in milliseconds (default: 30 minutes)
   * @returns Number of terminated processes
   */
  public async cleanupIdleSessions(timeoutMs: number = 30 * 60 * 1000): Promise<number> {
    const now = new Date();
    let terminatedCount = 0;

    for (const [sessionId, processInfo] of this.processes.entries()) {
      const idleTime = now.getTime() - processInfo.lastActive.getTime();
      
      if (idleTime > timeoutMs) {
        logger.info(`Terminating idle ChimeraX process: ${sessionId}, idle for ${idleTime}ms`);
        const terminated = await this.terminateChimeraXProcess(sessionId);
        if (terminated) {
          terminatedCount++;
        }
      }
    }

    return terminatedCount;
  }

  /**
   * Gets the status of all ChimeraX processes
   * @returns Array of process information
   */
  public getAllProcesses(): ChimeraXProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Starts a ChimeraX process with the specified port
   * @param port The port for the REST API
   * @returns Child process
   * @private
   */
  private startChimeraXProcess(port: number): ChildProcess {
    const command = this.chimeraXPath;
    const args = [
      '--nogui',
      '--offscreen',
      '--nosilent',
      '--noexit',
      '--cmd',
      `remotecontrol rest start port ${port} json true`,
    ];

    logger.debug(`Starting ChimeraX process with command: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Handle stdout/stderr
    process.stdout.on('data', (data) => {
      logger.debug(`ChimeraX [PID:${process.pid}] stdout: ${data.toString().trim()}`);
    });

    process.stderr.on('data', (data) => {
      logger.warn(`ChimeraX [PID:${process.pid}] stderr: ${data.toString().trim()}`);
    });

    // Handle process termination
    process.on('close', (code) => {
      logger.info(`ChimeraX process [PID:${process.pid}] exited with code ${code}`);
      
      // Find and remove the terminated process
      for (const [sessionId, processInfo] of this.processes.entries()) {
        if (processInfo.pid === process.pid) {
          this.processes.delete(sessionId);
          this.portAssignments.delete(processInfo.port);
          break;
        }
      }
    });

    process.on('error', (error) => {
      logger.error(`ChimeraX process error: ${error.message}`);
    });

    return process;
  }

  /**
   * Waits for ChimeraX to initialize and start the REST API
   * @param port The REST API port
   * @returns Promise that resolves when the REST API is available
   * @private
   */
  private async waitForChimeraXStartup(port: number): Promise<void> {
    const maxAttempts = 30;
    const retryIntervalMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Try to connect to the REST API
        const response = await fetch(`http://localhost:${port}/version`);
        
        if (response.ok) {
          logger.debug(`ChimeraX REST API available on port ${port}`);
          return;
        }
      } catch (error) {
        // Ignore errors during initialization
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }

    throw new Error(`ChimeraX REST API did not start within ${maxAttempts * retryIntervalMs / 1000} seconds`);
  }

  /**
   * Finds an available port for a new ChimeraX instance
   * @returns Available port number or null if no ports are available
   * @private
   */
  private getAvailablePort(): number | null {
    const maxPort = this.basePort + this.maxInstances - 1;

    for (let port = this.basePort; port <= maxPort; port++) {
      if (!this.portAssignments.has(port)) {
        return port;
      }
    }

    return null;
  }

  /**
   * Starts the process monitoring
   * Periodically checks for zombie processes or unreachable instances
   * @private
   */
  private startProcessMonitoring(): void {
    // Check every 5 minutes
    const interval = setInterval(async () => {
      // Health check for all processes
      for (const [sessionId, processInfo] of this.processes.entries()) {
        try {
          // Check if process is still running
          const signal = processInfo.process.kill(0);
          if (!signal) {
            logger.warn(`ChimeraX process ${sessionId} seems to be dead, cleaning up`);
            this.processes.delete(sessionId);
            this.portAssignments.delete(processInfo.port);
            continue;
          }

          // Check if REST API is responding
          const isReachable = await this.isRestApiReachable(processInfo.port);
          if (!isReachable) {
            logger.warn(`ChimeraX REST API on port ${processInfo.port} is not reachable, restarting`);
            await this.terminateChimeraXProcess(sessionId);
            // TODO: If this is a critical process, restart it or notify client
          }
        } catch (error) {
          logger.error(`Error monitoring ChimeraX process ${sessionId}: ${(error as Error).message}`);
        }
      }

      // Cleanup idle sessions
      await this.cleanupIdleSessions();
    }, 5 * 60 * 1000); // 5 minutes

    // Prevent the interval from keeping the process alive
    interval.unref();
  }

  /**
   * Checks if the ChimeraX REST API is reachable
   * @param port The REST API port
   * @returns True if reachable, false otherwise
   * @private
   */
  private async isRestApiReachable(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}/version`, {
        timeout: 5000, // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const chimeraXProcessManager = new ChimeraXProcessManager();
export default chimeraXProcessManager;