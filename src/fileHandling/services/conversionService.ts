import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

import config from '../config';
import { FileFormat, ConversionOptions, FileStorageInfo } from '../types';
import logger from '../../server/utils/logger';
import * as storageService from './storageService';

const execAsync = promisify(exec);

/**
 * Convert a file from one format to another using ChimeraX
 */
export async function convertFile(
  fileInfo: FileStorageInfo,
  options: ConversionOptions
): Promise<FileStorageInfo> {
  const { targetFormat } = options;
  const { format: sourceFormat, path: sourcePath, originalname } = fileInfo;
  
  // Check if source and target formats are the same
  if (sourceFormat === targetFormat) {
    return fileInfo;
  }
  
  try {
    // Create a new filename with the target extension
    const fileNameWithoutExt = path.basename(originalname, path.extname(originalname));
    const targetExtension = `.${targetFormat}`;
    const targetFilename = `${fileNameWithoutExt}${targetExtension}`;
    
    // Generate a path for the converted file
    const targetPath = path.join(
      config.directories.temp,
      `converted_${storageService.generateUniqueFilename(targetFilename)}`
    );
    
    // Ensure directories exist
    await storageService.ensureDirectories();
    
    // Create ChimeraX command for conversion
    const command = createConversionCommand(sourcePath, targetPath, sourceFormat, targetFormat, options);
    
    // Execute conversion
    await execAsync(command, { timeout: config.chimerax.conversionTimeout });
    
    // Check if conversion was successful
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Conversion failed: output file not created`);
    }
    
    // Get file size
    const stats = await fs.promises.stat(targetPath);
    
    // Create new file info for converted file
    const convertedFileInfo: FileStorageInfo = {
      path: targetPath,
      filename: path.basename(targetPath),
      originalname: targetFilename,
      mimetype: fileInfo.mimetype, // Will be updated when registered in database
      size: stats.size,
      format: targetFormat,
      sessionId: fileInfo.sessionId,
    };
    
    return convertedFileInfo;
  } catch (error) {
    logger.error(`File conversion error: ${error}`);
    throw new Error(`File conversion failed: ${(error as Error).message}`);
  }
}

/**
 * Create a ChimeraX command for converting between formats
 */
function createConversionCommand(
  sourcePath: string,
  targetPath: string,
  sourceFormat: FileFormat,
  targetFormat: FileFormat,
  options: ConversionOptions
): string {
  // Basic command to open source and save as target
  const openCommand = `open "${sourcePath}"`;
  const saveCommand = `save "${targetPath}" format ${targetFormat}`;
  
  // Format-specific options
  let formatOptions = '';
  
  if (options.options) {
    // Handle PDB-specific options
    if (targetFormat === FileFormat.PDB && options.options.selection) {
      formatOptions = ` select ${options.options.selection}`;
    }
    
    // Handle mmCIF-specific options
    if (targetFormat === FileFormat.MMCIF && options.options.selection) {
      formatOptions = ` select ${options.options.selection}`;
    }
  }
  
  // Combine into final command
  return `${config.chimerax.executablePath} --nogui --exit --cmd "${openCommand}; ${saveCommand}${formatOptions}; exit"`;
}

/**
 * List available conversion paths for a specific format
 */
export function getAvailableConversionTargets(sourceFormat: FileFormat): FileFormat[] {
  // Define which formats can be converted to which other formats
  // This is based on ChimeraX capabilities
  const conversionMap: Record<FileFormat, FileFormat[]> = {
    [FileFormat.PDB]: [FileFormat.MMCIF, FileFormat.MOL2],
    [FileFormat.MMCIF]: [FileFormat.PDB, FileFormat.MOL2],
    [FileFormat.SDF]: [FileFormat.MOL, FileFormat.MOL2],
    [FileFormat.MOL]: [FileFormat.SDF, FileFormat.MOL2],
    [FileFormat.MOL2]: [FileFormat.PDB, FileFormat.MOL],
    [FileFormat.XYZ]: [FileFormat.PDB, FileFormat.MOL],
  };
  
  return conversionMap[sourceFormat] || [];
}

/**
 * Check if conversion between two formats is supported
 */
export function isConversionSupported(sourceFormat: FileFormat, targetFormat: FileFormat): boolean {
  // Same format - no conversion needed
  if (sourceFormat === targetFormat) {
    return true;
  }
  
  const availableTargets = getAvailableConversionTargets(sourceFormat);
  return availableTargets.includes(targetFormat);
}