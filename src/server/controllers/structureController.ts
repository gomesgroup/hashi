import { Request, Response, NextFunction } from 'express';
import structureService from '../services/structureService';
import sessionService from '../services/session';
import logger from '../utils/logger';
import { AtomProperties } from '../types/structure';

/**
 * Structure Modification Controller
 * 
 * Handles HTTP requests for molecular structure modification:
 * - Selection of atoms, residues, and molecules
 * - Adding, modifying, and deleting atoms
 * - Adding and removing bonds
 * - Applying transformations
 * - Energy minimization
 * - Undo/redo operations
 */
export const structureController = {
  /**
   * Creates a new selection in a ChimeraX session
   * POST /api/sessions/:sessionId/select
   */
  createSelection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const criteria = req.body;

      const result = await structureService.createSelection(sessionId, criteria);

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error creating selection: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Modifies atom properties in a selection
   * PUT /api/sessions/:sessionId/structures/:structureId/atoms
   */
  modifyAtoms: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const { selectionName, properties } = req.body;

      const result = await structureService.modifyAtoms(
        sessionId,
        properties as AtomProperties,
        selectionName
      );

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error modifying atoms: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Adds new atoms to a structure
   * POST /api/sessions/:sessionId/structures/:structureId/atoms
   */
  addAtoms: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const structureId = req.params.structureId;
      const { atoms } = req.body;

      const result = await structureService.addAtoms(
        sessionId,
        atoms,
        structureId
      );

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error adding atoms: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Removes atoms from a structure
   * DELETE /api/sessions/:sessionId/structures/:structureId/atoms
   */
  removeAtoms: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const { selectionName } = req.body;

      const result = await structureService.removeAtoms(sessionId, selectionName);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error removing atoms: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Adds bonds between atoms
   * POST /api/sessions/:sessionId/structures/:structureId/bonds
   */
  addBonds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const { bonds } = req.body;

      const result = await structureService.addBonds(sessionId, bonds);

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error adding bonds: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Removes bonds from a structure
   * DELETE /api/sessions/:sessionId/structures/:structureId/bonds
   */
  removeBonds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const { selectionName } = req.body;

      const result = await structureService.removeBonds(sessionId, selectionName);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error removing bonds: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Applies a transformation to a structure
   * POST /api/sessions/:sessionId/structures/:structureId/transform
   */
  applyTransformation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const params = req.body;

      // If structureId was provided in the URL, add it to the params
      if (req.params.structureId && !params.structureId) {
        params.structureId = req.params.structureId;
      }

      const result = await structureService.applyTransformation(sessionId, params);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error applying transformation: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Performs energy minimization on a selection or structure
   * POST /api/sessions/:sessionId/structures/:structureId/minimize
   */
  performMinimization: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const params = req.body;

      // If structureId was provided in the URL, add it to the params
      if (req.params.structureId && !params.structureId) {
        params.structureId = req.params.structureId;
      }

      const result = await structureService.performMinimization(sessionId, params);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error performing minimization: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Undoes the last operation on a session
   * POST /api/sessions/:sessionId/undo
   */
  undoOperation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const result = await structureService.undoOperation(sessionId);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error undoing operation: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Redoes the last undone operation on a session
   * POST /api/sessions/:sessionId/redo
   */
  redoOperation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const result = await structureService.redoOperation(sessionId);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`Error redoing operation: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Gets the transaction history for a session
   * GET /api/sessions/:sessionId/transactions
   */
  getTransactionHistory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const transactions = structureService.getTransactionHistory(sessionId);

      res.status(200).json({
        status: 'success',
        data: {
          transactions
        }
      });
    } catch (error) {
      logger.error(`Error getting transaction history: ${(error as Error).message}`);
      next(error);
    }
  }
};

export default structureController;