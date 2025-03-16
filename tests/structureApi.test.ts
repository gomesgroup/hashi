import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../src/server';
import sessionService from '../src/server/services/session';
import chimeraXProcessManager from '../src/server/services/ChimeraXProcessManager';
import structureService from '../src/server/services/structureService';

// Mock services
jest.mock('../src/server/services/session');
jest.mock('../src/server/services/ChimeraXProcessManager');
jest.mock('../src/server/services/structureService');

describe('Structure Modification API', () => {
  const mockSessionId = uuidv4();
  const mockUserId = 'test-user-1';
  const mockStructureId = '1';
  const mockSelectionName = 'sel1';
  const mockTransactionId = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session validation
    (sessionService.getSession as jest.Mock).mockReturnValue({
      id: mockSessionId,
      created: new Date(),
      lastActive: new Date(),
      port: 8000,
      status: 'ready'
    });

    (sessionService.validateSessionAccess as jest.Mock).mockReturnValue(true);

    // Mock ChimeraX process
    (chimeraXProcessManager.sendCommand as jest.Mock).mockResolvedValue({
      success: true,
      data: {}
    });

    // Mock structure service functions
    (structureService.createSelection as jest.Mock).mockResolvedValue({
      selectionName: mockSelectionName,
      count: 100,
      type: 'atom',
      specifier: 'protein'
    });

    (structureService.modifyAtoms as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Atoms modified successfully'
    });

    (structureService.addAtoms as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Added 2 atoms to structure 1',
      data: {
        addedCount: 2
      }
    });

    (structureService.removeAtoms as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Removed 10 atoms',
      data: {
        removedCount: 10
      }
    });

    (structureService.addBonds as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Added 2 bonds',
      data: {
        addedCount: 2,
        failedCount: 0
      }
    });

    (structureService.removeBonds as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Removed bonds for selection sel1'
    });

    (structureService.applyTransformation as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Applied rotate transformation to sel1'
    });

    (structureService.performMinimization as jest.Mock).mockResolvedValue({
      initialEnergy: 1500.25,
      finalEnergy: 850.75,
      steps: 100,
      converged: true,
      rmsd: 0.45,
      duration: 5250
    });

    (structureService.undoOperation as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Undid operation modifyAtoms',
      data: {
        operation: 'modifyAtoms'
      }
    });

    (structureService.redoOperation as jest.Mock).mockResolvedValue({
      transactionId: mockTransactionId,
      success: true,
      message: 'Redid operation modifyAtoms',
      data: {
        operation: 'modifyAtoms'
      }
    });

    (structureService.getTransactionHistory as jest.Mock).mockReturnValue([
      {
        id: uuidv4(),
        sessionId: mockSessionId,
        timestamp: new Date(),
        operation: 'createSelection',
        parameters: {
          criteria: {
            type: 'atom',
            specifier: 'protein'
          }
        },
        selectionName: mockSelectionName
      }
    ]);
  });

  describe('POST /api/sessions/:sessionId/select', () => {
    it('should create a selection', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/select`)
        .set('x-user-id', mockUserId)
        .send({
          type: 'atom',
          specifier: 'protein',
          options: {
            extend: false,
            invert: false,
            replace: true
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.selectionName).toBe(mockSelectionName);
      expect(res.body.data.count).toBe(100);
      expect(structureService.createSelection).toHaveBeenCalledWith(
        mockSessionId,
        {
          type: 'atom',
          specifier: 'protein',
          options: {
            extend: false,
            invert: false,
            replace: true
          }
        }
      );
    });

    it('should return 400 for invalid selection criteria', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/select`)
        .set('x-user-id', mockUserId)
        .send({
          type: 'invalid',
          specifier: 'protein'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('PUT /api/sessions/:sessionId/structures/:structureId/atoms', () => {
    it('should modify atoms', async () => {
      const res = await request(app)
        .put(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/atoms`)
        .set('x-user-id', mockUserId)
        .send({
          selectionName: mockSelectionName,
          properties: {
            element: 'C',
            position: [10.0, 5.0, 3.5],
            charge: -0.5
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.transactionId).toBe(mockTransactionId);
      expect(structureService.modifyAtoms).toHaveBeenCalledWith(
        mockSessionId,
        {
          element: 'C',
          position: [10.0, 5.0, 3.5],
          charge: -0.5
        },
        mockSelectionName
      );
    });
  });

  describe('POST /api/sessions/:sessionId/structures/:structureId/atoms', () => {
    it('should add atoms', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/atoms`)
        .set('x-user-id', mockUserId)
        .send({
          atoms: [
            {
              element: 'C',
              name: 'C1',
              position: [10.0, 5.0, 3.5]
            },
            {
              element: 'N',
              name: 'N1',
              position: [12.0, 5.0, 3.5]
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.data.addedCount).toBe(2);
      expect(structureService.addAtoms).toHaveBeenCalledWith(
        mockSessionId,
        [
          {
            element: 'C',
            name: 'C1',
            position: [10.0, 5.0, 3.5]
          },
          {
            element: 'N',
            name: 'N1',
            position: [12.0, 5.0, 3.5]
          }
        ],
        mockStructureId
      );
    });
  });

  describe('DELETE /api/sessions/:sessionId/structures/:structureId/atoms', () => {
    it('should remove atoms', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/atoms`)
        .set('x-user-id', mockUserId)
        .send({
          selectionName: mockSelectionName
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.data.removedCount).toBe(10);
      expect(structureService.removeAtoms).toHaveBeenCalledWith(
        mockSessionId,
        mockSelectionName
      );
    });
  });

  describe('POST /api/sessions/:sessionId/structures/:structureId/bonds', () => {
    it('should add bonds', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/bonds`)
        .set('x-user-id', mockUserId)
        .send({
          bonds: [
            {
              atom1: '#1:100@C1',
              atom2: '#1:100@N1',
              order: 1
            },
            {
              atom1: '#1:100@C1',
              atom2: '#1:100@C2',
              order: 2
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.data.addedCount).toBe(2);
      expect(structureService.addBonds).toHaveBeenCalledWith(
        mockSessionId,
        [
          {
            atom1: '#1:100@C1',
            atom2: '#1:100@N1',
            order: 1
          },
          {
            atom1: '#1:100@C1',
            atom2: '#1:100@C2',
            order: 2
          }
        ]
      );
    });
  });

  describe('DELETE /api/sessions/:sessionId/structures/:structureId/bonds', () => {
    it('should remove bonds', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/bonds`)
        .set('x-user-id', mockUserId)
        .send({
          selectionName: mockSelectionName
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(structureService.removeBonds).toHaveBeenCalledWith(
        mockSessionId,
        mockSelectionName
      );
    });
  });

  describe('POST /api/sessions/:sessionId/structures/:structureId/transform', () => {
    it('should apply a transformation', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/transform`)
        .set('x-user-id', mockUserId)
        .send({
          type: 'rotate',
          selectionName: mockSelectionName,
          angle: 45.0,
          axis: [0, 1, 0],
          center: [10, 10, 10]
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(structureService.applyTransformation).toHaveBeenCalledWith(
        mockSessionId,
        {
          type: 'rotate',
          selectionName: mockSelectionName,
          angle: 45.0,
          axis: [0, 1, 0],
          center: [10, 10, 10],
          structureId: mockStructureId
        }
      );
    });
  });

  describe('POST /api/sessions/:sessionId/structures/:structureId/minimize', () => {
    it('should perform energy minimization', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/structures/${mockStructureId}/minimize`)
        .set('x-user-id', mockUserId)
        .send({
          selectionName: mockSelectionName,
          steps: 100,
          algorithm: 'steepest-descent',
          forceField: 'AMBER'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.initialEnergy).toBe(1500.25);
      expect(res.body.data.finalEnergy).toBe(850.75);
      expect(structureService.performMinimization).toHaveBeenCalledWith(
        mockSessionId,
        {
          selectionName: mockSelectionName,
          steps: 100,
          algorithm: 'steepest-descent',
          forceField: 'AMBER',
          structureId: mockStructureId
        }
      );
    });
  });

  describe('POST /api/sessions/:sessionId/undo', () => {
    it('should undo the last operation', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/undo`)
        .set('x-user-id', mockUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.data.operation).toBe('modifyAtoms');
      expect(structureService.undoOperation).toHaveBeenCalledWith(mockSessionId);
    });
  });

  describe('POST /api/sessions/:sessionId/redo', () => {
    it('should redo the last undone operation', async () => {
      const res = await request(app)
        .post(`/api/sessions/${mockSessionId}/redo`)
        .set('x-user-id', mockUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.data.operation).toBe('modifyAtoms');
      expect(structureService.redoOperation).toHaveBeenCalledWith(mockSessionId);
    });
  });

  describe('GET /api/sessions/:sessionId/transactions', () => {
    it('should get transaction history', async () => {
      const res = await request(app)
        .get(`/api/sessions/${mockSessionId}/transactions`)
        .set('x-user-id', mockUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.transactions)).toBe(true);
      expect(res.body.data.transactions.length).toBe(1);
      expect(structureService.getTransactionHistory).toHaveBeenCalledWith(mockSessionId);
    });
  });
});