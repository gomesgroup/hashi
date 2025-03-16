import request from 'supertest';
import { app } from '../../src/server';

describe('Input Validation Security Tests', () => {
  let authToken: string;
  let sessionId: string;
  
  // Get auth token before tests
  beforeAll(async () => {
    // Register a test user
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePassword123!',
        name: 'Security Tester'
      });
    
    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePassword123!'
      });
    
    authToken = loginResponse.body.token;
    
    // Create a test session
    const sessionResponse = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Security Test Session' });
    
    sessionId = sessionResponse.body.sessionId;
  });
  
  // Test for SQL Injection
  describe('SQL Injection Prevention', () => {
    test('should sanitize SQL injection attempts in query parameters', async () => {
      const injectionAttempt = "1'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/v1/sessions/${injectionAttempt}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Should return 404, not 500
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      // Should not leak database errors to client
      expect(response.body.error).not.toContain('SQL');
      expect(response.body.error).not.toContain('syntax');
    });
    
    test('should sanitize SQL injection attempts in request body', async () => {
      const injectionAttempt = {
        name: "'; DROP TABLE sessions; --",
        description: "Robert'); DROP TABLE users; --"
      };
      
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(injectionAttempt);
      
      // Should either validate the input or handle it safely
      expect(response.status).not.toBe(500);
      
      if (response.status === 400) {
        // Input validation caught it
        expect(response.body).toHaveProperty('error');
      } else if (response.status === 201) {
        // Input was sanitized and created safely
        expect(response.body).toHaveProperty('sessionId');
        
        // Check that the session was created with sanitized data
        const getResponse = await request(app)
          .get(`/api/v1/sessions/${response.body.sessionId}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.name).toBe(injectionAttempt.name);
        // But the data shouldn't contain executable SQL
        expect(getResponse.body.name).not.toContain("DROP TABLE");
      }
    });
  });
  
  // Test for XSS prevention
  describe('XSS Prevention', () => {
    test('should sanitize XSS attempts in input fields', async () => {
      const xssAttempt = {
        name: '<script>alert("XSS")</script>',
        description: '<img src="x" onerror="alert(\'XSS\')">',
      };
      
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssAttempt);
      
      // Should either reject or sanitize
      if (response.status === 400) {
        // Input validation caught it
        expect(response.body).toHaveProperty('error');
      } else if (response.status === 201) {
        // Input was accepted but should be sanitized
        const getResponse = await request(app)
          .get(`/api/v1/sessions/${response.body.sessionId}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(getResponse.status).toBe(200);
        // The response should not contain executable script tags
        expect(getResponse.body.name).not.toContain('<script>');
        expect(getResponse.body.description).not.toContain('onerror=');
      }
    });
  });
  
  // Test for command injection
  describe('Command Injection Prevention', () => {
    test('should prevent command injection in ChimeraX commands', async () => {
      const injectionAttempts = [
        'open 1a3n; rm -rf /',
        'open 1a3n && cat /etc/passwd',
        'open 1a3n | cat /etc/shadow',
        'open 1a3n; ls -la',
        'open $(cat /etc/passwd)',
        'open `cat /etc/passwd`',
      ];
      
      for (const injectionCommand of injectionAttempts) {
        const response = await request(app)
          .post('/api/v1/commands')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: sessionId,
            command: injectionCommand,
          });
        
        // Should reject dangerous commands
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
  
  // Test for path traversal
  describe('Path Traversal Prevention', () => {
    test('should prevent path traversal in file access', async () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\Windows\\System32\\config\\SAM',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
        '....//....//....//etc/passwd', // Nested traversal
      ];
      
      for (const path of traversalAttempts) {
        const response = await request(app)
          .get(`/api/v1/files/${path}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        // Should reject access to paths outside allowed directory
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});