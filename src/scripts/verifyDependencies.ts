/**
 * Dependency Verification Script
 * 
 * This script verifies that all required dependencies for ChimeraX offscreen
 * rendering are correctly installed and properly linked.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Types for verification results
export interface ChimeraXVerificationResult {
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface OSMesaVerificationResult {
  installed: boolean;
  path?: string;
  linkedWithChimeraX: boolean;
  error?: string;
}

export interface VerificationResults {
  chimerax: ChimeraXVerificationResult;
  osmesa: OSMesaVerificationResult;
  renderingCapable: boolean;
  warnings: string[];
}

/**
 * Verify ChimeraX installation
 * @returns Result of ChimeraX verification
 */
export function verifyChimeraX(): ChimeraXVerificationResult {
  try {
    // Check if ChimeraX is installed and get version
    const output = execSync('chimerax --version', { encoding: 'utf-8' });
    const versionMatch = output.match(/ChimeraX version (\d+\.\d+(\.\d+)?)/);
    
    if (versionMatch && versionMatch[1]) {
      // Get ChimeraX path
      let chimeraXPath: string;
      
      try {
        // Different commands based on platform
        if (process.platform === 'win32') {
          chimeraXPath = execSync('where chimerax', { encoding: 'utf-8' }).trim();
        } else {
          chimeraXPath = execSync('which chimerax', { encoding: 'utf-8' }).trim();
        }
      } catch (error) {
        // Fall back to a likely path
        chimeraXPath = process.platform === 'win32' 
          ? 'C:\\Program Files\\ChimeraX\\bin\\ChimeraX.exe'
          : process.platform === 'darwin'
            ? '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX'
            : '/opt/UCSF/ChimeraX/bin/chimerax';
      }
      
      return {
        installed: true,
        version: versionMatch[1],
        path: chimeraXPath
      };
    }
    
    return {
      installed: false,
      error: 'ChimeraX is installed but version could not be determined'
    };
    
  } catch (error) {
    return {
      installed: false,
      error: `ChimeraX is not installed or not in PATH: ${(error as Error).message}`
    };
  }
}

/**
 * Verify OSMesa installation and linking with ChimeraX
 * @returns Result of OSMesa verification
 */
export function verifyOSMesa(): OSMesaVerificationResult {
  try {
    let osmesaPath: string = '';
    let isLinked: boolean = false;
    
    // Platform-specific verification
    if (process.platform === 'linux') {
      // On Linux, use ldconfig to find the library
      try {
        const output = execSync('ldconfig -p | grep -i osmesa', { encoding: 'utf-8' });
        const match = output.match(/libOSMesa\.so[^ ]* => ([^\s]+)/);
        
        if (match && match[1]) {
          osmesaPath = match[1];
        }
      } catch (error) {
        // Fallback to searching common paths
        try {
          const output = execSync('find /usr/lib /usr/local/lib -name "libOSMesa*.so*" | head -1', { encoding: 'utf-8' });
          if (output.trim()) {
            osmesaPath = output.trim();
          }
        } catch (innerError) {
          // Ignore errors in fallback
        }
      }
      
      // Check if ChimeraX is linked with OSMesa
      if (osmesaPath) {
        try {
          const chimeraXPath = verifyChimeraX().path;
          if (chimeraXPath) {
            const lddOutput = execSync(`ldd "${chimeraXPath}" | grep -i osmesa`, { encoding: 'utf-8' });
            isLinked = lddOutput.includes('libOSMesa');
          }
        } catch (error) {
          // Dependency not found in ldd output
          isLinked = false;
        }
      }
    } else if (process.platform === 'darwin') {
      // On macOS, search for the dylib
      try {
        // Check Homebrew locations
        const output = execSync('find /usr/local/lib /opt/homebrew/lib -name "libOSMesa*.dylib" | head -1', { encoding: 'utf-8' });
        if (output.trim()) {
          osmesaPath = output.trim();
        }
      } catch (error) {
        // Check MacPorts location
        try {
          const output = execSync('find /opt/local/lib -name "libOSMesa*.dylib" | head -1', { encoding: 'utf-8' });
          if (output.trim()) {
            osmesaPath = output.trim();
          }
        } catch (innerError) {
          // Ignore errors in fallback
        }
      }
      
      // Check if ChimeraX is linked with OSMesa
      if (osmesaPath) {
        try {
          const chimeraXPath = verifyChimeraX().path;
          if (chimeraXPath) {
            const otoolOutput = execSync(`otool -L "${chimeraXPath}" | grep -i osmesa`, { encoding: 'utf-8' });
            isLinked = otoolOutput.includes('libOSMesa');
          }
        } catch (error) {
          // Dependency not found in otool output
          isLinked = false;
        }
      }
    } else if (process.platform === 'win32') {
      // On Windows, look for the DLL in ChimeraX directory
      const chimeraXResult = verifyChimeraX();
      if (chimeraXResult.installed && chimeraXResult.path) {
        const chimeraXDir = path.dirname(chimeraXResult.path);
        const possiblePaths = [
          path.join(chimeraXDir, 'osmesa.dll'),
          path.join(chimeraXDir, 'lib', 'osmesa.dll'),
          path.join(chimeraXDir, '..', 'lib', 'osmesa.dll')
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            osmesaPath = possiblePath;
            isLinked = true; // On Windows, it's usually bundled, so assume linked
            break;
          }
        }
      }
    }
    
    if (osmesaPath) {
      return {
        installed: true,
        path: osmesaPath,
        linkedWithChimeraX: isLinked
      };
    }
    
    return {
      installed: false,
      linkedWithChimeraX: false,
      error: 'OSMesa libraries not found'
    };
    
  } catch (error) {
    return {
      installed: false,
      linkedWithChimeraX: false,
      error: `Error verifying OSMesa: ${(error as Error).message}`
    };
  }
}

