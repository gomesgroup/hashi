import request from 'supertest';
import app from '../src/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import snapshotService from '../src/server/services/snapshot';
import renderingQueue from '../src/server/services/renderingQueue';
import sessionService from '../src/server/services/session';

// Mock dependencies
jest.mock('../src/server/services/snapshot');
jest.mock('../src/server/services/renderingQueue');
jest.mock('../src/server/services/session');
jest.mock('../src/server/middlewares/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => next(),
  sessionAuthMiddleware: (req: any, res: any, next: any) => next(),
}));

describe('Snapshot API', () => {
  const mockSessionId = uuidv4();
  const mockSnapshotId = uuidv4();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock sessionService.getSession
    (sessionService.getSession as jest.Mock).mockImplementation((sessionId) => {
      if (sessionId === mockSessionId) {
        return {
          id: mockSessionId,
          created: new Date(),
          lastActive: new Date(),
          port: 6100,
          status: 'ready',
        };
      }
      return null;
    });
  });
  
  describe('POST /api/sessions/:sessionId/snapshots', () => {
    it('should create a new snapshot', async () => {
      const mockSnapshot = {
        id: mockSnapshotId,
        sessionId: mockSessionId,
        parameters: { width: 800, height: 600 },
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      (snapshotService.createSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
      
      const response = await request(app)
        .post(`/api/sessions/${mockSessionId}/snapshots`)
        .send({ width: 800, height: 600 })
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockSnapshot);
      expect(snapshotService.createSnapshot).toHaveBeenCalledWith(
        mockSessionId,
        { width: 800, height: 600 }
      );
    });
    
    it('should return 404 for invalid session', async () => {
      (snapshotService.createSnapshot as jest.Mock).mockRejectedValue(
        new Error('Session not found: invalidSession')
      );
      
      await request(app)
        .post('/api/sessions/invalidSession/snapshots')
        .send({ width: 800, height: 600 })
        .expect(404);
    });
  });
  
  describe('GET /api/sessions/:sessionId/snapshots/:snapshotId', () => {
    it('should return snapshot metadata', async () => {
      const mockSnapshot = {
        id: mockSnapshotId,
        sessionId: mockSessionId,
        parameters: { width: 800, height: 600 },
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        fileSize: 12345,
        url: `/api/sessions/${mockSessionId}/snapshots/${mockSnapshotId}/file`,
      };
      
      (snapshotService.getSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
      
      const response = await request(app)
        .get(`/api/sessions/${mockSessionId}/snapshots/${mockSnapshotId}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockSnapshot);
      expect(snapshotService.getSnapshot).toHaveBeenCalledWith(
        mockSessionId,
        mockSnapshotId
      );
    });
    
    it('should return 404 for unknown snapshot', async () => {
      (snapshotService.getSnapshot as jest.Mock).mockRejectedValue(
        new Error('Snapshot not found: unknownSnapshot')
      );
      
      await request(app)
        .get(`/api/sessions/${mockSessionId}/snapshots/unknownSnapshot`)
        .expect(404);
    });
  });
  
  describe('GET /api/sessions/:sessionId/snapshots', () => {
    it('should return all snapshots for session', async () => {
      const mockSnapshots = [
        {
          id: mockSnapshotId,
          sessionId: mockSessionId,
          parameters: { width: 800, height: 600 },
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          fileSize: 12345,
          url: `/api/sessions/${mockSessionId}/snapshots/${mockSnapshotId}/file`,
        },
        {
          id: uuidv4(),
          sessionId: mockSessionId,
          parameters: { width: 400, height: 300 },
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      (snapshotService.getSessionSnapshots as jest.Mock).mockResolvedValue(mockSnapshots);
      
      const response = await request(app)
        .get(`/api/sessions/${mockSessionId}/snapshots`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockSnapshots);
      expect(snapshotService.getSessionSnapshots).toHaveBeenCalledWith(mockSessionId);
    });
  });
  
  describe('DELETE /api/sessions/:sessionId/snapshots/:snapshotId', () => {
    it('should delete a snapshot', async () => {
      (snapshotService.deleteSnapshot as jest.Mock).mockResolvedValue(true);
      
      const response = await request(app)
        .delete(`/api/sessions/${mockSessionId}/snapshots/${mockSnapshotId}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted successfully');
      expect(snapshotService.deleteSnapshot).toHaveBeenCalledWith(
        mockSessionId,
        mockSnapshotId
      );
    });
  });
  
  describe('PUT /api/sessions/:sessionId/view', () => {
    it('should update view settings', async () => {
      const viewSettings = {
        camera: { position: [0, 0, 100], target: [0, 0, 0] },
        lighting: { ambientIntensity: 0.5 },
      };
      
      (snapshotService.updateViewSettings as jest.Mock).mockResolvedValue({
        message: 'View settings updated successfully',
      });
      
      const response = await request(app)
        .put(`/api/sessions/${mockSessionId}/view`)
        .send(viewSettings)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('updated successfully');
      expect(snapshotService.updateViewSettings).toHaveBeenCalledWith(
        mockSessionId,
        viewSettings
      );
    });
  });
  
  describe('POST /api/sessions/:sessionId/styles', () => {
    it('should apply styles', async () => {
      const styleSettings = {
        representation: 'cartoon',
        colorScheme: 'chainbows',
      };
      
      (snapshotService.applyStyles as jest.Mock).mockResolvedValue({
        message: 'Styles applied successfully',
      });
      
      const response = await request(app)
        .post(`/api/sessions/${mockSessionId}/styles`)
        .send(styleSettings)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('applied successfully');
      expect(snapshotService.applyStyles).toHaveBeenCalledWith(
        mockSessionId,
        styleSettings
      );
    });
  });
});