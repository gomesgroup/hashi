import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import config from '../../config';
import { logger } from '../../utils/logger';
import { repositories } from '../../database/repositories';

const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

export interface StorageOptions {
  userId: string;
  type: 'structure' | 'session' | 'snapshot';
  subType?: string; // For structures: 'pdb', 'mol', etc. For sessions: 'chimerax', etc.
}

export class StorageService {
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(config.storage.basePath);
    this.initStorageDirs();
  }

  private async initStorageDirs(): Promise<void> {
    try {
      // Create base storage directory if it doesn't exist
      if (!fs.existsSync(this.basePath)) {
        await mkdir(this.basePath, { recursive: true });
      }

      // Create subdirectories for different storage types
      const dirs = ['structures', 'sessions', 'snapshots', 'thumbnails', 'temp'];
      for (const dir of dirs) {
        const dirPath = path.join(this.basePath, dir);
        if (!fs.existsSync(dirPath)) {
          await mkdir(dirPath, { recursive: true });
        }
      }
      logger.info('Storage directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize storage directories:', error);
      throw error;
    }
  }

  // Generate a unique storage path for a file
  public generateStoragePath(options: StorageOptions): string {
    const { userId, type, subType } = options;
    const id = uuid();
    const baseDir = path.join(this.basePath, `${type}s`);
    
    // Create user directory if it doesn't exist
    const userDir = path.join(baseDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Generate a filename with extension if subType is provided
    const filename = subType ? `${id}.${subType}` : id;
    return path.join(userDir, filename);
  }

  // Save a file to the storage
  public async saveFile(content: string | Buffer, filePath: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(filePath, content);
    } catch (error) {
      logger.error(`Failed to save file at ${filePath}:`, error);
      throw error;
    }
  }

  // Read a file from storage
  public async readFile(filePath: string): Promise<Buffer> {
    try {
      return await readFile(filePath);
    } catch (error) {
      logger.error(`Failed to read file at ${filePath}:`, error);
      throw error;
    }
  }

  // Delete a file from storage
  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete file at ${filePath}:`, error);
      return false;
    }
  }

  // Get the size of a file (in bytes)
  public async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Failed to get file size for ${filePath}:`, error);
      return 0;
    }
  }

  // Check if a file exists
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // Check if user has enough storage quota
  public async checkStorageQuota(userId: string, size: number): Promise<boolean> {
    try {
      const user = await repositories.users.findById(userId);
      if (!user) {
        logger.error(`User ${userId} not found when checking storage quota`);
        return false;
      }
      
      const availableStorage = user.storageQuota - user.storageUsed;
      return size <= availableStorage;
    } catch (error) {
      logger.error(`Failed to check storage quota for user ${userId}:`, error);
      return false;
    }
  }

  // Update user's storage usage
  public async updateStorageUsage(userId: string, size: number): Promise<void> {
    try {
      await repositories.users.updateStorageUsed(userId, size);
    } catch (error) {
      logger.error(`Failed to update storage usage for user ${userId}:`, error);
      throw error;
    }
  }

  // Cleanup old versions
  public async cleanupOldVersions(structureId: string): Promise<void> {
    try {
      const maxVersions = config.storage.maxVersionsPerStructure;
      const versions = await repositories.structureVersions.findByStructure(structureId);
      
      if (versions.length <= maxVersions) {
        return;
      }
      
      // Get versions to delete (keeping the latest maxVersions)
      const versionsToDelete = versions.slice(maxVersions);
      
      // Delete files and update database
      let totalSizeRecovered = 0;
      
      for (const version of versionsToDelete) {
        if (await this.fileExists(version.filePath)) {
          const size = await this.getFileSize(version.filePath);
          await this.deleteFile(version.filePath);
          totalSizeRecovered += size;
        }
      }
      
      // Delete versions from database
      await repositories.structureVersions.deleteOldVersions(structureId, maxVersions);
      
      // Update structure and user storage usage
      if (totalSizeRecovered > 0) {
        const structure = await repositories.structures.findById(structureId);
        if (structure) {
          await repositories.structures.updateSize(structureId, -totalSizeRecovered);
          await repositories.users.updateStorageUsed(structure.userId, -totalSizeRecovered);
          
          if (structure.projectId) {
            await repositories.projects.updateSize(structure.projectId, -totalSizeRecovered);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to cleanup old versions for structure ${structureId}:`, error);
      throw error;
    }
  }
}