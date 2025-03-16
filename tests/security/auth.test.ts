import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';

describe('Authentication Security Tests', () => {
  // Test for JWT security
  describe('JWT Token Security', () => {
    test('should reject expired tokens', async () => {
      // Create an expired token
      const payload = {
        userId: '12345',
        email: 'test@example.com',
        role: 'user',
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '0s', // Expired immediately
      });
      
      // Try to access a protected endpoint
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('expired');
    });
    
    test('should reject tokens with invalid signature', async () => {
      // Create a token with wrong signature
      const payload = {
        userId: '12345',
        email: 'test@example.com',
        role: 'user',
      };
      
      const invalidToken = jwt.sign(payload, 'wrong-secret', {
        expiresIn: '1h',
      });
      
      // Try to access a protected endpoint
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invalid');
    });
    
    test('should reject tokens with tampered payload', async () => {
      // Create a valid token
      const payload = {
        userId: '12345',
        email: 'test@example.com',
        role: 'user',
      };
      
      const validToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h',
      });
      
      // Decode token parts
      const parts = validToken.split('.');
      
      // Tamper with the payload (middle part)
      const decodedPayload = Buffer.from(parts[1], 'base64').toString();
      const modifiedPayload = JSON.parse(decodedPayload);
      modifiedPayload.role = 'admin'; // Attempt to escalate privileges
      
      // Rebuild token with tampered payload (without re-signing)
      const tamperedPayloadBase64 = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayloadBase64}.${parts[2]}`;
      
      // Try to access a protected endpoint
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  // Test for authentication bypasses
  describe('Authentication Bypass Prevention', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/sessions');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should reject requests with malformed authentication header', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', 'malformed-token-format');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should reject cross-user resource access attempts', async () => {
      // Setup: Create two users and get their tokens
      const user1Token = await getAuthToken('user1@example.com', 'password1');
      const user2Token = await getAuthToken('user2@example.com', 'password2');
      
      // Create a session for user1
      const sessionResponse = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Security Test Session' });
      
      const sessionId = sessionResponse.body.sessionId;
      
      // Try to access user1's session with user2's token
      const crossAccessResponse = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${user2Token}`);
      
      // Should be rejected with 403 Forbidden
      expect(crossAccessResponse.status).toBe(403);
      expect(crossAccessResponse.body).toHaveProperty('error');
    });
  });
  
  // Helper function to get a valid token for testing
  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    
    return response.body.token;
  }
});