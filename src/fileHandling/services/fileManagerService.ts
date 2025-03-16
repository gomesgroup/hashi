import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

import { MoleculeFile } from '../../shared/types';
import { 
  FileFormat, 
  FileStorageInfo, 
  StoredMoleculeFile, 
  ConversionOptions,
  FileUploadMetadata
} from '../types';
import * as storageService from './storageService';
import * as conversionService from './conversionService';
import { validateFile } from '../validation/fileValidator';
import logger from '../../server/utils/logger';

// In-memory file registry (in a real app, this would be a database)
const fileRegistry = new Map<string, StoredMoleculeFile>();

/**
 * Register a file in the system
 */
function registerFile(
  storageInfo: FileStorageInfo, 
  metadata?: FileUploadMetadata
): StoredMoleculeFile {
  const id = uuidv4();
  const now = new Date();
  
  const moleculeFile: StoredMoleculeFile = {
    id,
    name: storageInfo.originalname,
    type: storageInfo.mimetype,
    size: storageInfo.size,
    uploaded: now,
    sessionId: metadata?.sessionId || storageInfo.sessionId,
    storage: storageInfo
  };
  
  // Add to registry
  fileRegistry.set(id, moleculeFile);
  
  return moleculeFile;
}

/**
 * Get a file by ID
 */
export function getFileById(id: string): StoredMoleculeFile | undefined {
  return fileRegistry.get(id);
}

/**
 * Process and store a file from a buffer
 */
export async function processFileFromBuffer(
  buffer: Buffer,
  originalFilename: string,
  metadata?: FileUploadMetadata
): Promise<StoredMoleculeFile> {
  try {
    // Determine storage type based on metadata
    const storageType = metadata?.sessionId ? 'session' : 'temp';
    
    // Create temporary file to validate
    const tempStorageInfo = await storageService.storeFileFromBuffer(
      buffer,
      originalFilename,
      FileFormat.PDB, // Temporary format, will be updated after validation
      'temp'
    );
    
    // Validate file
    const validationResult = await validateFile(
      tempStorageInfo.path,
      originalFilename,
      buffer.length
    );
    
    if (!validationResult.valid || !validationResult.format) {
      // Clean up temporary file
      await storageService.deleteFile(tempStorageInfo.path);
      throw new Error(validationResult.error || 'File validation failed');
    }
    
    // Update format based on validation
    tempStorageInfo.format = validationResult.format;
    
    // Move to appropriate storage location if needed
    let finalStorageInfo: FileStorageInfo;
    
    if (storageType !== 'temp') {
      finalStorageInfo = await storageService.moveFile(
        tempStorageInfo,
        storageType as 'session',
        metadata?.sessionId
      );
    } else {
      finalStorageInfo = tempStorageInfo;
    }
    
    // Register file in the system
    const moleculeFile = registerFile(finalStorageInfo, metadata);
    
    logger.info(`File processed and stored: ${moleculeFile.id}`);
    return moleculeFile;
  } catch (error) {
    logger.error(`Failed to process file from buffer: ${error}`);
    throw new Error(`File processing failed: ${(error as Error).message}`);
  }
}

/**
 * Process and store a file from a stream
 */
export async function processFileFromStream(
  stream: Readable,
  originalFilename: string,
  metadata?: FileUploadMetadata
): Promise<StoredMoleculeFile> {
  try {
    // Determine storage type based on metadata
    const storageType = metadata?.sessionId ? 'session' : 'temp';
    
    // Create temporary file to validate (use PDB as initial format)
    const tempStorageInfo = await storageService.storeFileFromStream(
      stream,
      originalFilename,
      FileFormat.PDB, // Temporary format, will be updated after validation
      'temp'
    );
    
    // Validate file
    const validationResult = await validateFile(
      tempStorageInfo.path,
      originalFilename,
      tempStorageInfo.size
    );
    
    if (!validationResult.valid || !validationResult.format) {
      // Clean up temporary file
      await storageService.deleteFile(tempStorageInfo.path);
      throw new Error(validationResult.error || 'File validation failed');
    }
    
    // Update format based on validation
    tempStorageInfo.format = validationResult.format;
    
    // Move to appropriate storage location if needed
    let finalStorageInfo: FileStorageInfo;
    
    if (storageType !== 'temp') {
      finalStorageInfo = await storageService.moveFile(
        tempStorageInfo,
        storageType as 'session',
        metadata?.sessionId
      );
    } else {
      finalStorageInfo = tempStorageInfo;
    }
    
    // Register file in the system
    const moleculeFile = registerFile(finalStorageInfo, metadata);
    
    logger.info(`File processed and stored from stream: ${moleculeFile.id}`);
    return moleculeFile;
  } catch (error) {
    logger.error(`Failed to process file from stream: ${error}`);
    throw new Error(`File stream processing failed: ${(error as Error).message}`);
  }
}

