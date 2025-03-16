import { Request, Response, NextFunction } from 'express';
import structureRetrievalService from '../services/structureRetrievalService';
import logger from '../utils/logger';
import { StructureFormat, StructureFilter } from '../types/chimerax';
import { ApiResponse } from '../../shared/types';

/**
 * Structure Retrieval Controller
 * Handles HTTP requests related to retrieving molecular structure data
 */
export const structureRetrievalController = {
  /**
   * Get all structures in a session
   * GET /api/sessions/:sessionId/structures
   */
  getStructures: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId;
      const structures = await structureRetrievalService.getStructures(sessionId);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        data: structures.map(structure => ({
          ...structure,
          created: structure.created.toISOString(),
        }))
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting structures: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'SESSION_NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Get structure metadata
   * GET /api/sessions/:sessionId/structures/:structureId/metadata
   */
  getStructureMetadata: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, structureId } = req.params;
      const metadata = await structureRetrievalService.getStructureMetadata(sessionId, structureId);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        data: {
          ...metadata,
          created: metadata.created.toISOString(),
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting structure metadata: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Get complete structure data
   * GET /api/sessions/:sessionId/structures/:structureId
   */
  getStructure: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, structureId } = req.params;
      const format = (req.query.format as string || 'json').toLowerCase();
      
      // Validate the format
      let structureFormat: StructureFormat;
      switch (format) {
        case 'json':
          structureFormat = StructureFormat.JSON;
          break;
        case 'pdb':
          structureFormat = StructureFormat.PDB;
          break;
        case 'mmcif':
        case 'cif':
          structureFormat = StructureFormat.CIF;
          break;
        case 'sdf':
          structureFormat = StructureFormat.SDF;
          break;
        case 'mol2':
          structureFormat = StructureFormat.MOL2;
          break;
        case 'xyz':
          structureFormat = StructureFormat.XYZ;
          break;
        default:
          return res.status(400).json({
            status: 'error',
            error: {
              code: 'INVALID_FORMAT',
              details: `Unsupported format: ${format}. Supported formats: json, pdb, mmcif, sdf, mol2, xyz`
            }
          });
      }
      
      // Get the structure data
      const structureData = await structureRetrievalService.getStructure(
        sessionId, 
        structureId,
        structureFormat
      );

      // For non-JSON formats, return plain text response
      if (structureFormat !== StructureFormat.JSON) {
        const contentType = this.getContentTypeForFormat(structureFormat);
        res.set('Content-Type', contentType);
        return res.status(200).send(structureData);
      }

      // For JSON format, format the response
      const response: ApiResponse = {
        status: 'success',
        data: {
          ...structureData,
          metadata: {
            ...structureData.metadata,
            created: structureData.metadata.created.toISOString(),
          },
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting structure data: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Get atom data for a structure
   * GET /api/sessions/:sessionId/structures/:structureId/atoms
   */
  getAtoms: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, structureId } = req.params;
      
      // Parse filter parameters from query
      const filter: StructureFilter = {};
      
      if (req.query.chains) {
        filter.chains = (req.query.chains as string).split(',');
      }
      
      if (req.query.residues) {
        filter.residues = (req.query.residues as string).split(',').map(Number);
      }
      
      if (req.query.elements) {
        filter.elements = (req.query.elements as string).split(',');
      }
      
      if (req.query.atomSerials) {
        filter.atomSerials = (req.query.atomSerials as string).split(',').map(Number);
      }
      
      if (req.query.ligands !== undefined) {
        filter.ligands = req.query.ligands === 'true';
      }
      
      if (req.query.water !== undefined) {
        filter.water = req.query.water === 'true';
      }
      
      if (req.query.metals !== undefined) {
        filter.metals = req.query.metals === 'true';
      }
      
      // Parse residue ranges if provided
      if (req.query.residueRanges) {
        try {
          filter.residueRanges = JSON.parse(req.query.residueRanges as string);
        } catch (e) {
          return res.status(400).json({
            status: 'error',
            error: {
              code: 'INVALID_PARAMETER',
              details: 'Invalid residueRanges format. Expected JSON array of {chain, start, end} objects.'
            }
          });
        }
      }
      
      // Parse distance filter if provided
      if (req.query.distanceFrom) {
        try {
          filter.distanceFrom = JSON.parse(req.query.distanceFrom as string);
        } catch (e) {
          return res.status(400).json({
            status: 'error',
            error: {
              code: 'INVALID_PARAMETER',
              details: 'Invalid distanceFrom format. Expected JSON object with {x, y, z, radius} properties.'
            }
          });
        }
      }
      
      // Get the atom data
      const atoms = await structureRetrievalService.getAtoms(sessionId, structureId, filter);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        data: atoms
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting atom data: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Get bond data for a structure
   * GET /api/sessions/:sessionId/structures/:structureId/bonds
   */
  getBonds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, structureId } = req.params;
      const bonds = await structureRetrievalService.getBonds(sessionId, structureId);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        data: bonds
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting bond data: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Get structure properties
   * GET /api/sessions/:sessionId/structures/:structureId/properties
   */
  getProperties: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, structureId } = req.params;
      const properties = await structureRetrievalService.getProperties(sessionId, structureId);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        data: properties
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting structure properties: ${(error as Error).message}`);
      
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            details: (error as Error).message
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * Clear structure cache for a session
   * DELETE /api/sessions/:sessionId/structures/cache
   */
  clearCache: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      structureRetrievalService.clearCachesForSession(sessionId);

      // Format the response
      const response: ApiResponse = {
        status: 'success',
        message: `Cache cleared for session ${sessionId}`
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error clearing structure cache: ${(error as Error).message}`);
      next(error);
    }
  },

  /**
   * Get the appropriate content type for a file format
   * @param format Structure format
   * @returns Content type string
   * @private
   */
  getContentTypeForFormat(format: StructureFormat): string {
    switch (format) {
      case StructureFormat.PDB:
        return 'chemical/x-pdb';
      case StructureFormat.CIF:
        return 'chemical/x-cif';
      case StructureFormat.SDF:
        return 'chemical/x-mdl-sdfile';
      case StructureFormat.MOL2:
        return 'chemical/x-mol2';
      case StructureFormat.XYZ:
        return 'chemical/x-xyz';
      default:
        return 'application/json';
    }
  }
};

export default structureRetrievalController;