import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import snapshotService from '../services/snapshot';
import logger from '../utils/logger';
import { ApiResponse } from '../../shared/types';
import { SnapshotMetadata, SnapshotParameters } from '../types/rendering';

/**
 * Snapshot Controller
 * Handles HTTP requests related to snapshots and molecular renderings
 */
export const snapshotController = {
  /**
   * Create a new snapshot for a session
   * POST /api/sessions/:sessionId/snapshots
   */
  createSnapshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const parameters: SnapshotParameters = req.body;
      
      const snapshot = await snapshotService.createSnapshot(sessionId, parameters);
      
      const response: ApiResponse<SnapshotMetadata> = {
        status: 'success',
        data: snapshot,
      };
      
      res.status(201).json(response);
    } catch (error) {
      logger.error(`Error creating snapshot: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Get a snapshot by ID
   * GET /api/sessions/:sessionId/snapshots/:snapshotId
   */
  getSnapshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, snapshotId } = req.params;
      
      const snapshot = await snapshotService.getSnapshot(sessionId, snapshotId);
      
      const response: ApiResponse<SnapshotMetadata> = {
        status: 'success',
        data: snapshot,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting snapshot: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Get all snapshots for a session
   * GET /api/sessions/:sessionId/snapshots
   */
  getSessionSnapshots: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      
      const snapshots = await snapshotService.getSessionSnapshots(sessionId);
      
      const response: ApiResponse<SnapshotMetadata[]> = {
        status: 'success',
        data: snapshots,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting session snapshots: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Delete a snapshot
   * DELETE /api/sessions/:sessionId/snapshots/:snapshotId
   */
  deleteSnapshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, snapshotId } = req.params;
      
      await snapshotService.deleteSnapshot(sessionId, snapshotId);
      
      const response: ApiResponse = {
        status: 'success',
        message: `Snapshot ${snapshotId} deleted successfully`,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error deleting snapshot: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Get snapshot file
   * GET /api/sessions/:sessionId/snapshots/:snapshotId/file
   */
  getSnapshotFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, snapshotId } = req.params;
      
      const fileInfo = await snapshotService.getSnapshotFile(sessionId, snapshotId);
      
      if (!fileInfo) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'SNAPSHOT_FILE_NOT_FOUND',
            message: 'Snapshot file not found or not yet rendered',
          },
        });
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', fileInfo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.filename}"`);
      res.setHeader('Content-Length', fileInfo.size);
      
      // Stream the file
      const fileStream = fs.createReadStream(fileInfo.path);
      fileStream.pipe(res);
    } catch (error) {
      logger.error(`Error getting snapshot file: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Update view settings for a session
   * PUT /api/sessions/:sessionId/view
   */
  updateViewSettings: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const viewSettings = req.body;
      
      const result = await snapshotService.updateViewSettings(sessionId, viewSettings);
      
      const response: ApiResponse = {
        status: 'success',
        message: result.message,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error updating view settings: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Apply styles to molecules in a session
   * POST /api/sessions/:sessionId/styles
   */
  applyStyles: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const styleSettings = req.body;
      
      const result = await snapshotService.applyStyles(sessionId, styleSettings);
      
      const response: ApiResponse = {
        status: 'success',
        message: result.message,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error applying styles: ${(error as Error).message}`);
      next(error);
    }
  },
};

export default snapshotController;