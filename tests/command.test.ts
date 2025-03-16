import request from 'supertest';
import express from 'express';
import commandRoutes from '../src/server/routes/commandRoutes';
import commandService from '../src/server/services/command';
import { ChimeraXCommandResult } from '../src/server/types/chimerax';
import { authMiddleware, sessionAuthMiddleware } from '../src/server/middlewares/auth';

// Mock dependencies
jest.mock('../src/server/services/command');
jest.mock('../src/server/middlewares/auth', () => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  sessionAuthMiddleware: jest.fn((req, res, next) => next())
}));

describe('Command API', () => {
  let app: express.Application;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create Express app with command routes
    app = express();
    app.use(express.json());
    app.use('/api', commandRoutes);
  });
  
  describe('POST /api/sessions/:sessionId/commands', () => {
    it('should execute a command successfully', async () => {
      // Mock successful command execution
      const mockResult: ChimeraXCommandResult = {
        success: true,
        data: { result: 'Command executed successfully' }
      };
      
      (commandService.executeCommand as jest.Mock).mockResolvedValue(mockResult);
      
      // Send request
      const response = await request(app)
        .post('/api/sessions/test-session/commands')
        .send({ command: 'open 1abc', options: { timeout: 5000 } });
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      
      // Assert service call
      expect(commandService.executeCommand).toHaveBeenCalledWith('test-session', 'open 1abc');
    });
    
    it('should return 400 if command is missing', async () => {
      // Send request without command
      const response = await request(app)
        .post('/api/sessions/test-session/commands')
        .send({ options: { timeout: 5000 } });
      
      // Assert response
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Command is required');
      
      // Assert service not called
      expect(commandService.executeCommand).not.toHaveBeenCalled();
    });
    
    it('should handle command execution error', async () => {
      // Mock failed command execution
      const mockError: ChimeraXCommandResult = {
        success: false,
        error: 'Command execution failed'
      };
      
      (commandService.executeCommand as jest.Mock).mockResolvedValue(mockError);
      
      // Send request
      const response = await request(app)
        .post('/api/sessions/test-session/commands')
        .send({ command: 'invalid command' });
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockError);
      
      // Assert service call
      expect(commandService.executeCommand).toHaveBeenCalledWith('test-session', 'invalid command');
    });
  });
  
  describe('POST /api/sessions/:sessionId/command-sequence', () => {
    it('should execute a command sequence successfully', async () => {
      // Mock successful command sequence execution
      const mockResults: ChimeraXCommandResult[] = [
        { success: true, data: { result: 'Command 1 executed' } },
        { success: true, data: { result: 'Command 2 executed' } }
      ];
      
      (commandService.executeCommandSequence as jest.Mock).mockResolvedValue(mockResults);
      
      // Send request
      const response = await request(app)
        .post('/api/sessions/test-session/command-sequence')
        .send({ commands: ['open 1abc', 'cartoon'], options: { timeout: 5000 } });
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      
      // Assert service call
      expect(commandService.executeCommandSequence).toHaveBeenCalledWith(
        'test-session',
        ['open 1abc', 'cartoon']
      );
    });
    
    it('should return 400 if commands array is missing or empty', async () => {
      // Send request without commands
      const response = await request(app)
        .post('/api/sessions/test-session/command-sequence')
        .send({ options: { timeout: 5000 } });
      
      // Assert response
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Valid commands array is required');
      
      // Assert service not called
      expect(commandService.executeCommandSequence).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/sessions/:sessionId/commands', () => {
    it('should get command history successfully', async () => {
      // Mock command history
      const mockHistory = [
        {
          id: '1',
          sessionId: 'test-session',
          command: 'open 1abc',
          result: { success: true, data: {} },
          timestamp: new Date(),
          executionTimeMs: 500
        },
        {
          id: '2',
          sessionId: 'test-session',
          command: 'cartoon',
          result: { success: true, data: {} },
          timestamp: new Date(),
          executionTimeMs: 200
        }
      ];
      
      (commandService.getCommandHistory as jest.Mock).mockReturnValue(mockHistory);
      
      // Send request
      const response = await request(app)
        .get('/api/sessions/test-session/commands?limit=10&offset=0');
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.history).toEqual(mockHistory);
      
      // Assert service call
      expect(commandService.getCommandHistory).toHaveBeenCalledWith('test-session', 10, 0);
    });
  });
  
  describe('DELETE /api/sessions/:sessionId/commands', () => {
    it('should clear command history successfully', async () => {
      // Mock successful clear
      (commandService.clearCommandHistory as jest.Mock).mockReturnValue(true);
      
      // Send request
      const response = await request(app)
        .delete('/api/sessions/test-session/commands');
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Command history cleared');
      
      // Assert service call
      expect(commandService.clearCommandHistory).toHaveBeenCalledWith('test-session');
    });
    
    it('should return 404 if session not found', async () => {
      // Mock session not found
      (commandService.clearCommandHistory as jest.Mock).mockReturnValue(false);
      
      // Send request
      const response = await request(app)
        .delete('/api/sessions/nonexistent-session/commands');
      
      // Assert response
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Session not found');
      
      // Assert service call
      expect(commandService.clearCommandHistory).toHaveBeenCalledWith('nonexistent-session');
    });
  });
  
  describe('GET /api/commands/help', () => {
    it('should get command documentation successfully', async () => {
      // Mock command documentation
      const mockCommands = [
        {
          name: 'open',
          synopsis: 'Open molecular structure files',
          description: 'Opens molecular structure files in various formats',
          category: 'io'
        }
      ];
      
      (commandService.getCommandDocs as jest.Mock).mockReturnValue(mockCommands);
      
      // Send request
      const response = await request(app)
        .get('/api/commands/help?category=io&search=open');
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.commands).toEqual(mockCommands);
      
      // Assert service call
      expect(commandService.getCommandDocs).toHaveBeenCalledWith('io', 'open');
    });
  });
  
  describe('GET /api/commands/help/:commandName', () => {
    it('should get documentation for a specific command', async () => {
      // Mock command documentation
      const mockCommand = {
        name: 'open',
        synopsis: 'Open molecular structure files',
        description: 'Opens molecular structure files in various formats',
        category: 'io'
      };
      
      (commandService.getCommandDoc as jest.Mock).mockReturnValue(mockCommand);
      
      // Send request
      const response = await request(app)
        .get('/api/commands/help/open');
      
      // Assert response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.command).toEqual(mockCommand);
      
      // Assert service call
      expect(commandService.getCommandDoc).toHaveBeenCalledWith('open');
    });
    
    it('should return 404 if command not found', async () => {
      // Mock command not found
      (commandService.getCommandDoc as jest.Mock).mockReturnValue(null);
      
      // Send request
      const response = await request(app)
        .get('/api/commands/help/nonexistent');
      
      // Assert response
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Command not found');
      
      // Assert service call
      expect(commandService.getCommandDoc).toHaveBeenCalledWith('nonexistent');
    });
  });
});