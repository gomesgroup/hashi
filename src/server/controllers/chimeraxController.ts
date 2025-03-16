import { Request, Response, NextFunction } from 'express';
import chimeraXProcessManager from '../services/ChimeraXProcessManager';
import logger from '../utils/logger';
import { ChimeraXProcessSummary } from '../types/chimerax';

/**
 * ChimeraX Controller
 * Handles HTTP requests related to ChimeraX processes
 */
export const chimeraxController = {
  /**
   * Creates a new ChimeraX process
   * POST /api/chimerax/processes
   */
  createProcess: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.body.sessionId;
      const process = await chimeraXProcessManager.spawnChimeraXProcess(sessionId);
      
      // Create a sanitized process summary for the client
      const summary: ChimeraXProcessSummary = {
        id: process.id,
        port: process.port,
        pid: process.pid,
        status: process.status,
        createdAt: process.createdAt.toISOString(),
        lastActive: process.lastActive.toISOString(),
        idleTimeMs: 0,
      };
      
      res.status(201).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      logger.error(`Error creating ChimeraX process: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Gets all ChimeraX processes
   * GET /api/chimerax/processes
   */
  getProcesses: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const processes = chimeraXProcessManager.getAllProcesses();
      const now = new Date();
      
      // Create sanitized process summaries for the client
      const summaries = processes.map((process) => ({
        id: process.id,
        port: process.port,
        pid: process.pid,
        status: process.status,
        createdAt: process.createdAt.toISOString(),
        lastActive: process.lastActive.toISOString(),
        idleTimeMs: now.getTime() - process.lastActive.getTime(),
      }));
      
      res.status(200).json({
        status: 'success',
        data: summaries,
      });
    } catch (error) {
      logger.error(`Error getting ChimeraX processes: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Gets a specific ChimeraX process
   * GET /api/chimerax/processes/:id
   */
  getProcess: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id;
      const process = chimeraXProcessManager.getChimeraXProcess(sessionId);
      
      if (!process) {
        return res.status(404).json({
          status: 'error',
          code: 'PROCESS_NOT_FOUND',
          message: `ChimeraX process with ID ${sessionId} not found`,
        });
      }
      
      const now = new Date();
      const summary: ChimeraXProcessSummary = {
        id: process.id,
        port: process.port,
        pid: process.pid,
        status: process.status,
        createdAt: process.createdAt.toISOString(),
        lastActive: process.lastActive.toISOString(),
        idleTimeMs: now.getTime() - process.lastActive.getTime(),
      };
      
      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      logger.error(`Error getting ChimeraX process: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Terminates a ChimeraX process
   * DELETE /api/chimerax/processes/:id
   */
  terminateProcess: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id;
      const terminated = await chimeraXProcessManager.terminateChimeraXProcess(sessionId);
      
      if (!terminated) {
        return res.status(404).json({
          status: 'error',
          code: 'PROCESS_NOT_FOUND',
          message: `ChimeraX process with ID ${sessionId} not found`,
        });
      }
      
      res.status(200).json({
        status: 'success',
        message: `ChimeraX process with ID ${sessionId} terminated successfully`,
      });
    } catch (error) {
      logger.error(`Error terminating ChimeraX process: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Sends a command to a ChimeraX process
   * POST /api/chimerax/processes/:id/command
   */
  sendCommand: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id;
      const { command } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_COMMAND',
          message: 'Command must be a non-empty string',
        });
      }
      
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);
      
      if (!result.success) {
        return res.status(404).json({
          status: 'error',
          code: 'COMMAND_FAILED',
          message: result.error || 'Failed to execute command',
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: result.data,
      });
    } catch (error) {
      logger.error(`Error sending command to ChimeraX: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Cleans up idle ChimeraX processes
   * POST /api/chimerax/cleanup
   */
  cleanupProcesses: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timeoutMs = req.body.timeoutMs || 30 * 60 * 1000; // Default: 30 minutes
      const terminatedCount = await chimeraXProcessManager.cleanupIdleSessions(timeoutMs);
      
      res.status(200).json({
        status: 'success',
        message: `Cleaned up ${terminatedCount} idle ChimeraX ${terminatedCount === 1 ? 'process' : 'processes'}`,
        data: {
          terminatedCount,
        },
      });
    } catch (error) {
      logger.error(`Error cleaning up ChimeraX processes: ${(error as Error).message}`);
      next(error);
    }
  },
};

export default chimeraxController;