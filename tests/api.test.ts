import request from 'supertest';
import app from '../src/server/index';

describe('API Endpoints', () => {
  describe('Health Check', () => {
    it('should return 200 OK with status success', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Server is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Version', () => {
    it('should return 200 OK with version information', async () => {
      const res = await request(app).get('/api/version');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.version).toBeDefined();
    });
  });

  describe('Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Not Found');
    });
  });
});
