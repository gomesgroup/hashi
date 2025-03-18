import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';
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
 * - OSMesa rendering fallback options
 */
export class ChimeraXProcessManager {
  private processes: Map<string, ChimeraXProcess>;
  private portAssignments: Set<number>;
  private readonly basePort: number;
  private readonly maxInstances: number;
  private readonly chimeraXPath: string;
  private readonly platform: string;
  private readonly hasOSMesa: boolean;
  private readonly useXvfb: boolean;
  private readonly debugMode: boolean;

  constructor() {
    this.processes = new Map();
    this.portAssignments = new Set();
    this.basePort = config.chimerax.basePort;
    this.maxInstances = config.chimerax.maxInstances;
    this.chimeraXPath = config.chimerax.chimeraXPath;
    this.platform = os.platform();
    this.debugMode = process.env.DEBUG_CHIMERAX === 'true';
    
    // Check if OSMesa is available
    this.hasOSMesa = process.env.OSMESA_AVAILABLE === 'true';
    
    // Use Xvfb as fallback on Linux if OSMesa is not available
    this.useXvfb = this.platform === 'linux' && 
                   !this.hasOSMesa && 
                   process.env.DISPLAY !== undefined;
    
    logger.info(`ChimeraX Process Manager initialized:
      - Platform: ${this.platform}
      - ChimeraX Path: ${this.chimeraXPath}
      - OSMesa Available: ${this.hasOSMesa}
      - Using Xvfb Fallback: ${this.useXvfb}
      - Debug Mode: ${this.debugMode}
    `);

    // Try to detect ChimeraX if path is not specified
    if (!this.chimeraXPath) {
      this.detectChimeraXPath();
    }

    // Initialize process monitoring
    this.startProcessMonitoring();
  }
  
