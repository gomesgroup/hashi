import request from 'supertest';
import app from '../src/server/index';
import sessionService from '../src/server/services/session';
import chimeraxService from '../src/server/services/chimerax';

// Mock the ChimeraX service
jest.mock('../src/server/services/chimerax', () => ({
  spawnChimeraX: jest.fn().mockResolvedValue({
    pid: 12345,
    port: 6100,
    process: {},
    status: 'ready',
    sessionId: 'test-session-id',
    startTime: new Date(),
    lastActivity: new Date()
  }),
  terminateChimeraX: jest.fn().mockResolvedValue(true),
  updateActivity: jest.fn(),
  checkChimeraXInstallation: jest.fn().mockResolvedValue(true),
  getChimeraXProcess: jest.fn(),
  getAllProcesses: jest.fn().mockReturnValue(new Map()),
  cleanupIdleProcesses: jest.fn()
}));

describe('Session Routes', () => {
  // Set up the test user ID
  const testUserId = '123';
  let sessionId: string;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('x-user-id', testUserId)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.id).toBeDefined();
      expect(res.body.data.session.status).toBeDefined();
      expect(res.body.data.session.port).toBeDefined();

      // Save the session ID for later tests
      sessionId = res.body.data.session.id;

      // Verify ChimeraX service was called
      expect(chimeraxService.spawnChimeraX).toHaveBeenCalled();
    });

    it('should return 401 if no user ID is provided', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should get a session by ID', async () => {
      // First create a session to get an ID
      const createRes = await request(app)
        .post('/api/sessions')
        .set('x-user-id', testUserId)
        .send({});
      
      sessionId = createRes.body.data.session.id;

      // Now get the session
      const res = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('x-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.id).toBe(sessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/sessions/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', testUserId);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/sessions/:id/heartbeat', () => {
    it('should update session activity', async () => {
      // First create a session to get an ID
      const createRes = await request(app)
        .post('/api/sessions')
        .set('x-user-id', testUserId)
        .send({});
      
      sessionId = createRes.body.data.session.id;

      // Now send heartbeat
      const res = await request(app)
        .put(`/api/sessions/${sessionId}/heartbeat`)
        .set('x-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.id).toBe(sessionId);
      
      // Verify ChimeraX service was called
      expect(chimeraxService.updateActivity).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should terminate a session', async () => {
      // First create a session to get an ID
      const createRes = await request(app)
        .post('/api/sessions')
        .set('x-user-id', testUserId)
        .send({});
      
      sessionId = createRes.body.data.session.id;

      // Now terminate it
      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('x-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Session terminated successfully');
      
      // Verify ChimeraX service was called
      expect(chimeraxService.terminateChimeraX).toHaveBeenCalledWith(sessionId);
    });
  });
});