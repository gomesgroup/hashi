import { repositories } from '../../database/repositories';
import { StorageService } from '.';
import { ChimeraXSession } from '../../database/entities/ChimeraXSession';
import { SessionVersion } from '../../database/entities/SessionVersion';
import { logger } from '../../utils/logger';

export interface CreateSessionParams {
  name: string;
  description?: string;
  content: string | Buffer;
  userId: string;
  projectId?: string;
  isPublic?: boolean;
  metadata?: any;
}

export interface UpdateSessionParams {
  sessionId: string;
  name?: string;
  description?: string;
  content?: string | Buffer;
  commitMessage?: string;
  projectId?: string;
  isPublic?: boolean;
  userId: string;
  metadata?: any;
}

export class SessionStorageService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Create a new ChimeraX session
   */
  public async createSession(params: CreateSessionParams): Promise<ChimeraXSession> {
    const {
      name,
      description,
      content,
      userId,
      projectId,
      isPublic = false,
      metadata,
    } = params;

    // Calculate file size
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const size = contentBuffer.length;

    // Check storage quota
    const hasQuota = await this.storageService.checkStorageQuota(userId, size);
    if (!hasQuota) {
      throw new Error('Storage quota exceeded');
    }

    try {
      // Create the session in the database
      const session = await repositories.sessions.create({
        name,
        description,
        userId,
        projectId,
        isPublic,
        size,
        lastAccessedAt: new Date(),
      });

      // Generate storage path and save the file
      const storagePath = this.storageService.generateStoragePath({
        userId,
        type: 'session',
        subType: 'cxs', // ChimeraX session file extension
      });

      await this.storageService.saveFile(contentBuffer, storagePath);

      // Create initial version
      await repositories.sessionVersions.create({
        sessionId: session.id,
        versionNumber: 1,
        filePath: storagePath,
        size,
        createdById: userId,
        commitMessage: 'Initial version',
        metadata,
      });

      // Update storage usage for user and project
      await this.storageService.updateStorageUsage(userId, size);
      if (projectId) {
        await repositories.projects.updateSize(projectId, size);
      }

      return session;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update an existing ChimeraX session and create a new version
   */
  public async updateSession(params: UpdateSessionParams): Promise<ChimeraXSession> {
    const {
      sessionId,
      name,
      description,
      content,
      commitMessage,
      projectId,
      isPublic,
      userId,
      metadata,
    } = params;

    // Retrieve the session
    const session = await repositories.sessions.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check ownership
    if (session.userId !== userId) {
      throw new Error('You do not have permission to update this session');
    }

    // Start a transaction for all database operations
    const queryRunner = repositories.sessions.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic session information
      let updateData: Partial<ChimeraXSession> = {
        lastAccessedAt: new Date(),
      };
      
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (projectId) updateData.projectId = projectId;
      if (isPublic !== undefined) updateData.isPublic = isPublic;

      // Handle content update and create a new version if content is provided
      if (content) {
        const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
        const size = contentBuffer.length;

        // Check storage quota
        const hasQuota = await this.storageService.checkStorageQuota(userId, size);
        if (!hasQuota) {
          throw new Error('Storage quota exceeded');
        }

        // Generate storage path and save the file
        const storagePath = this.storageService.generateStoragePath({
          userId,
          type: 'session',
          subType: 'cxs',
        });

        await this.storageService.saveFile(contentBuffer, storagePath);

        // Get next version number
        const nextVersionNumber = await repositories.sessionVersions.getNextVersionNumber(sessionId);

        // Create new version
        await repositories.sessionVersions.create({
          sessionId,
          versionNumber: nextVersionNumber,
          filePath: storagePath,
          size,
          createdById: userId,
          commitMessage: commitMessage || `Version ${nextVersionNumber}`,
          metadata,
        });

        // Update session size
        updateData.size = await this.calculateTotalSize(sessionId);

        // Update storage usage for user and project
        await this.storageService.updateStorageUsage(userId, size);
        if (session.projectId) {
          await repositories.projects.updateSize(session.projectId, size);
        }
      }

      // Update the session
      await repositories.sessions.update(sessionId, updateData);

      await queryRunner.commitTransaction();

      // Return the updated session
      return await repositories.sessions.findById(sessionId) as ChimeraXSession;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to update session:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a ChimeraX session and all its versions
   */
  public async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    // Retrieve the session with versions
    const session = await repositories.sessions.findByIdWithVersions(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check ownership
    if (session.userId !== userId) {
      throw new Error('You do not have permission to delete this session');
    }

    // Calculate total size to update quotas
    const totalSize = session.size;

    // Start a transaction for all database operations
    const queryRunner = repositories.sessions.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete all version files
      for (const version of session.versions) {
        await this.storageService.deleteFile(version.filePath);
      }

      // Delete all related snapshots
      const snapshots = await repositories.snapshots.findBySession(sessionId);
      for (const snapshot of snapshots) {
        await this.storageService.deleteFile(snapshot.imagePath);
      }

      // Delete the session (cascade will delete versions and snapshots)
      await repositories.sessions.delete(sessionId);

      // Update storage usage for user and project
      await this.storageService.updateStorageUsage(userId, -totalSize);
      if (session.projectId) {
        await repositories.projects.updateSize(session.projectId, -totalSize);
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to delete session:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get a specific version of a session
   */
  public async getSessionVersion(sessionId: string, versionNumber?: number): Promise<{ content: Buffer; version: SessionVersion }> {
    // Get the session
    const session = await repositories.sessions.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update last accessed time
    await repositories.sessions.updateLastAccessed(sessionId);

    // Get the requested version or the latest version
    let version: SessionVersion | null;
    if (versionNumber) {
      version = await repositories.sessionVersions.findOne({
        where: { sessionId, versionNumber },
      });
    } else {
      version = await repositories.sessionVersions.findLatestBySession(sessionId);
    }

    if (!version) {
      throw new Error(`Version ${versionNumber || 'latest'} not found for session ${sessionId}`);
    }

    // Read the file
    const content = await this.storageService.readFile(version.filePath);

    return { content, version };
  }

  /**
   * Calculate the total size of a session (all versions)
   */
  private async calculateTotalSize(sessionId: string): Promise<number> {
    const versions = await repositories.sessionVersions.findBySession(sessionId);
    return versions.reduce((total, version) => total + version.size, 0);
  }
}