  /**
   * Attempt to detect ChimeraX installation path
   * @private
   */
  private detectChimeraXPath(): void {
    try {
      const platform = os.platform();
      let detectedPath = '';
      
      if (platform === 'darwin') {
        // macOS standard installation path
        const macPaths = [
          '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX',
          '/Applications/UCSF ChimeraX.app/Contents/MacOS/ChimeraX'
        ];
        
        for (const path of macPaths) {
          if (fs.existsSync(path)) {
            detectedPath = path;
            break;
          }
        }
      } else if (platform === 'linux') {
        // Linux standard paths
        const linuxPaths = [
          '/usr/bin/chimerax',
          '/usr/local/bin/chimerax',
          '/opt/UCSF/ChimeraX/bin/chimerax'
        ];
        
        for (const path of linuxPaths) {
          if (fs.existsSync(path)) {
            detectedPath = path;
            break;
          }
        }
      }
      
      if (detectedPath) {
        logger.info(`Detected ChimeraX at: ${detectedPath}`);
        // @ts-ignore - Override readonly property for initialization
        this.chimeraXPath = detectedPath;
      } else {
        logger.warn('Could not automatically detect ChimeraX path');
      }
    } catch (error) {
      logger.error(`Error detecting ChimeraX path: ${(error as Error).message}`);
    }
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
    
    if (!command || !fs.existsSync(command)) {
      throw new Error(`ChimeraX executable not found at path: ${command}`);
    }
    
    // Build command line arguments
    const args = [
      '--nogui',            // Run without UI
      '--offscreen',        // Use offscreen rendering
      '--noexit',           // Prevent automatic exit
    ];
    
    // Only use nosilent in debug mode
    if (this.debugMode) {
      args.push('--nosilent');
    } else {
      args.push('--silent');
    }
    
    // Add OSMesa rendering options if available
    if (this.hasOSMesa) {
      args.push('--osmesa');  // Use OSMesa for rendering
    }
    
    // Add remotecontrol command
    args.push('--cmd');
    args.push(`remotecontrol rest start port ${port} json true`);
    
    // Additional initialization commands if needed
    const initialCommands = [];
    
    // Set rendering preferences
    initialCommands.push('set bgColor white');
    initialCommands.push('lighting soft');
    
    // If we have multiple commands, add them
    if (initialCommands.length > 0) {
      args.push('--cmd');
      args.push(initialCommands.join('; '));
    }
    
    logger.info(`Starting ChimeraX process with command: ${command} ${args.join(' ')}`);
    
    // Set up environment variables
    const env = { ...process.env };
    
    // Configure environment based on platform and rendering options
    if (this.platform === 'linux') {
      if (this.useXvfb) {
        // Using Xvfb as fallback
        logger.info(`Using Xvfb display: ${process.env.DISPLAY}`);
      } else if (!this.hasOSMesa) {
        // No rendering options available, try to use software rendering
        env.LIBGL_ALWAYS_SOFTWARE = '1';
        logger.info('Using software rendering fallback');
      }
    }
    
    // Spawn the process with custom environment
    const chimeraxProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env
    });

    // Create log directory if it doesn't exist
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create log file streams for persistent logging
    const logFilePath = path.join(logDir, `chimerax_${port}_${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    // Log the startup info
    logStream.write(`ChimeraX Process Started\n`);
    logStream.write(`PID: ${chimeraxProcess.pid}\n`);
    logStream.write(`Port: ${port}\n`);
    logStream.write(`Command: ${command} ${args.join(' ')}\n`);
    logStream.write(`Time: ${new Date().toISOString()}\n`);
    logStream.write(`OSMesa: ${this.hasOSMesa ? 'Yes' : 'No'}\n`);
    logStream.write(`Xvfb: ${this.useXvfb ? 'Yes' : 'No'}\n\n`);
    
    // Handle stdout/stderr
    chimeraxProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (this.debugMode || message.includes('error') || message.includes('warning')) {
        logger.debug(`ChimeraX [PID:${chimeraxProcess.pid}] stdout: ${message}`);
      }
      logStream.write(`[STDOUT] ${message}\n`);
    });

    chimeraxProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      logger.warn(`ChimeraX [PID:${chimeraxProcess.pid}] stderr: ${message}`);
      logStream.write(`[STDERR] ${message}\n`);
      
      // Check for known errors
      if (message.includes('OSMesa') && message.includes('error')) {
        logger.error('OSMesa rendering error detected. ChimeraX could not initialize offscreen rendering.');
        // @ts-ignore - Temporarily set for this instance
        this.hasOSMesa = false;
      }
    });

    // Handle process termination
    chimeraxProcess.on('close', (code) => {
      logger.info(`ChimeraX process [PID:${chimeraxProcess.pid}] exited with code ${code}`);
      logStream.write(`[EXIT] Process exited with code ${code} at ${new Date().toISOString()}\n`);
      logStream.end();
      
      // Find and remove the terminated process
      for (const [sessionId, processInfo] of this.processes.entries()) {
        if (processInfo.pid === chimeraxProcess.pid) {
          this.processes.delete(sessionId);
          this.portAssignments.delete(processInfo.port);
          logger.info(`Removed process info for session ${sessionId}`);
          break;
        }
      }
    });

    chimeraxProcess.on('error', (error) => {
      logger.error(`ChimeraX process error: ${error.message}`);
      logStream.write(`[ERROR] ${error.message} at ${new Date().toISOString()}\n`);
      logStream.end();
    });

    return chimeraxProcess;
  }

  /**
   * Waits for ChimeraX to initialize and start the REST API
   * @param port The REST API port
   * @returns Promise that resolves when the REST API is available
   * @private
   */
  private async waitForChimeraXStartup(port: number): Promise<void> {
    const maxAttempts = 60; // More attempts for slower systems
    const retryIntervalMs = 500;
    let lastError = '';
    let progressReported = false;

    logger.info(`Waiting for ChimeraX REST API on port ${port}...`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Report progress every 10 attempts
        if (attempt > 0 && attempt % 10 === 0 && !progressReported) {
          logger.info(`Still waiting for ChimeraX REST API (${attempt}/${maxAttempts} attempts)...`);
          progressReported = true;
        } else if (attempt % 10 !== 0) {
          progressReported = false;
        }
        
        // Try to connect to the REST API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch(`http://localhost:${port}/version`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is valid
        if (response.ok) {
          // Try to parse the response to make sure it's working
          const data = await response.json();
          logger.info(`ChimeraX REST API available on port ${port}, version: ${data.version || 'unknown'}`);
          
          // Send a test command to verify functionality
          await this.sendTestCommand(port);
          
          return;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        lastError = (error as Error).message || 'Unknown error';
        
        // Check for specific connection errors
        if (lastError.includes('ECONNREFUSED')) {
          // Port not open yet, this is expected during startup
        } else if (lastError.includes('aborted') || lastError.includes('timeout')) {
          // Request timeout, might be still starting up
          logger.debug(`ChimeraX startup: connection timeout on attempt ${attempt + 1}`);
        } else {
          // Log unexpected errors
          logger.debug(`ChimeraX startup error on attempt ${attempt + 1}: ${lastError}`);
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }

    throw new Error(
      `ChimeraX REST API did not start within ${
        (maxAttempts * retryIntervalMs) / 1000
      } seconds. Last error: ${lastError}`
    );
  }
  
  /**
   * Sends a test command to verify ChimeraX is working properly
   * @param port The REST API port
   * @private
   */
  private async sendTestCommand(port: number): Promise<boolean> {
    try {
      // Simple test command
      const testCommandUrl = `http://localhost:${port}/run?command=${encodeURIComponent('version')}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(testCommandUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        logger.debug(`ChimeraX test command successful, result: ${JSON.stringify(result)}`);
        return true;
      } else {
        logger.warn(`ChimeraX test command failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.warn(`ChimeraX test command failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Finds an available port for a new ChimeraX instance
   * @returns Available port number or null if no ports are available
   * @private
   */
  private getAvailablePort(): number | null {
    const maxPort = this.basePort + this.maxInstances - 1;
    
    // Check for existing port assignments
    for (let port = this.basePort; port <= maxPort; port++) {
      if (!this.portAssignments.has(port)) {
        // Test if port is actually available (not used by another process)
        if (this.isPortAvailable(port)) {
          return port;
        }
      }
    }

    return null;
  }
  
  /**
   * Checks if a port is available on localhost
   * @param port Port number to check
   * @returns True if port is available
   * @private
   */
  private isPortAvailable(port: number): boolean {
    try {
      // Try to bind to the port
      const net = require('net');
      const server = net.createServer();
      
      // Use a synchronous approach with a promise
      return new Promise<boolean>((resolve) => {
        server.once('error', (err: any) => {
          // Port is in use or other error
          server.close();
          resolve(false);
        });
        
        server.once('listening', () => {
          // Port is available
          server.close();
          resolve(true);
        });
        
        // Try to listen on the port
        server.listen(port, '127.0.0.1');
      });
    } catch (error) {
      logger.error(`Error checking port ${port} availability: ${(error as Error).message}`);
      return false;
    }
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