import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import { Readable } from 'stream';

import config from '../config';
import { FileFormat, FileStorageInfo, formatToMimeType } from '../types';
import logger from '../../server/utils/logger';

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

/**
 * Ensure all required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  const { temp, session, persistent } = config.directories;
  
  try {
    await Promise.all([
      mkdir(temp, { recursive: true }),
      mkdir(session, { recursive: true }),
      mkdir(persistent, { recursive: true }),
    ]);
    logger.info('File storage directories initialized');
  } catch (error) {
    logger.error(`Failed to create storage directories: ${error}`);
    throw new Error(`Could not create storage directories: ${(error as Error).message}`);
  }
}

/**
 * Generates a unique filename for storage
 */
export function generateUniqueFilename(originalFilename: string, sessionId?: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFilename);
  const sessionPart = sessionId ? `${sessionId}-` : '';
  
  return `${sessionPart}${timestamp}-${randomString}${extension}`;
}

/**
 * Get storage path based on storage type and sessionId
 */
export function getStoragePath(
  storageType: 'temp' | 'session' | 'persistent',
  sessionId?: string
): string {
  switch (storageType) {
    case 'temp':
      return config.directories.temp;
    case 'session':
      if (!sessionId) {
        throw new Error('Session ID is required for session storage');
      }
      return path.join(config.directories.session, sessionId);
    case 'persistent':
      return config.directories.persistent;
    default:
      throw new Error(`Invalid storage type: ${storageType}`);
  }
}

/**
 * Store a file from a buffer
 */
export async function storeFileFromBuffer(
  buffer: Buffer,
  originalFilename: string,
  format: FileFormat,
  storageType: 'temp' | 'session' | 'persistent' = 'temp',
  sessionId?: string
): Promise<FileStorageInfo> {
  try {
    // Ensure storage directory exists
    const storagePath = getStoragePath(storageType, sessionId);
    await mkdir(storagePath, { recursive: true });
    
    // Generate unique filename
    const filename = generateUniqueFilename(originalFilename, sessionId);
    const fullPath = path.join(storagePath, filename);
    
    // Write file
    await fs.promises.writeFile(fullPath, buffer);
    
    // Return file storage info
    return {
      path: fullPath,
      filename,
      originalname: originalFilename,
      mimetype: formatToMimeType[format],
      size: buffer.length,
      format,
      sessionId,
    };
  } catch (error) {
    logger.error(`Failed to store file from buffer: ${error}`);
    throw new Error(`Could not store file: ${(error as Error).message}`);
  }
}

/**
 * Store a file from a stream
 */