/**
 * Run all verifications and collect results
 * @param testMode If true, only runs checks but doesn't print results
 * @returns Combined verification results
 */
export function verifyAll(testMode: boolean = false): VerificationResults {
  const results: VerificationResults = {
    chimerax: verifyChimeraX(),
    osmesa: verifyOSMesa(),
    renderingCapable: false,
    warnings: []
  };
  
  // Determine if rendering is possible
  results.renderingCapable = 
    results.chimerax.installed && 
    results.osmesa.installed;
  
  // Generate warnings
  if (!results.chimerax.installed) {
    results.warnings.push('ChimeraX is not installed. Please install ChimeraX from https://www.rbvi.ucsf.edu/chimerax/download.html');
  }
  
  if (!results.osmesa.installed) {
    if (process.platform === 'linux') {
      results.warnings.push('OSMesa libraries are not installed. Install with: sudo apt-get install libosmesa6-dev');
    } else if (process.platform === 'darwin') {
      results.warnings.push('OSMesa libraries are not installed. Install with: brew install mesa');
    } else {
      results.warnings.push('OSMesa libraries are not found. Please install Mesa with OSMesa support.');
    }
  } else if (!results.osmesa.linkedWithChimeraX) {
    results.warnings.push('ChimeraX is not linked with OSMesa. Offscreen rendering may not work.');
  }
  
  if (!testMode) {
    // Print results in a formatted way
    console.log('\n===== Dependency Verification Results =====\n');
    
    console.log('ChimeraX:');
    console.log(`  Installed: ${results.chimerax.installed ? 'Yes' : 'No'}`);
    if (results.chimerax.version) {
      console.log(`  Version: ${results.chimerax.version}`);
    }
    if (results.chimerax.path) {
      console.log(`  Path: ${results.chimerax.path}`);
    }
    if (results.chimerax.error) {
      console.log(`  Error: ${results.chimerax.error}`);
    }
    
    console.log('\nOSMesa:');
    console.log(`  Installed: ${results.osmesa.installed ? 'Yes' : 'No'}`);
    if (results.osmesa.path) {
      console.log(`  Path: ${results.osmesa.path}`);
    }
    console.log(`  Linked with ChimeraX: ${results.osmesa.linkedWithChimeraX ? 'Yes' : 'No'}`);
    if (results.osmesa.error) {
      console.log(`  Error: ${results.osmesa.error}`);
    }
    
    console.log('\nOffscreen Rendering:');
    console.log(`  Capable: ${results.renderingCapable ? 'Yes' : 'No'}`);
    
    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    console.log('\n==========================================\n');
  }
  
  return results;
}

// If script is run directly, execute verification
if (require.main === module) {
  verifyAll();
}