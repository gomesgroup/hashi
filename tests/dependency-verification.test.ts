import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');

describe('Dependency Verification Tests', () => {
  // Mock execSync responses
  const mockExecSync = jest.fn();
  (execSync as jest.MockedFunction<typeof execSync>) = mockExecSync;
  
  // Mock fs functions
  const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
  Object.assign(fs, mockFs);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('ChimeraX Installation Verification', () => {
    it('should detect ChimeraX installation', () => {
      // Mock successful ChimeraX installation
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('chimerax --version')) {
          return Buffer.from('ChimeraX version 1.5.1');
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyChimeraX } = require('../src/scripts/verifyDependencies');
      const result = verifyChimeraX();
      
      expect(result.installed).toBe(true);
      expect(result.version).toBe('1.5.1');
      expect(result.path).toBeDefined();
    });
    
    it('should handle missing ChimeraX installation', () => {
      // Mock missing ChimeraX installation
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('chimerax --version')) {
          throw new Error('Command not found');
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyChimeraX } = require('../src/scripts/verifyDependencies');
      const result = verifyChimeraX();
      
      expect(result.installed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('OSMesa Verification', () => {
    it('should detect OSMesa installation', () => {
      // Mock successful library check
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('ldconfig') || cmd.includes('find /usr')) {
          return Buffer.from('/usr/lib/x86_64-linux-gnu/libOSMesa.so.8');
        }
        if (cmd.includes('ldd') && cmd.includes('chimerax')) {
          return Buffer.from(`
            linux-vdso.so.1 (0x00007ffcb1a2a000)
            libOSMesa.so.8 => /usr/lib/x86_64-linux-gnu/libOSMesa.so.8 (0x00007f68c5b75000)
            libGL.so.1 => /usr/lib/x86_64-linux-gnu/libGL.so.1 (0x00007f68c5a95000)
          `);
        }
        return Buffer.from('');
      });
      
      // Mock file existence
      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('libOSMesa') || path.includes('ChimeraX');
      });
      
      // Import and run the verification script
      const { verifyOSMesa } = require('../src/scripts/verifyDependencies');
      const result = verifyOSMesa();
      
      expect(result.installed).toBe(true);
      expect(result.path).toContain('libOSMesa.so');
      expect(result.linkedWithChimeraX).toBe(true);
    });
    
    it('should detect missing OSMesa installation', () => {
      // Mock missing library
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('ldconfig') || cmd.includes('find /usr')) {
          return Buffer.from('');
        }
        if (cmd.includes('ldd') && cmd.includes('chimerax')) {
          return Buffer.from(`
            linux-vdso.so.1 (0x00007ffcb1a2a000)
            libGL.so.1 => /usr/lib/x86_64-linux-gnu/libGL.so.1 (0x00007f68c5a95000)
          `);
        }
        return Buffer.from('');
      });
      
      // Mock file not existing
      mockFs.existsSync.mockReturnValue(false);
      
      // Import and run the verification script
      const { verifyOSMesa } = require('../src/scripts/verifyDependencies');
      const result = verifyOSMesa();
      
      expect(result.installed).toBe(false);
      expect(result.linkedWithChimeraX).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('Platform-specific Behavior', () => {
    // Store original platform
    const originalPlatform = process.platform;
    
    afterEach(() => {
      // Reset platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
    
    it('should handle Linux-specific verification', () => {
      // Mock Linux platform
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      
      // Mock successful library check
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('ldconfig')) {
          return Buffer.from('/usr/lib/x86_64-linux-gnu/libOSMesa.so.8');
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyOSMesa } = require('../src/scripts/verifyDependencies');
      const result = verifyOSMesa();
      
      expect(result.installed).toBe(true);
      expect(result.path).toBeDefined();
    });
    
    it('should handle macOS-specific verification', () => {
      // Mock macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      // Mock successful library check
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('find /usr/local') || cmd.includes('find /opt')) {
          return Buffer.from('/opt/homebrew/lib/libOSMesa.8.dylib');
        }
        if (cmd.includes('otool -L') && cmd.includes('chimerax')) {
          return Buffer.from(`
            @rpath/libOSMesa.8.dylib (compatibility version 10.0.0, current version 10.3.0)
            /System/Library/Frameworks/OpenGL.framework/Versions/A/OpenGL
          `);
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyOSMesa } = require('../src/scripts/verifyDependencies');
      const result = verifyOSMesa();
      
      expect(result.installed).toBe(true);
      expect(result.path).toContain('libOSMesa.8.dylib');
    });
  });
  
  describe('Test Validation Script', () => {
    it('should provide clear test-only mode', () => {
      // Mock successful installations
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('chimerax --version')) {
          return Buffer.from('ChimeraX version 1.5.1');
        }
        if (cmd.includes('find /usr') || cmd.includes('ldconfig')) {
          return Buffer.from('/usr/lib/x86_64-linux-gnu/libOSMesa.so.8');
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyAll } = require('../src/scripts/verifyDependencies');
      const result = verifyAll(true); // Test mode = true
      
      expect(result.chimerax.installed).toBe(true);
      expect(result.osmesa.installed).toBe(true);
      expect(result.renderingCapable).toBe(true);
    });
    
    it('should return false for renderingCapable when dependencies missing', () => {
      // Mock missing installations
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('chimerax --version')) {
          throw new Error('Command not found');
        }
        return Buffer.from('');
      });
      
      // Import and run the verification script
      const { verifyAll } = require('../src/scripts/verifyDependencies');
      const result = verifyAll(true); // Test mode = true
      
      expect(result.chimerax.installed).toBe(false);
      expect(result.renderingCapable).toBe(false);
    });
  });
});