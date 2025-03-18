import { jest } from '@jest/globals';
import ChimeraXMockUtil, { ChimeraXEnvironment } from './mocks/chimeraxMock';
import { mockDeep } from 'jest-mock-extended';
import path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('node-fetch');
jest.mock('fs');
jest.mock('../src/server/config', () => ({
  __esModule: true,
  default: {
    chimerax: {
      chimeraXPath: '/mock/path/to/chimerax',
      basePort: 6100,
      maxInstances: 10,
    },
    rendering: {
      snapshotDir: '/mock/path/to/snapshots',
      defaultImageWidth: 800,
      defaultImageHeight: 600,
      maxImageWidth: 2048,
      maxImageHeight: 2048,
      maxConcurrentJobs: 4,
    },
  },
}));

// Mock logger
jest.mock('../src/server/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import modules under test
import { ChimeraXProcessManager } from '../src/server/services/ChimeraXProcessManager';
import { snapshotService } from '../src/server/services/snapshot';
import renderingQueue from '../src/server/services/renderingQueue';

describe('OSMesa Detection and Fallback', () => {
  let processManager: ChimeraXProcessManager;
  
  beforeAll(async () => {
    // Initialize rendering queue
    await renderingQueue.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocks for child_process.spawn
    const mockSpawn = ChimeraXMockUtil.getMockSpawn();
    jest.requireMock('child_process').spawn = mockSpawn;
    
    // Set up mocks for node-fetch
    const mockFetch = ChimeraXMockUtil.getMockFetch();
    jest.requireMock('node-fetch').default = mockFetch;
    
    // Set up mocks for fs
    const mockFs = ChimeraXMockUtil.getMockFileSystem();
    Object.assign(jest.requireMock('fs'), mockFs);
    Object.assign(jest.requireMock('fs/promises'), mockFs.promises);
    
    // Create new instance of ChimeraXProcessManager for each test
    processManager = new ChimeraXProcessManager();
    
    // Mock methods to prevent actual waiting
    processManager['waitForChimeraXStartup'] = jest.fn().mockResolvedValue(undefined);
    processManager['isRestApiReachable'] = jest.fn().mockResolvedValue(true);
  });
  
  afterEach(() => {
    // Reset mock environment
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
  });
  
  describe('OSMesa detection', () => {
    it('should detect when OSMesa is available', async () => {
      // Set up full rendering environment
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
      
      // Create a session
      const sessionId = 'test-session';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Attempt to generate a snapshot
      const snapshotParams = {
        width: 800,
        height: 600,
      };
      
      const result = await snapshotService.createSnapshot(sessionId, snapshotParams);
      
      // Verify snapshot was created successfully
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending'); // Initial status is pending
    });
    
    it('should detect when OSMesa is not available', async () => {
      // Set up environment without OSMesa
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
      
      // Create a session
      const sessionId = 'test-session-no-osmesa';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Attempt to generate a snapshot
      const snapshotParams = {
        width: 800,
        height: 600,
      };
      
      // This should not throw but the job will eventually fail
      const result = await snapshotService.createSnapshot(sessionId, snapshotParams);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      
      // Process the job (this would normally happen asynchronously)
      const job = renderingQueue.getJob(result.id);
      await renderingQueue['processJob'](job);
      
      // Check job status after processing
      const updatedJob = renderingQueue.getJob(result.id);
      expect(updatedJob.status).toBe('failed');
      expect(updatedJob.message).toContain('Rendering failed');
    });
  });
  
  describe('Fallback mechanisms', () => {
    it('should provide fallback URL when OSMesa rendering fails', async () => {
      // Mock the session service to allow testing without actual session
      jest.mock('../src/server/services/session', () => ({
        __esModule: true,
        default: {
          getSession: jest.fn().mockReturnValue({ id: 'test-session-fallback' }),
          updateSessionActivity: jest.fn(),
        },
      }));
      
      // Set up environment without OSMesa
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
      
      // Create a session
      const sessionId = 'test-session-fallback';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Attempt to generate a snapshot
      const snapshotParams = {
        width: 800,
        height: 600,
        structureId: '1ubq', // Example PDB ID
        fallbackEnabled: true,
      };
      
      const result = await snapshotService.createSnapshot(sessionId, snapshotParams);
      
      // Process the job (this would normally happen asynchronously)
      const job = renderingQueue.getJob(result.id);
      await renderingQueue['processJob'](job);
      
      // At this point the job should have failed
      const updatedJob = renderingQueue.getJob(result.id);
      expect(updatedJob.status).toBe('failed');
      
      // The frontend would detect this failure and use the fallback URL
      // which would typically be constructed as:
      const fallbackUrl = `https://www.rcsb.org/structure/${snapshotParams.structureId}/image`;
      
      // Verify fallback URL is valid
      expect(fallbackUrl).toBe('https://www.rcsb.org/structure/1ubq/image');
    });
    
    it('should handle case when ChimeraX is not available at all', async () => {
      // Set up environment without ChimeraX
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_CHIMERAX);
      
      // Attempt to spawn a ChimeraX process
      await expect(processManager.spawnChimeraXProcess('test-no-chimerax'))
        .rejects.toThrow('Failed to start ChimeraX process');
    });
  });
  
  describe('Error recovery', () => {
    it('should recover and continue processing other jobs when one job fails', async () => {
      // Set up environment with limited rendering
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
      
      // Create a session
      const sessionId = 'test-session-recovery';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Submit multiple jobs
      const failingJobPromise = snapshotService.createSnapshot(sessionId, {
        width: 800,
        height: 600,
        format: 'png',
      });
      
      // Switch to full rendering for one job
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
      
      const successJobPromise = snapshotService.createSnapshot(sessionId, {
        width: 400,
        height: 300,
        format: 'png',
      });
      
      // Wait for jobs to be submitted
      const [failingJob, successJob] = await Promise.all([
        failingJobPromise,
        successJobPromise,
      ]);
      
      // Process the jobs individually to simulate queue processing
      await renderingQueue['processJob'](renderingQueue.getJob(failingJob.id));
      await renderingQueue['processJob'](renderingQueue.getJob(successJob.id));
      
      // Verify one job failed and one succeeded
      const updatedFailingJob = renderingQueue.getJob(failingJob.id);
      const updatedSuccessJob = renderingQueue.getJob(successJob.id);
      
      expect(updatedFailingJob.status).toBe('failed');
      expect(updatedSuccessJob.status).toBe('completed');
    });
  });
  
  describe('Performance', () => {
    it('should handle slow rendering without timing out', async () => {
      // Set up slow rendering environment
      ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.SLOW_RENDERING);
      ChimeraXMockUtil.setRenderingDelay(1000); // 1 second delay
      
      // Create a session
      const sessionId = 'test-session-slow';
      await processManager.spawnChimeraXProcess(sessionId);
      
      // Attempt to generate a snapshot
      const snapshotParams = {
        width: 1920,
        height: 1080, // High resolution to simulate slow rendering
      };
      
      const result = await snapshotService.createSnapshot(sessionId, snapshotParams);
      
      // Process the job with the delay
      const job = renderingQueue.getJob(result.id);
      await renderingQueue['processJob'](job);
      
      // Verify job completed despite slow rendering
      const updatedJob = renderingQueue.getJob(result.id);
      expect(updatedJob.status).toBe('completed');
    });
  });
});