export async function storeFileFromStream(
  stream: Readable,
  originalFilename: string,
  format: FileFormat,
  storageType: 'temp' | 'session' | 'persistent' = 'temp',
  sessionId?: string
): Promise<FileStorageInfo> {
  try {
    // Ensure storage directory exists
    const storagePath = getStoragePath(storageType, sessionId);
    await mkdir(storagePath, { recursive: true });
    
    // Generate unique filename
    const filename = generateUniqueFilename(originalFilename, sessionId);
    const fullPath = path.join(storagePath, filename);
    
    // Create write stream
    const writeStream = fs.createWriteStream(fullPath);
    
    // Return promise that resolves when file is written
    return new Promise((resolve, reject) => {
      let fileSize = 0;
      
      // Stream events
      stream.on('data', (chunk) => {
        fileSize += chunk.length;
      });
      
      stream.on('error', (err) => {
        writeStream.end();
        unlink(fullPath).catch(unlinkErr => {
          logger.error(`Failed to remove file after stream error: ${unlinkErr}`);
        });
        reject(err);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
      
      writeStream.on('finish', () => {
        resolve({
          path: fullPath,
          filename,
          originalname: originalFilename,
          mimetype: formatToMimeType[format],
          size: fileSize,
          format,
          sessionId,
        });
      });
      
      // Pipe stream to file
      stream.pipe(writeStream);
    });
  } catch (error) {
    logger.error(`Failed to store file from stream: ${error}`);
    throw new Error(`Could not store file from stream: ${(error as Error).message}`);
  }
}

/**
 * Move a file from one storage location to another
 */
export async function moveFile(
  fileInfo: FileStorageInfo,
  targetStorageType: 'temp' | 'session' | 'persistent',
  newSessionId?: string
): Promise<FileStorageInfo> {
  try {
    // Get target path
    const targetPath = getStoragePath(
      targetStorageType,
      newSessionId || fileInfo.sessionId
    );
    
    // Ensure target directory exists
    await mkdir(targetPath, { recursive: true });
    
    // Generate new filename (keep extension)
    const newFilename = generateUniqueFilename(
      fileInfo.originalname,
      newSessionId || fileInfo.sessionId
    );
    
    const newFullPath = path.join(targetPath, newFilename);
    
    // Move the file (copy then delete)
    await fs.promises.copyFile(fileInfo.path, newFullPath);
    await unlink(fileInfo.path);
    
    // Return updated file info
    return {
      ...fileInfo,
      path: newFullPath,
      filename: newFilename,
      sessionId: newSessionId || fileInfo.sessionId,
    };
  } catch (error) {
    logger.error(`Failed to move file: ${error}`);
    throw new Error(`Could not move file: ${(error as Error).message}`);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File already deleted
      return true;
    }
    
    logger.error(`Failed to delete file: ${error}`);
    throw new Error(`Could not delete file: ${(error as Error).message}`);
  }
}

/**
 * Create a read stream for a file
 */
export function createReadStream(filePath: string): fs.ReadStream {
  return fs.createReadStream(filePath);
}

/**
 * Clean up temporary files older than the configured TTL
 */
export async function cleanupTempFiles(): Promise<number> {
  try {
    const now = Date.now();
    const tempFileTTLMs = config.cleanup.tempFileTTL * 1000; // Convert to milliseconds
    const tempDir = config.directories.temp;
    
    // Get all files in temp directory
    const files = await readdir(tempDir);
    let deletedCount = 0;
    
    // Check each file
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await stat(filePath);
        
        // Calculate file age
        const fileAge = now - stats.mtimeMs;
        
        // Delete if older than TTL
        if (fileAge > tempFileTTLMs) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        logger.warn(`Error processing file during cleanup: ${file}`, error);
      }
    }
    
    logger.info(`Cleanup completed: ${deletedCount} temporary files removed`);
    return deletedCount;
  } catch (error) {
    logger.error(`Temporary file cleanup failed: ${error}`);
    throw new Error(`Temporary file cleanup failed: ${(error as Error).message}`);
  }
}

/**
 * Clean up session files for inactive sessions
 */
export async function cleanupSessionFiles(sessionIds?: string[]): Promise<number> {
  try {
    const sessionDir = config.directories.session;
    let deletedCount = 0;
    
    // If session IDs provided, only clean those
    if (sessionIds && sessionIds.length > 0) {
      for (const sessionId of sessionIds) {
        const sessionPath = path.join(sessionDir, sessionId);
        try {
          // Check if session directory exists
          await stat(sessionPath);
          
          // Recursively delete the directory
          await fs.promises.rm(sessionPath, { recursive: true, force: true });
          deletedCount++;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            logger.warn(`Error removing session directory: ${sessionId}`, error);
          }
        }
      }
    } else {
      // Clean all session directories older than TTL
      const now = Date.now();
      const sessionFileTTLMs = config.cleanup.sessionFileTTL * 1000;
      
      // Get all session directories
      const sessions = await readdir(sessionDir);
      
      for (const sessionId of sessions) {
        const sessionPath = path.join(sessionDir, sessionId);
        try {
          const stats = await stat(sessionPath);
          
          // Calculate directory age
          const dirAge = now - stats.mtimeMs;
          
          // Delete if older than TTL
          if (dirAge > sessionFileTTLMs) {
            await fs.promises.rm(sessionPath, { recursive: true, force: true });
            deletedCount++;
          }
        } catch (error) {
          logger.warn(`Error processing session during cleanup: ${sessionId}`, error);
        }
      }
    }
    
    logger.info(`Session cleanup completed: ${deletedCount} session directories removed`);
    return deletedCount;
  } catch (error) {
    logger.error(`Session file cleanup failed: ${error}`);
    throw new Error(`Session file cleanup failed: ${(error as Error).message}`);
  }
}

/**
 * Initialize the storage system
 */
export async function initializeStorage(): Promise<void> {
  await ensureDirectories();
  
  // Set up cleanup interval
  if (process.env.NODE_ENV !== 'test') {
    const cleanupIntervalMs = config.cleanup.cleanupInterval * 1000;
    
    setInterval(async () => {
      try {
        await cleanupTempFiles();
      } catch (error) {
        logger.error('Scheduled temp file cleanup failed', error);
      }
    }, cleanupIntervalMs);
    
    logger.info(`File cleanup scheduled every ${config.cleanup.cleanupInterval} seconds`);
  }
}