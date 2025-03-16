import { jest } from '@jest/globals';
import { ChimeraXProcessManager } from '../../src/server/services/ChimeraXProcessManager';
import { ChimeraXProcess } from '../../src/server/types/chimerax';
import { EventEmitter } from 'events';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const mockProcess = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn(() => true);
    return mockProcess;
  }),
}));

// Mock fetch module
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ result: 'success' }),
    });
  });
});

// Mock config
jest.mock('../../src/server/config', () => ({
  __esModule: true,
  default: {
    chimerax: {
      chimeraXPath: '/mock/path/to/chimerax',
      basePort: 6100,
      maxInstances: 10,
    },
  },
}));

// Mock logger
jest.mock('../../src/server/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ChimeraXProcessManager', () => {
  let processManager: ChimeraXProcessManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    processManager = new ChimeraXProcessManager();
    
    // Mock waitForChimeraXStartup to avoid actual waiting
    processManager['waitForChimeraXStartup'] = jest.fn().mockResolvedValue(undefined);
    
    // Mock isRestApiReachable
    processManager['isRestApiReachable'] = jest.fn().mockResolvedValue(true);
  });
  
  describe('spawnChimeraXProcess', () => {
    it('should spawn a new ChimeraX process with generated session ID', async () => {
      const process = await processManager.spawnChimeraXProcess();
      
      expect(process).toBeDefined();
      expect(process.id).toBeDefined();
      expect(process.port).toBe(6100);
      expect(process.pid).toBe(12345);
      expect(process.status).toBe('running');
      expect(process.createdAt).toBeInstanceOf(Date);
      expect(process.lastActive).toBeInstanceOf(Date);
    });
    
    it('should spawn a new ChimeraX process with provided session ID', async () => {
      const sessionId = 'test-session-id';
      const process = await processManager.spawnChimeraXProcess(sessionId);
      
      expect(process).toBeDefined();
      expect(process.id).toBe(sessionId);
      expect(process.port).toBe(6100);
      expect(process.pid).toBe(12345);
      expect(process.status).toBe('running');
    });
    
    it('should increment port numbers for subsequent processes', async () => {
      const process1 = await processManager.spawnChimeraXProcess();
      const process2 = await processManager.spawnChimeraXProcess();
      
      expect(process1.port).toBe(6100);
      expect(process2.port).toBe(6101);
    });
    
    it('should throw error if max instances reached', async () => {
      // Override maxInstances for this test
      Object.defineProperty(processManager, 'maxInstances', { value: 2 });
      
      await processManager.spawnChimeraXProcess();
      await processManager.spawnChimeraXProcess();
      
      await expect(processManager.spawnChimeraXProcess()).rejects.toThrow('Maximum number of ChimeraX instances reached');
    });
  });
  
  describe('getChimeraXProcess', () => {
    it('should return process info for valid session ID', async () => {
      const sessionId = 'test-session-id';
      await processManager.spawnChimeraXProcess(sessionId);
      
      const processInfo = processManager.getChimeraXProcess(sessionId);
      
      expect(processInfo).toBeDefined();
      expect(processInfo?.id).toBe(sessionId);
    });
    
    it('should return null for invalid session ID', () => {
      const processInfo = processManager.getChimeraXProcess('non-existent-id');
      
      expect(processInfo).toBeNull();
    });
  });
  
  describe('terminateChimeraXProcess', () => {
    it('should terminate process and return true for valid session ID', async () => {
      const sessionId = 'test-session-id';
      await processManager.spawnChimeraXProcess(sessionId);
      
      const result = await processManager.terminateChimeraXProcess(sessionId);
      
      expect(result).toBe(true);
      // Verify process no longer exists in the manager
      expect(processManager.getChimeraXProcess(sessionId)).toBeNull();
    });
    
    it('should return false for invalid session ID', async () => {
      const result = await processManager.terminateChimeraXProcess('non-existent-id');
      
      expect(result).toBe(false);
    });
  });
  
  describe('sendCommand', () => {
    it('should update last active timestamp and return success for valid session', async () => {
      const sessionId = 'test-session-id';
      await processManager.spawnChimeraXProcess(sessionId);
      
      const before = processManager.getChimeraXProcess(sessionId)?.lastActive;
      
      // Wait a short time to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await processManager.sendCommand(sessionId, 'test command');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
      
      const after = processManager.getChimeraXProcess(sessionId)?.lastActive;
      expect(after).not.toEqual(before);
    });
    
    it('should return error for invalid session ID', async () => {
      const result = await processManager.sendCommand('non-existent-id', 'test command');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });
  
  describe('cleanupIdleSessions', () => {
    it('should terminate idle sessions based on timeout', async () => {
      const sessionId1 = 'active-session';
      const sessionId2 = 'idle-session';
      
      // Create active and idle sessions
      await processManager.spawnChimeraXProcess(sessionId1);
      await processManager.spawnChimeraXProcess(sessionId2);
      
      // Mock lastActive for idle session to be older
      const idleSession = processManager.getChimeraXProcess(sessionId2) as ChimeraXProcess;
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 5);
      idleSession.lastActive = oldDate;
      
      // Cleanup with 1 minute timeout
      const terminatedCount = await processManager.cleanupIdleSessions(60 * 1000);
      
      expect(terminatedCount).toBe(1);
      expect(processManager.getChimeraXProcess(sessionId1)).not.toBeNull();
      expect(processManager.getChimeraXProcess(sessionId2)).toBeNull();
    });
    
    it('should not terminate active sessions', async () => {
      const sessionId = 'active-session';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Cleanup with 30 minute timeout (default)
      const terminatedCount = await processManager.cleanupIdleSessions();
      
      expect(terminatedCount).toBe(0);
      expect(processManager.getChimeraXProcess(sessionId)).not.toBeNull();
    });
  });
  
  describe('getAllProcesses', () => {
    it('should return all active processes', async () => {
      await processManager.spawnChimeraXProcess('session1');
      await processManager.spawnChimeraXProcess('session2');
      
      const processes = processManager.getAllProcesses();
      
      expect(processes.length).toBe(2);
      expect(processes.find(p => p.id === 'session1')).toBeDefined();
      expect(processes.find(p => p.id === 'session2')).toBeDefined();
    });
    
    it('should return empty array when no processes exist', () => {
      const processes = processManager.getAllProcesses();
      
      expect(processes).toEqual([]);
    });
  });
});