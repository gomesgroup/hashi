import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import config from '../config';
import { FileFormat, extensionToFormat, FileValidationResult } from '../types';
import logger from '../../server/utils/logger';

const execAsync = promisify(exec);

/**
 * Validates that a file has an allowed extension
 */
export function validateFileExtension(filename: string): FileValidationResult {
  const extension = path.extname(filename).toLowerCase().slice(1);
  
  if (!extension) {
    return { 
      valid: false, 
      error: 'File extension missing'
    };
  }
  
  if (!config.supportedExtensions.includes(extension)) {
    return { 
      valid: false, 
      error: `Unsupported file extension: ${extension}. Supported formats: ${config.supportedExtensions.join(', ')}` 
    };
  }
  
  const format = extensionToFormat[extension];
  
  return {
    valid: true,
    format
  };
}

/**
 * Validate file size against configured limits
 */
export function validateFileSize(size: number): FileValidationResult {
  const maxSize = config.limits.fileSize;
  
  if (size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${maxSize / 1024 / 1024} MB`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file content structure using ChimeraX
 * @param filePath Path to the file to validate
 * @param format Expected file format
 */
export async function validateFileContent(
  filePath: string, 
  format: FileFormat
): Promise<FileValidationResult> {
  try {
    // Basic file stats check
    const fileStats = await fs.promises.stat(filePath);
    
    if (fileStats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    // Format-specific validation
    switch (format) {
      case FileFormat.PDB:
        return validatePdbFile(filePath);
      case FileFormat.MMCIF:
        return validateMmcifFile(filePath);
      case FileFormat.MOL:
      case FileFormat.SDF:
        return validateMolFile(filePath);
      case FileFormat.MOL2:
        return validateMol2File(filePath);
      case FileFormat.XYZ:
        return validateXyzFile(filePath);
      default:
        // Skip detailed validation for unknown formats if allowed
        if (config.security.allowUnknownFormats) {
          return { valid: true, format };
        }
        return { valid: false, error: `Validation not implemented for format: ${format}` };
    }
  } catch (error) {
    logger.error(`File validation error: ${error}`);
    return { 
      valid: false,
      error: `Failed to validate file: ${(error as Error).message}`
    };
  }
}

/**
 * Validates PDB file format
 */
async function validatePdbFile(filePath: string): Promise<FileValidationResult> {
  try {
    // Sample a few lines from the file
    const { stdout } = await execAsync(`head -n 20 "${filePath}"`);
    
    // Basic PDB format check (look for common record types)
    const hasPdbRecords = /^(HEADER|ATOM|HETATM|CONECT|MASTER|END)/m.test(stdout);
    
    if (!hasPdbRecords) {
      return { valid: false, error: 'File does not appear to be in valid PDB format' };
    }
    
    // Optional: Use ChimeraX to attempt to load the file
    if (config.security.validateContent) {
      try {
        await execAsync(
          `${config.chimerax.executablePath} --nogui --exit --cmd "open '${filePath}'; exit"`,
          { timeout: config.chimerax.conversionTimeout }
        );
      } catch (error) {
        return { valid: false, error: 'ChimeraX could not open the file as a PDB' };
      }
    }
    
    return { valid: true, format: FileFormat.PDB };
  } catch (error) {
    logger.error(`PDB validation error: ${error}`);
    return { valid: false, error: `PDB validation failed: ${(error as Error).message}` };
  }
}

/**
 * Validates mmCIF file format
 */
async function validateMmcifFile(filePath: string): Promise<FileValidationResult> {
  try {
    // Sample a few lines from the file
    const { stdout } = await execAsync(`head -n 20 "${filePath}"`);
    
    // Basic mmCIF format check (look for data_ block and common categories)
    const hasCifStructure = /^(data_|_atom_site|_cell|_struct)/m.test(stdout);
    
    if (!hasCifStructure) {
      return { valid: false, error: 'File does not appear to be in valid mmCIF format' };
    }
    
    // Optional: Use ChimeraX to attempt to load the file
    if (config.security.validateContent) {
      try {
        await execAsync(
          `${config.chimerax.executablePath} --nogui --exit --cmd "open '${filePath}'; exit"`,
          { timeout: config.chimerax.conversionTimeout }
        );
      } catch (error) {
        return { valid: false, error: 'ChimeraX could not open the file as a mmCIF' };
      }
    }
    
    return { valid: true, format: FileFormat.MMCIF };
  } catch (error) {
    logger.error(`mmCIF validation error: ${error}`);
    return { valid: false, error: `mmCIF validation failed: ${(error as Error).message}` };
  }
}

/**
 * Validates MOL/SDF file format
 */
async function validateMolFile(filePath: string): Promise<FileValidationResult> {
  try {
    // Sample a few lines from the file
    const { stdout } = await execAsync(`head -n 5 "${filePath}"`);
    
    // Basic MOL/SDF format check (counts line in fourth row)
    const lines = stdout.split('\n');
    if (lines.length >= 4) {
      const countsLine = lines[3];
      // Counts line should have atom and bond counts as numbers
      const countsMatch = countsLine.match(/^\s*(\d+)\s+(\d+)/);
      
      if (!countsMatch) {
        return { valid: false, error: 'File does not have valid MOL/SDF counts line' };
      }
    } else {
      return { valid: false, error: 'File is too short to be a valid MOL/SDF file' };
    }
    
    // Check if it's an SDF file (has multiple molecules with $$$$)
    const { stdout: fullContent } = await execAsync(`grep -c "\\$\\$\\$\\$" "${filePath}"`);
    const format = parseInt(fullContent.trim()) > 0 ? FileFormat.SDF : FileFormat.MOL;
    
    // Optional: Use ChimeraX to attempt to load the file
    if (config.security.validateContent) {
      try {
        await execAsync(
          `${config.chimerax.executablePath} --nogui --exit --cmd "open '${filePath}'; exit"`,
          { timeout: config.chimerax.conversionTimeout }
        );
      } catch (error) {
        return { valid: false, error: 'ChimeraX could not open the file as a MOL/SDF' };
      }
    }
    
    return { valid: true, format };
  } catch (error) {
    logger.error(`MOL/SDF validation error: ${error}`);
    return { valid: false, error: `MOL/SDF validation failed: ${(error as Error).message}` };
  }
}

/**
 * Validates MOL2 file format
 */
async function validateMol2File(filePath: string): Promise<FileValidationResult> {
  try {
    // Check for MOL2 record types
    const { stdout } = await execAsync(`grep -E "@<TRIPOS>" "${filePath}" | head -n 5`);
    
    if (!stdout.includes('@<TRIPOS>')) {
      return { valid: false, error: 'File does not contain MOL2 @<TRIPOS> records' };
    }
    
    // Optional: Use ChimeraX to attempt to load the file
    if (config.security.validateContent) {
      try {
        await execAsync(
          `${config.chimerax.executablePath} --nogui --exit --cmd "open '${filePath}'; exit"`,
          { timeout: config.chimerax.conversionTimeout }
        );
      } catch (error) {
        return { valid: false, error: 'ChimeraX could not open the file as a MOL2' };
      }
    }
    
    return { valid: true, format: FileFormat.MOL2 };
  } catch (error) {
    logger.error(`MOL2 validation error: ${error}`);
    return { valid: false, error: `MOL2 validation failed: ${(error as Error).message}` };
  }
}

/**
 * Validates XYZ file format
 */
async function validateXyzFile(filePath: string): Promise<FileValidationResult> {
  try {
    // Sample a few lines from the file
    const { stdout } = await execAsync(`head -n 3 "${filePath}"`);
    
    const lines = stdout.split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'File is too short to be a valid XYZ file' };
    }
    
    // First line should be a number (atom count)
    const atomCount = parseInt(lines[0].trim());
    if (isNaN(atomCount) || atomCount <= 0) {
      return { valid: false, error: 'First line of XYZ file should contain atom count' };
    }
    
    // Second line is a comment, third line should start atom coordinates
    if (lines.length >= 3 && lines[2].trim()) {
      // Check if third line matches XYZ format - element and 3 coordinates
      const atomLinePattern = /^\s*[A-Za-z]+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+/;
      if (!atomLinePattern.test(lines[2])) {
        return { valid: false, error: 'XYZ file does not contain valid coordinate data' };
      }
    }
    
    // Optional: Use ChimeraX to attempt to load the file
    if (config.security.validateContent) {
      try {
        await execAsync(
          `${config.chimerax.executablePath} --nogui --exit --cmd "open '${filePath}'; exit"`,
          { timeout: config.chimerax.conversionTimeout }
        );
      } catch (error) {
        return { valid: false, error: 'ChimeraX could not open the file as an XYZ' };
      }
    }
    
    return { valid: true, format: FileFormat.XYZ };
  } catch (error) {
    logger.error(`XYZ validation error: ${error}`);
    return { valid: false, error: `XYZ validation failed: ${(error as Error).message}` };
  }
}

/**
 * Comprehensive file validation (extension, size, content)
 */
export async function validateFile(
  filePath: string,
  originalName: string,
  size: number
): Promise<FileValidationResult> {
  // Step 1: Check file extension
  const extensionResult = validateFileExtension(originalName);
  if (!extensionResult.valid) {
    return extensionResult;
  }
  
  // Step 2: Check file size
  const sizeResult = validateFileSize(size);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  // Step 3: Check file content
  if (config.security.validateContent && extensionResult.format) {
    return validateFileContent(filePath, extensionResult.format);
  }
  
  return extensionResult;
}