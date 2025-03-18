import fs from 'fs';
import path from 'path';
import { repositories } from '../../database/repositories';
import { StorageService } from '.';
import { MolecularStructure } from '../../database/entities/MolecularStructure';
import { StructureVersion } from '../../database/entities/StructureVersion';
import logger from '../../utils/logger';
import config from '../../config';
import { Tag } from '../../database/entities/Tag';
import { 
  ValidationError, 
  NotFoundError, 
  AuthorizationError, 
  StorageError 
} from '../../utils/errors';
import { StructureValidatorFactory } from './validators';

export interface CreateStructureParams {
  name: string;
  description?: string;
  content: string | Buffer;
  format: string;
  userId: string;
  projectId?: string;
  isPublic?: boolean;
  source?: string;
  externalId?: string;
  tags?: string[];
}

export interface UpdateStructureParams {
  structureId: string;
  name?: string;
  description?: string;
  content?: string | Buffer;
  commitMessage?: string;
  projectId?: string;
  isPublic?: boolean;
  tags?: string[];
  userId: string;
}

export class StructureStorageService {
  private storageService: StorageService;
  private validatorFactory: StructureValidatorFactory;

  constructor() {
    this.storageService = new StorageService();
    this.validatorFactory = new StructureValidatorFactory();
  }

  /**
   * Create a new molecular structure
   */
  public async createStructure(params: CreateStructureParams): Promise<MolecularStructure> {
    const {
      name,
      description,
      content,
      format,
      userId,
      projectId,
      isPublic = false,
      source,
      externalId,
      tags = [],
    } = params;

    // Check file format is allowed
    const allowedFormats = config.storage.allowedFileTypes;
    if (!allowedFormats.includes(format)) {
      throw new ValidationError(`File format ${format} is not allowed`, { 
        allowedFormats,
        providedFormat: format
      });
    }

    // Calculate file size
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const size = contentBuffer.length;
    
    // Validate the file structure
    await this.validateStructureFile(contentBuffer, format, userId, name);

    // Check storage quota
    const hasQuota = await this.storageService.checkStorageQuota(userId, size);
    if (!hasQuota) {
      throw new StorageError('Storage quota exceeded', {
        userId,
        fileSize: size,
        operation: 'create'
      });
    }

    try {
      // Create the structure in the database
      const structure = await repositories.structures.create({
        name,
        description,
        format,
        userId,
        projectId,
        isPublic,
        source,
        externalId,
        size,
      });

      // Generate storage path and save the file
      const storagePath = this.storageService.generateStoragePath({
        userId,
        type: 'structure',
        subType: format,
      });

      await this.storageService.saveFile(contentBuffer, storagePath);

      // Create initial version
      const version = await repositories.structureVersions.create({
        structureId: structure.id,
        versionNumber: 1,
        filePath: storagePath,
        format,
        size,
        createdById: userId,
        commitMessage: 'Initial version',
      });

      // Update storage usage for user and project
      await this.storageService.updateStorageUsage(userId, size);
      if (projectId) {
        await repositories.projects.updateSize(projectId, size);
      }

      // Add tags if provided
      if (tags.length > 0) {
        await this.addTagsToStructure(structure.id, userId, tags);
      }

      return structure;
    } catch (error) {
      logger.error('Failed to create structure:', error);
      throw error;
    }
  }