/**
 * Convert a file to a different format
 */
export async function convertFile(
  fileId: string,
  options: ConversionOptions
): Promise<StoredMoleculeFile> {
  try {
    // Get the source file
    const sourceFile = getFileById(fileId);
    if (!sourceFile) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // Check if conversion is supported
    if (!conversionService.isConversionSupported(
      sourceFile.storage.format,
      options.targetFormat
    )) {
      throw new Error(
        `Conversion from ${sourceFile.storage.format} to ${options.targetFormat} is not supported`
      );
    }
    
    // Convert the file
    const convertedStorageInfo = await conversionService.convertFile(
      sourceFile.storage,
      options
    );
    
    // Register converted file
    const metadata: FileUploadMetadata = {
      sessionId: sourceFile.sessionId,
    };
    
    const convertedFile = registerFile(convertedStorageInfo, metadata);
    
    logger.info(
      `File converted: ${fileId} from ${sourceFile.storage.format} to ${options.targetFormat}`
    );
    
    return convertedFile;
  } catch (error) {
    logger.error(`File conversion error: ${error}`);
    throw new Error(`File conversion failed: ${(error as Error).message}`);
  }
}

/**
 * Delete a file by ID
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const file = getFileById(fileId);
    if (!file) {
      logger.warn(`Attempted to delete non-existent file: ${fileId}`);
      return false;
    }
    
    // Delete from storage
    await storageService.deleteFile(file.storage.path);
    
    // Remove from registry
    fileRegistry.delete(fileId);
    
    logger.info(`File deleted: ${fileId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete file ${fileId}: ${error}`);
    throw new Error(`File deletion failed: ${(error as Error).message}`);
  }
}

/**
 * Get all files for a specific session
 */
export function getFilesBySessionId(sessionId: string): StoredMoleculeFile[] {
  return Array.from(fileRegistry.values())
    .filter(file => file.sessionId === sessionId);
}

/**
 * Move a file to a different storage location or session
 */
export async function moveFileStorage(
  fileId: string,
  targetStorage: 'temp' | 'session' | 'persistent',
  newSessionId?: string
): Promise<StoredMoleculeFile> {
  try {
    const file = getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // Move file in storage
    const updatedStorageInfo = await storageService.moveFile(
      file.storage,
      targetStorage,
      newSessionId
    );
    
    // Update the file in registry
    const updatedFile: StoredMoleculeFile = {
      ...file,
      sessionId: newSessionId || file.sessionId,
      storage: updatedStorageInfo
    };
    
    fileRegistry.set(fileId, updatedFile);
    
    logger.info(`File ${fileId} moved to ${targetStorage} storage`);
    return updatedFile;
  } catch (error) {
    logger.error(`Failed to move file ${fileId}: ${error}`);
    throw new Error(`File move operation failed: ${(error as Error).message}`);
  }
}

/**
 * Make a file permanent by moving it to persistent storage
 */
export async function makeFilePermanent(fileId: string): Promise<StoredMoleculeFile> {
  return moveFileStorage(fileId, 'persistent');
}

/**
 * Associate a file with a session
 */
export async function associateFileWithSession(
  fileId: string,
  sessionId: string
): Promise<StoredMoleculeFile> {
  try {
    const file = getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // If already in the correct session, just return
    if (file.sessionId === sessionId) {
      return file;
    }
    
    // Move file to session storage
    return await moveFileStorage(fileId, 'session', sessionId);
  } catch (error) {
    logger.error(`Failed to associate file with session: ${error}`);
    throw new Error(`File association failed: ${(error as Error).message}`);
  }
}

/**
 * Clean up files for a session
 */
export async function cleanupSessionFiles(sessionId: string): Promise<number> {
  try {
    // Get all files for the session
    const sessionFiles = getFilesBySessionId(sessionId);
    
    // Delete each file
    for (const file of sessionFiles) {
      await deleteFile(file.id);
    }
    
    // Also clean up any remaining files in the session directory
    await storageService.cleanupSessionFiles([sessionId]);
    
    return sessionFiles.length;
  } catch (error) {
    logger.error(`Failed to clean up session files: ${error}`);
    throw new Error(`Session cleanup failed: ${(error as Error).message}`);
  }
}

/**
 * Initialize the file manager
 */
export async function initialize(): Promise<void> {
  try {
    // Initialize storage
    await storageService.initializeStorage();
    logger.info('File manager initialized');
  } catch (error) {
    logger.error(`File manager initialization failed: ${error}`);
    throw new Error(`File manager initialization failed: ${(error as Error).message}`);
  }
}