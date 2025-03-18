import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { RenderingJobStatus, ImageFormat } from '../../src/server/types/rendering';

/**
 * Mock ChimeraX environment types
 */
export enum ChimeraXEnvironment {
  FULL_RENDERING = 'full_rendering',
  NO_OSMESA = 'no_osmesa',
  NO_CHIMERAX = 'no_chimerax',
  SLOW_RENDERING = 'slow_rendering',
  COMMAND_ERROR = 'command_error'
}

/**
 * ChimeraX Mock Utilities
 * 
 * Provides mock implementations for testing ChimeraX integration
 */
export class ChimeraXMockUtil {
  private static environment: ChimeraXEnvironment = ChimeraXEnvironment.FULL_RENDERING;
  private static mockChildProcess: any = null;
  private static delayMs: number = 100;
  
  /**
   * Set the mock environment for testing
   * @param environment Environment type
   */
  public static setEnvironment(environment: ChimeraXEnvironment): void {
    this.environment = environment;
  }
  
  /**
   * Set the rendering delay time to simulate performance
   * @param delayMs Delay in milliseconds
   */
  public static setRenderingDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }
  
  /**
   * Create a mock of the child_process.spawn function
   * @returns Mock spawn function
   */
  public static getMockSpawn(): jest.Mock {
    return jest.fn().mockImplementation((command: string, args: string[]) => {
      if (this.environment === ChimeraXEnvironment.NO_CHIMERAX) {
        // Simulate ChimeraX not found
        const error = new Error('ENOENT');
        error.name = 'Error';
        error.message = `spawn ${command} ENOENT`;
        (error as any).path = command;
        (error as any).syscall = 'spawn ' + command;
        (error as any).code = 'ENOENT';
        
        // Use nextTick to simulate async error
        process.nextTick(() => {
          const mockSpawn = this.mockChildProcess;
          mockSpawn.emit('error', error);
        });
      }
      
      // Create mock process
      const mockProcess = new EventEmitter();
      mockProcess.pid = 12345;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn(() => true);
      
      // Store reference for later events
      this.mockChildProcess = mockProcess;
      
      // Simulate startup
      setTimeout(() => {
        if (this.environment !== ChimeraXEnvironment.NO_CHIMERAX) {
          mockProcess.stdout.emit('data', 'ChimeraX version 1.5');
          mockProcess.stdout.emit('data', 'ChimeraX initialized');
        }
      }, 10);
      
      return mockProcess;
    });
  }
  
  /**
   * Create a mock for testing REST API success/failure
   * @returns Mock fetch function
   */
  public static getMockFetch(): jest.Mock {
    return jest.fn().mockImplementation((url: string, options: any) => {
      // Handle different environments
      switch (this.environment) {
        case ChimeraXEnvironment.NO_OSMESA:
          if (url.includes('/snapshot') || url.includes('save')) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({
                status: 'error',
                message: 'Unable to save images because OpenGL rendering is not available',
                errorCode: 'NO_OSMESA'
              })
            });
          }
          break;
          
        case ChimeraXEnvironment.COMMAND_ERROR:
          if (url.includes('/command')) {
            return Promise.resolve({
              ok: false,
              status: 400,
              json: () => Promise.resolve({
                status: 'error',
                message: 'Invalid command format',
                errorCode: 'INVALID_COMMAND'
              })
            });
          }
          break;
          
        case ChimeraXEnvironment.SLOW_RENDERING:
          if (url.includes('/snapshot')) {
            // Simulate slow rendering
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: () => Promise.resolve({
                    status: 'success',
                    message: 'Snapshot generated',
                    data: {
                      filePath: '/mock/path/to/snapshot.png',
                      width: 800,
                      height: 600
                    }
                  })
                });
              }, this.delayMs);
            });
          }
          break;
      }
      
      // Default success response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          message: 'Command executed successfully',
          data: { result: 'Success' }
        })
      });
    });
  }
  
  /**
   * Create a mock file system with testing utilities
   * @returns Mock fs functions
   */
  public static getMockFileSystem() {
    // Create a memory-based mock file system
    const mockFiles: Record<string, Buffer> = {};
    
    return {
      promises: {
        mkdir: jest.fn().mockImplementation((dir: string) => {
          return Promise.resolve();
        }),
        
        writeFile: jest.fn().mockImplementation((path: string, data: any) => {
          mockFiles[path] = Buffer.from(data);
          return Promise.resolve();
        }),
        
        readFile: jest.fn().mockImplementation((path: string) => {
          if (mockFiles[path]) {
            return Promise.resolve(mockFiles[path]);
          }
          return Promise.reject(new Error('ENOENT: File not found'));
        }),
        
        unlink: jest.fn().mockImplementation((path: string) => {
          if (mockFiles[path]) {
            delete mockFiles[path];
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT: File not found'));
        }),
        
        stat: jest.fn().mockImplementation((path: string) => {
          if (mockFiles[path]) {
            return Promise.resolve({
              size: mockFiles[path].length,
              isFile: () => true,
              isDirectory: () => false
            });
          }
          
          // In NO_OSMESA mode, simulate file not created
          if (this.environment === ChimeraXEnvironment.NO_OSMESA && path.includes('snapshot')) {
            return Promise.reject(new Error('ENOENT: File not found'));
          }
          
          return Promise.resolve({
            size: 12345,
            isFile: () => true,
            isDirectory: () => false
          });
        })
      },
      
      existsSync: jest.fn().mockImplementation((path: string) => {
        return !!mockFiles[path] || path.includes('fixtures');
      }),
      
      createReadStream: jest.fn().mockImplementation((path: string) => {
        const mockStream = new EventEmitter();
        
        setTimeout(() => {
          if (mockFiles[path]) {
            mockStream.emit('data', mockFiles[path]);
            mockStream.emit('end');
          } else {
            mockStream.emit('error', new Error('ENOENT: File not found'));
          }
        }, 10);
        
        return mockStream;
      })
    };
  }
  
  /**
   * Create a placeholder snapshot image for testing
   * @param format Image format
   * @returns Buffer containing image data
   */
  public static createPlaceholderImage(format: ImageFormat = ImageFormat.PNG): Buffer {
    // For testing purposes, just create a small buffer
    // In a real implementation, this would generate actual image data
    return Buffer.from('Mock image data for testing');
  }
  
  /**
   * Create a snapshot directory for testing
   * @param sessionId Session ID
   * @returns Directory path
   */
  public static createSnapshotDir(sessionId: string): string {
    return path.join('tests', 'fixtures', 'snapshots', sessionId);
  }
  
  /**
   * Generate a mock rendering job
   * @param jobId Job ID
   * @param sessionId Session ID
   * @param status Job status
   * @returns Mock rendering job
   */
  public static createMockRenderingJob(
    jobId: string,
    sessionId: string,
    status: RenderingJobStatus = RenderingJobStatus.COMPLETED
  ): any {
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    
    return {
      id: jobId,
      sessionId,
      parameters: {
        width: 800,
        height: 600,
        format: ImageFormat.PNG
      },
      status,
      message: status === RenderingJobStatus.FAILED ? 'Rendering failed' : undefined,
      createdAt: tenSecondsAgo,
      updatedAt: now,
      completedAt: status === RenderingJobStatus.COMPLETED ? now : undefined,
      filePath: status === RenderingJobStatus.COMPLETED ? 
        path.join(this.createSnapshotDir(sessionId), `${jobId}.png`) : undefined,
      fileSize: status === RenderingJobStatus.COMPLETED ? 12345 : undefined,
      priority: 1
    };
  }
}

// Export singleton for easier usage
export default ChimeraXMockUtil;