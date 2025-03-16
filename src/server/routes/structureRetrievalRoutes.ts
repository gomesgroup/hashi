import { Router } from 'express';
import structureRetrievalController from '../controllers/structureRetrievalController';
import { authMiddleware, sessionAuthMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * Structure Routes
 */

/**
 * @swagger
 * /api/sessions/{sessionId}/structures:
 *   get:
 *     summary: Get all structures in a session
 *     description: Retrieves a list of all molecular structures in a ChimeraX session
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: List of structures retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StructureMetadata'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getStructures
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}:
 *   get:
 *     summary: Get complete structure data
 *     description: Retrieves complete data for a specific molecular structure in a session
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: path
 *         name: structureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Structure ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdb, mmcif, cif, sdf, mol2, xyz]
 *           default: json
 *         description: Output format
 *     responses:
 *       200:
 *         description: Structure data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/StructureData'
 *           chemical/x-pdb:
 *             schema:
 *               type: string
 *           chemical/x-cif:
 *             schema:
 *               type: string
 *           chemical/x-mdl-sdfile:
 *             schema:
 *               type: string
 *           chemical/x-mol2:
 *             schema:
 *               type: string
 *           chemical/x-xyz:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures/:structureId',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getStructure
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/metadata:
 *   get:
 *     summary: Get structure metadata
 *     description: Retrieves metadata for a specific molecular structure in a session
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: path
 *         name: structureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Structure ID
 *     responses:
 *       200:
 *         description: Structure metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/StructureMetadata'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures/:structureId/metadata',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getStructureMetadata
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/atoms:
 *   get:
 *     summary: Get atom data for a structure
 *     description: Retrieves atom coordinate data for a specific molecular structure
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: path
 *         name: structureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Structure ID
 *       - in: query
 *         name: chains
 *         schema:
 *           type: string
 *         description: Comma-separated list of chain IDs
 *       - in: query
 *         name: residues
 *         schema:
 *           type: string
 *         description: Comma-separated list of residue numbers
 *       - in: query
 *         name: elements
 *         schema:
 *           type: string
 *         description: Comma-separated list of element symbols
 *       - in: query
 *         name: atomSerials
 *         schema:
 *           type: string
 *         description: Comma-separated list of atom serial numbers
 *       - in: query
 *         name: ligands
 *         schema:
 *           type: boolean
 *         description: Filter for ligands only
 *       - in: query
 *         name: water
 *         schema:
 *           type: boolean
 *         description: Include/exclude water molecules
 *       - in: query
 *         name: metals
 *         schema:
 *           type: boolean
 *         description: Include/exclude metal atoms
 *       - in: query
 *         name: residueRanges
 *         schema:
 *           type: string
 *           format: json
 *         description: JSON array of objects with chain, start, end properties
 *       - in: query
 *         name: distanceFrom
 *         schema:
 *           type: string
 *           format: json
 *         description: JSON object with x, y, z, radius properties
 *     responses:
 *       200:
 *         description: Atom data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AtomData'
 *       400:
 *         description: Invalid filter parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures/:structureId/atoms',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getAtoms
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/bonds:
 *   get:
 *     summary: Get bond data for a structure
 *     description: Retrieves bond connectivity data for a specific molecular structure
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: path
 *         name: structureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Structure ID
 *     responses:
 *       200:
 *         description: Bond data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BondData'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures/:structureId/bonds',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getBonds
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/properties:
 *   get:
 *     summary: Get calculated properties for a structure
 *     description: Retrieves calculated molecular properties for a specific structure
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: path
 *         name: structureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Structure ID
 *     responses:
 *       200:
 *         description: Structure properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/StructureProperties'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:sessionId/structures/:structureId/properties',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.getProperties
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/cache:
 *   delete:
 *     summary: Clear structure cache for a session
 *     description: Clears cached structure data for a specific session
 *     tags:
 *       - Structures
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cache cleared for session {sessionId}
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete(
  '/:sessionId/structures/cache',
  authMiddleware,
  sessionAuthMiddleware,
  structureRetrievalController.clearCache
);

export default router;