import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import renderingQueue from './renderingQueue';
import sessionService from './session';
import { 
  SnapshotParameters, 
  SnapshotMetadata, 
  ImageFormat, 
  RenderingJobStatus 
} from '../types/rendering';

/**
 * Snapshot Service
 * 
 * Provides functionality for generating, retrieving, and managing snapshots
 * of ChimeraX sessions.
 */
class SnapshotService {
  /**
   * Create a new snapshot rendering job
   * @param sessionId Session ID
   * @param parameters Snapshot parameters
   * @returns Snapshot metadata
   */
  public async createSnapshot(
    sessionId: string, 
    parameters: SnapshotParameters
  ): Promise<SnapshotMetadata> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Submit rendering job
      const job = renderingQueue.submitJob(sessionId, parameters);

      // Return snapshot metadata
      return this.convertToMetadata(job, sessionId);
    } catch (error) {
      logger.error(`Failed to create snapshot: ${error}`);
      throw new Error(`Snapshot creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get a snapshot by ID
   * @param sessionId Session ID
   * @param snapshotId Snapshot ID
   * @returns Snapshot metadata
   */
  public async getSnapshot(
    sessionId: string, 
    snapshotId: string
  ): Promise<SnapshotMetadata> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get job information
      const job = renderingQueue.getJob(snapshotId);
      if (!job) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      // Validate that the snapshot belongs to the session
      if (job.sessionId !== sessionId) {
        throw new Error(`Snapshot ${snapshotId} does not belong to session ${sessionId}`);
      }

      // Return snapshot metadata
      return this.convertToMetadata(job, sessionId);
    } catch (error) {
      logger.error(`Failed to get snapshot: ${error}`);
      throw new Error(`Snapshot retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get all snapshots for a session
   * @param sessionId Session ID
   * @returns Array of snapshot metadata
   */
  public async getSessionSnapshots(sessionId: string): Promise<SnapshotMetadata[]> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get all jobs for the session
      const jobs = renderingQueue.getSessionJobs(sessionId);

      // Convert to metadata
      return jobs.map(job => this.convertToMetadata(job, sessionId));
    } catch (error) {
      logger.error(`Failed to get session snapshots: ${error}`);
      throw new Error(`Session snapshots retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a snapshot
   * @param sessionId Session ID
   * @param snapshotId Snapshot ID
   * @returns True if deleted successfully
   */
  public async deleteSnapshot(
    sessionId: string, 
    snapshotId: string
  ): Promise<boolean> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get job information
      const job = renderingQueue.getJob(snapshotId);
      if (!job) {
        // Already deleted or never existed
        return true;
      }

      // Validate that the snapshot belongs to the session
      if (job.sessionId !== sessionId) {
        throw new Error(`Snapshot ${snapshotId} does not belong to session ${sessionId}`);
      }

      // If job is still pending or processing, try to cancel it
      if (
        job.status === RenderingJobStatus.PENDING ||
        job.status === RenderingJobStatus.PROCESSING
      ) {
        renderingQueue.cancelJob(snapshotId);
      }

      // Delete the file if it exists
      if (job.filePath && fs.existsSync(job.filePath)) {
        fs.unlinkSync(job.filePath);
      }

      // Clean up the job from the queue
      await renderingQueue.cleanupSessionJobs(sessionId);

      return true;
    } catch (error) {
      logger.error(`Failed to delete snapshot: ${error}`);
      throw new Error(`Snapshot deletion failed: ${(error as Error).message}`);
    }
  }

  /**
   * Update camera or view settings for a session
   * @param sessionId Session ID
   * @param viewSettings View settings
   * @returns Success message
   */
  public async updateViewSettings(
    sessionId: string, 
    viewSettings: any
  ): Promise<{ message: string }> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Import ChimeraXProcessManager here to avoid circular dependency
      const { chimeraXProcessManager } = await import('./ChimeraXProcessManager');
      
      // Build view command
      const commands: string[] = [];
      
      if (viewSettings.camera) {
        const camera = viewSettings.camera;
        
        if (camera.position && camera.target) {
          commands.push(`view position ${camera.position.join(',')}`);
          commands.push(`view target ${camera.target.join(',')}`);
        }
        
        if (camera.fieldOfView) {
          commands.push(`view fieldOfView ${camera.fieldOfView}`);
        }
      }
      
      if (viewSettings.lighting) {
        const lighting = viewSettings.lighting;
        
        if (lighting.ambientIntensity !== undefined) {
          commands.push(`lighting ambient ${lighting.ambientIntensity}`);
        }
        
        if (lighting.ambientColor) {
          commands.push(`lighting ambientColor ${lighting.ambientColor}`);
        }
        
        if (lighting.shadows !== undefined) {
          commands.push(`lighting shadows ${lighting.shadows ? 'true' : 'false'}`);
        }
      }
      
      if (viewSettings.background) {
        const background = viewSettings.background;
        
        if (background.color) {
          commands.push(`background color ${background.color}`);
        }
        
        if (background.transparent !== undefined) {
          commands.push(`background transparent ${background.transparent ? 'true' : 'false'}`);
        }
      }
      
      if (commands.length === 0) {
        throw new Error('No valid view settings provided');
      }
      
      // Execute the commands
      const command = commands.join('; ');
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update view settings');
      }
      
      // Update session activity
      sessionService.updateSessionActivity(sessionId);
      
      return { message: 'View settings updated successfully' };
    } catch (error) {
      logger.error(`Failed to update view settings: ${error}`);
      throw new Error(`View settings update failed: ${(error as Error).message}`);
    }
  }

  /**
   * Apply styles to molecules in a session
   * @param sessionId Session ID
   * @param styleSettings Style settings
   * @returns Success message
   */
  public async applyStyles(
    sessionId: string, 
    styleSettings: any
  ): Promise<{ message: string }> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      // Import ChimeraXProcessManager here to avoid circular dependency
      const { chimeraXProcessManager } = await import('./ChimeraXProcessManager');
      
      // Build style command
      const commands: string[] = [];
      
      if (styleSettings.representation) {
        let styleCmd = `style ${styleSettings.representation}`;
        
        if (styleSettings.colorScheme) {
          styleCmd += ` color ${styleSettings.colorScheme}`;
        }
        
        commands.push(styleCmd);
      }
      
      if (styleSettings.transparency !== undefined) {
        commands.push(`transparency ${styleSettings.transparency}`);
      }
      
      if (styleSettings.showHydrogens !== undefined) {
        commands.push(`${styleSettings.showHydrogens ? 'show' : 'hide'} hydrogens`);
      }
      
      if (styleSettings.showSolvent !== undefined) {
        commands.push(`${styleSettings.showSolvent ? 'show' : 'hide'} solvent`);
      }
      
      if (styleSettings.showHeteroAtoms !== undefined) {
        commands.push(`${styleSettings.showHeteroAtoms ? 'show' : 'hide'} hetero`);
      }
      
      if (commands.length === 0) {
        throw new Error('No valid style settings provided');
      }
      
      // Execute the commands
      const command = commands.join('; ');
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply styles');
      }
      
      // Update session activity
      sessionService.updateSessionActivity(sessionId);
      
      return { message: 'Styles applied successfully' };
    } catch (error) {
      logger.error(`Failed to apply styles: ${error}`);
      throw new Error(`Style application failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get a snapshot file
   * @param sessionId Session ID
   * @param snapshotId Snapshot ID
   * @returns File information or null if not found
   */
  public async getSnapshotFile(
    sessionId: string, 
    snapshotId: string
  ): Promise<{ 
    path: string; 
    filename: string; 
    mimetype: string; 
    size: number 
  } | null> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get job information
      const job = renderingQueue.getJob(snapshotId);
      if (!job || job.status !== RenderingJobStatus.COMPLETED || !job.filePath) {
        return null;
      }

      // Validate that the snapshot belongs to the session
      if (job.sessionId !== sessionId) {
        throw new Error(`Snapshot ${snapshotId} does not belong to session ${sessionId}`);
      }

      // Check if file exists
      if (!fs.existsSync(job.filePath)) {
        return null;
      }

      // Get file stats
      const stats = fs.statSync(job.filePath);
      
      // Determine MIME type
      let mimetype: string;
      switch (job.parameters.format) {
        case ImageFormat.JPEG:
          mimetype = 'image/jpeg';
          break;
        case ImageFormat.TIFF:
          mimetype = 'image/tiff';
          break;
        case ImageFormat.PNG:
        default:
          mimetype = 'image/png';
          break;
      }

      // Return file information
      return {
        path: job.filePath,
        filename: path.basename(job.filePath),
        mimetype,
        size: stats.size
      };
    } catch (error) {
      logger.error(`Failed to get snapshot file: ${error}`);
      throw new Error(`Snapshot file retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up snapshots for a session
   * @param sessionId Session ID
   * @returns Number of snapshots cleaned up
   */
  public async cleanupSessionSnapshots(sessionId: string): Promise<number> {
    try {
      return await renderingQueue.cleanupSessionJobs(sessionId);
    } catch (error) {
      logger.error(`Failed to clean up session snapshots: ${error}`);
      throw new Error(`Session snapshot cleanup failed: ${(error as Error).message}`);
    }
  }

  /**
   * Convert a rendering job to snapshot metadata
   * @param job Rendering job
   * @param sessionId Session ID
   * @returns Snapshot metadata
   * @private
   */
  private convertToMetadata(job: any, sessionId: string): SnapshotMetadata {
    // Create URL for the snapshot if it's completed
    let url: string | undefined;
    if (job.status === RenderingJobStatus.COMPLETED && job.filePath) {
      url = `/api/sessions/${sessionId}/snapshots/${job.id}/file`;
    }

    return {
      id: job.id,
      sessionId: job.sessionId,
      parameters: job.parameters,
      status: job.status,
      message: job.message,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : undefined,
      fileSize: job.fileSize,
      url
    };
  }
}

// Export singleton instance
export const snapshotService = new SnapshotService();
export default snapshotService;