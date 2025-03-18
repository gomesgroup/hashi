import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ChimeraXEnvironment } from '../mocks/chimeraxMock';
import path from 'path';
import fs from 'fs';

// Mock dependencies
jest.mock('child_process');
jest.mock('node-fetch');
jest.mock('fs');
jest.mock('../../src/server/utils/logger');
jest.mock('../../src/server/services/ChimeraXProcessManager');
jest.mock('../../src/server/services/snapshot');
jest.mock('../../src/server/services/session');
jest.mock('../../src/server/services/renderingQueue');

// Import under test
import { chimeraxController } from '../../src/server/controllers/chimeraxController';

describe('ChimeraX API Integration Tests', () => {
  let app: express.Application;
  let mockProcess: any;
  let mockSnapshot: any;
  let mockSession: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock data
    mockProcess = {
      id: 'test-session-id',
      port: 6100,
      pid: 12345,
      status: 'running',
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    mockSnapshot = {
      id: 'snapshot-id',
      sessionId: 'test-session-id',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      parameters: { width: 800, height: 600 },
      url: '/api/sessions/test-session-id/snapshots/snapshot-id/file',
    };
    
    mockSession = {
      id: 'test-session-id',
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    // Mock ChimeraXProcessManager
    const chimeraXProcessManager = jest.requireMock('../../src/server/services/ChimeraXProcessManager').default;
    chimeraXProcessManager.spawnChimeraXProcess = jest.fn().mockResolvedValue(mockProcess);
    chimeraXProcessManager.getAllProcesses = jest.fn().mockReturnValue([mockProcess]);
    chimeraXProcessManager.getChimeraXProcess = jest.fn().mockReturnValue(mockProcess);
    chimeraXProcessManager.terminateChimeraXProcess = jest.fn().mockResolvedValue(true);
    chimeraXProcessManager.sendCommand = jest.fn().mockResolvedValue({ 
      success: true, 
      data: { result: 'Success' } 
    });
    chimeraXProcessManager.cleanupIdleSessions = jest.fn().mockResolvedValue(1);
    
    // Mock snapshot service
    const snapshotService = jest.requireMock('../../src/server/services/snapshot').default;
    snapshotService.createSnapshot = jest.fn().mockResolvedValue(mockSnapshot);
    snapshotService.getSnapshot = jest.fn().mockResolvedValue(mockSnapshot);
    snapshotService.getSessionSnapshots = jest.fn().mockResolvedValue([mockSnapshot]);
    snapshotService.getSnapshotFile = jest.fn().mockResolvedValue({
      path: '/path/to/snapshot.png',
      filename: 'snapshot.png',
      mimetype: 'image/png',
      size: 12345,
    });
    
    // Mock session service
    const sessionService = jest.requireMock('../../src/server/services/session').default;
    sessionService.getSession = jest.fn().mockReturnValue(mockSession);
    sessionService.getAllSessions = jest.fn().mockReturnValue([mockSession]);
    sessionService.createSession = jest.fn().mockResolvedValue(mockSession);
    sessionService.terminateSession = jest.fn().mockResolvedValue(true);
    
    // Set up Express app for testing
    app = express();
    app.use(express.json());
    
    // Register routes
    app.post('/api/chimerax/processes', chimeraxController.createProcess);
    app.get('/api/chimerax/processes', chimeraxController.getProcesses);
    app.get('/api/chimerax/processes/:id', chimeraxController.getProcess);
    app.delete('/api/chimerax/processes/:id', chimeraxController.terminateProcess);
    app.post('/api/chimerax/processes/:id/command', chimeraxController.sendCommand);
    app.post('/api/chimerax/cleanup', chimeraxController.cleanupProcesses);
    
    // Add error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({
        status: 'error',
        message: err.message,
      });
    });
  });
  
  describe('ChimeraX Process Management API', () => {
    it('should create a new ChimeraX process', async () => {
      const response = await request(app)
        .post('/api/chimerax/processes')
        .send({ sessionId: 'test-session-id' })
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe('test-session-id');
      expect(response.body.data.pid).toBe(12345);
    });
    
    it('should get all ChimeraX processes', async () => {
      const response = await request(app)
        .get('/api/chimerax/processes')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('test-session-id');
    });
    
    it('should get a specific ChimeraX process', async () => {
      const response = await request(app)
        .get('/api/chimerax/processes/test-session-id')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe('test-session-id');
    });
    
    it('should return 404 for non-existent process', async () => {
      const chimeraXProcessManager = jest.requireMock('../../src/server/services/ChimeraXProcessManager').default;
      chimeraXProcessManager.getChimeraXProcess = jest.fn().mockReturnValue(null);
      
      const response = await request(app)
        .get('/api/chimerax/processes/non-existent')
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PROCESS_NOT_FOUND');
    });
    
    it('should terminate a ChimeraX process', async () => {
      const response = await request(app)
        .delete('/api/chimerax/processes/test-session-id')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('terminated successfully');
    });
    
    it('should clean up idle processes', async () => {
      const response = await request(app)
        .post('/api/chimerax/cleanup')
        .send({ timeoutMs: 60000 })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.terminatedCount).toBe(1);
    });
  });
  
  describe('ChimeraX Command API', () => {
    it('should send a command to ChimeraX', async () => {
      const response = await request(app)
        .post('/api/chimerax/processes/test-session-id/command')
        .send({ command: 'open 1ubq' })
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
    
    it('should return 400 for invalid command', async () => {
      const response = await request(app)
        .post('/api/chimerax/processes/test-session-id/command')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_COMMAND');
    });
    
    it('should return error when command execution fails', async () => {
      const chimeraXProcessManager = jest.requireMock('../../src/server/services/ChimeraXProcessManager').default;
      chimeraXProcessManager.sendCommand = jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Command failed' 
      });
      
      const response = await request(app)
        .post('/api/chimerax/processes/test-session-id/command')
        .send({ command: 'invalid command' })
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('COMMAND_FAILED');
    });
    
    it('should handle OSMesa errors properly', async () => {
      const chimeraXProcessManager = jest.requireMock('../../src/server/services/ChimeraXProcessManager').default;
      chimeraXProcessManager.sendCommand = jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Unable to save images because OpenGL rendering is not available' 
      });
      
      const response = await request(app)
        .post('/api/chimerax/processes/test-session-id/command')
        .send({ command: 'save snapshot.png' })
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('OpenGL rendering is not available');
    });
  });
});