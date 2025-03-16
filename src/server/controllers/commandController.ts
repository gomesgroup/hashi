import { Request, Response } from 'express';
import commandService from '../services/command';
import logger from '../utils/logger';
import { ValidationError } from '../middlewares/errorHandler';

/**
 * Command Controller
 * 
 * Handles ChimeraX command-related HTTP requests
 */
export class CommandController {
  /**
   * Execute a command in a ChimeraX session
   * @param req Express request
   * @param res Express response
   */
  public async executeCommand(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { command, options } = req.body;
      
      // Validate input
      if (!command) {
        throw new ValidationError('Command is required');
      }
      
      // Extract timeout option if provided
      const timeout = options?.timeout || 30000; // Default timeout: 30 seconds
      
      // Set timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command execution timed out')), timeout);
      });
      
      // Execute command with timeout
      const resultPromise = commandService.executeCommand(sessionId, command);
      const result = await Promise.race([resultPromise, timeoutPromise]);
      
      res.status(200).json(result);
    } catch (error) {
      logger.error(`Error executing command: ${(error as Error).message}`);
      
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    }
  }

  /**
   * Execute multiple commands in sequence
   * @param req Express request
   * @param res Express response
   */
  public async executeCommandSequence(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { commands, options } = req.body;
      
      // Validate input
      if (!commands || !Array.isArray(commands) || commands.length === 0) {
        throw new ValidationError('Valid commands array is required');
      }
      
      // Execute command sequence
      const results = await commandService.executeCommandSequence(sessionId, commands);
      
      res.status(200).json(results);
    } catch (error) {
      logger.error(`Error executing command sequence: ${(error as Error).message}`);
      
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    }
  }

  /**
   * Get command history for a session
   * @param req Express request
   * @param res Express response
   */
  public async getCommandHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Extract pagination parameters
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get command history
      const history = commandService.getCommandHistory(sessionId, limit, offset);
      
      res.status(200).json({ success: true, history });
    } catch (error) {
      logger.error(`Error getting command history: ${(error as Error).message}`);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Clear command history for a session
   * @param req Express request
   * @param res Express response
   */
  public async clearCommandHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Clear command history
      const success = commandService.clearCommandHistory(sessionId);
      
      if (success) {
        res.status(200).json({ success: true, message: 'Command history cleared' });
      } else {
        res.status(404).json({ success: false, error: 'Session not found' });
      }
    } catch (error) {
      logger.error(`Error clearing command history: ${(error as Error).message}`);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get command documentation
   * @param req Express request
   * @param res Express response
   */
  public async getCommandDocs(req: Request, res: Response): Promise<void> {
    try {
      // Extract filter parameters
      const category = req.query.category as string;
      const searchTerm = req.query.search as string;
      
      // Get command documentation
      const commands = commandService.getCommandDocs(category, searchTerm);
      
      res.status(200).json({ success: true, commands });
    } catch (error) {
      logger.error(`Error getting command documentation: ${(error as Error).message}`);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get documentation for a specific command
   * @param req Express request
   * @param res Express response
   */
  public async getCommandDoc(req: Request, res: Response): Promise<void> {
    try {
      const { commandName } = req.params;
      
      // Get command documentation
      const command = commandService.getCommandDoc(commandName);
      
      if (command) {
        res.status(200).json({ success: true, command });
      } else {
        res.status(404).json({ success: false, error: 'Command not found' });
      }
    } catch (error) {
      logger.error(`Error getting command documentation: ${(error as Error).message}`);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// Export singleton instance
export const commandController = new CommandController();
export default commandController;