  /**
   * Update an existing molecular structure and create a new version
   */
  public async updateStructure(params: UpdateStructureParams): Promise<MolecularStructure> {
    const {
      structureId,
      name,
      description,
      content,
      commitMessage,
      projectId,
      isPublic,
      tags,
      userId,
    } = params;

    // Retrieve the structure
    const structure = await repositories.structures.findById(structureId);
    if (!structure) {
      throw new NotFoundError(`Structure not found`, { structureId });
    }

    // Check ownership
    if (structure.userId !== userId) {
      throw new AuthorizationError('You do not have permission to update this structure', {
        structureId,
        userId,
        ownerId: structure.userId
      });
    }

    // Start a transaction for all database operations
    const queryRunner = repositories.structures.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic structure information
      let updateData: Partial<MolecularStructure> = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (projectId) updateData.projectId = projectId;
      if (isPublic !== undefined) updateData.isPublic = isPublic;

      // Handle content update and create a new version if content is provided
      if (content) {
        const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
        const size = contentBuffer.length;
        
        // Validate the file structure
        await this.validateStructureFile(contentBuffer, structure.format, userId, name || structure.name);

        // Check storage quota
        const hasQuota = await this.storageService.checkStorageQuota(userId, size);
        if (!hasQuota) {
          throw new StorageError('Storage quota exceeded', {
            userId,
            fileSize: size,
            operation: 'update',
            structureId
          });
        }

        // Generate storage path and save the file
        const storagePath = this.storageService.generateStoragePath({
          userId,
          type: 'structure',
          subType: structure.format,
        });

        await this.storageService.saveFile(contentBuffer, storagePath);

        // Get next version number
        const nextVersionNumber = await repositories.structureVersions.getNextVersionNumber(structureId);

        // Create new version
        await repositories.structureVersions.create({
          structureId,
          versionNumber: nextVersionNumber,
          filePath: storagePath,
          format: structure.format,
          size,
          createdById: userId,
          commitMessage: commitMessage || `Version ${nextVersionNumber}`,
        });

        // Update structure size
        updateData.size = await this.calculateTotalSize(structureId);

        // Update storage usage for user and project
        await this.storageService.updateStorageUsage(userId, size);
        if (structure.projectId) {
          await repositories.projects.updateSize(structure.projectId, size);
        }

        // Cleanup old versions if needed
        await this.storageService.cleanupOldVersions(structureId);
      }

      // Update the structure
      if (Object.keys(updateData).length > 0) {
        await repositories.structures.update(structureId, updateData);
      }

      // Update tags if provided
      if (tags && tags.length > 0) {
        await this.addTagsToStructure(structureId, userId, tags);
      }

      await queryRunner.commitTransaction();

      // Return the updated structure
      return await repositories.structures.findById(structureId) as MolecularStructure;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to update structure:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a molecular structure and all its versions
   */
  public async deleteStructure(structureId: string, userId: string): Promise<boolean> {
    // Retrieve the structure with versions
    const structure = await repositories.structures.findByIdWithVersions(structureId);
    if (!structure) {
      throw new NotFoundError(`Structure not found`, { structureId });
    }

    // Check ownership
    if (structure.userId !== userId) {
      throw new AuthorizationError('You do not have permission to delete this structure', {
        structureId,
        userId,
        ownerId: structure.userId,
        operation: 'delete'
      });
    }

    // Calculate total size to update quotas
    const totalSize = structure.size;

    // Start a transaction for all database operations
    const queryRunner = repositories.structures.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete all version files
      for (const version of structure.versions) {
        await this.storageService.deleteFile(version.filePath);
      }

      // Delete the structure (cascade will delete versions)
      await repositories.structures.delete(structureId);

      // Update storage usage for user and project
      await this.storageService.updateStorageUsage(userId, -totalSize);
      if (structure.projectId) {
        await repositories.projects.updateSize(structure.projectId, -totalSize);
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to delete structure:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get a specific version of a structure
   */
  public async getStructureVersion(structureId: string, versionNumber?: number): Promise<{ content: Buffer; version: StructureVersion }> {
    // Get the structure
    const structure = await repositories.structures.findById(structureId);
    if (!structure) {
      throw new NotFoundError(`Structure not found`, { structureId });
    }

    // Get the requested version or the latest version
    let version: StructureVersion | null;
    if (versionNumber) {
      version = await repositories.structureVersions.findOne({
        where: { structureId, versionNumber },
      });
    } else {
      version = await repositories.structureVersions.findLatestByStructure(structureId);
    }

    if (!version) {
      throw new NotFoundError(`Version not found`, { 
        structureId, 
        requestedVersion: versionNumber || 'latest' 
      });
    }

    // Read the file
    const content = await this.storageService.readFile(version.filePath);

    return { content, version };
  }

  /**
   * Compare two versions of a structure
   * Returns differences in a format suitable for display
   */
  public async compareVersions(structureId: string, version1: number, version2: number): Promise<any> {
    const v1Data = await this.getStructureVersion(structureId, version1);
    const v2Data = await this.getStructureVersion(structureId, version2);

    // Basic comparison - just return the metadata and sizes
    // A real implementation would parse the structure files and compare atoms, bonds, etc.
    return {
      version1: {
        number: v1Data.version.versionNumber,
        date: v1Data.version.createdAt,
        size: v1Data.version.size,
        commitMessage: v1Data.version.commitMessage,
      },
      version2: {
        number: v2Data.version.versionNumber,
        date: v2Data.version.createdAt,
        size: v2Data.version.size,
        commitMessage: v2Data.version.commitMessage,
      },
      differences: {
        sizeChange: v2Data.version.size - v1Data.version.size,
        // In a real implementation, would include atom changes, bond changes, etc.
      },
    };
  }

  /**
   * Add tags to a structure
   */
  private async addTagsToStructure(structureId: string, userId: string, tagNames: string[]): Promise<void> {
    // Get or create tags
    const tags: Tag[] = [];
    for (const name of tagNames) {
      // Try to find existing tag
      let tag = await repositories.tags.findByUserAndName(userId, name);
      
      // Create tag if it doesn't exist
      if (!tag) {
        tag = await repositories.tags.create({
          name,
          createdById: userId,
        });
      }
      
      tags.push(tag);
    }
    
    // Get the structure with existing tags
    const structure = await repositories.structures.findByIdWithTags(structureId);
    if (!structure) {
      throw new Error(`Structure ${structureId} not found`);
    }
    
    // Update the tags
    structure.tags = tags;
    await repositories.structures.repository.save(structure);
  }

  /**
   * Calculate the total size of a structure (all versions)
   */
  private async calculateTotalSize(structureId: string): Promise<number> {
    const versions = await repositories.structureVersions.findByStructure(structureId);
    return versions.reduce((total, version) => total + version.size, 0);
  }
  
  /**
   * Validate a molecular structure file
   * Performs format-specific validation and returns results
   * @param content File content
   * @param format File format
   * @param userId User ID
   * @param fileName Optional file name
   * @returns Validation result
   * @throws ValidationError if the file is invalid
   */
  public async validateStructureFile(
    content: Buffer | string,
    format: string,
    userId: string,
    fileName?: string
  ): Promise<any> {
    try {
      // Convert to buffer if needed
      const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
      
      // Get the appropriate validator
      const validator = this.validatorFactory.getValidator(format);
      
      // Validate the file
      const result = await validator.validate({
        fileName,
        format,
        userId,
        size: contentBuffer.length,
        content: contentBuffer
      });
      
      // If invalid, throw validation error
      if (!result.isValid && result.errors && result.errors.length > 0) {
        throw new ValidationError(`Invalid ${format.toUpperCase()} file`, {
          format,
          errors: result.errors,
          warnings: result.warnings,
          details: result.details
        });
      }
      
      // Return validation result with warnings
      return {
        isValid: result.isValid,
        warnings: result.warnings || [],
        details: result.details || {}
      };
    } catch (error) {
      // Re-throw ValidationError
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Log and throw new error for other errors
      logger.error('Structure validation error:', error);
      throw new ValidationError(`Failed to validate ${format.toUpperCase()} file`, {
        format,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}