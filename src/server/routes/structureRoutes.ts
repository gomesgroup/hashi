import { Router } from 'express';
import structureController from '../controllers/structureController';
import { authMiddleware, sessionAuthMiddleware } from '../middlewares/auth';
import { validateRequest, sessionIdSchema, selectionSchema, modifyAtomsSchema, addAtomsSchema, removeAtomsSchema, addBondsSchema, removeBondsSchema, transformationSchema, minimizationSchema } from '../middlewares/validation';

const router = Router({ mergeParams: true });

// Apply authentication to all structure routes
router.use(authMiddleware);
router.use(validateRequest(sessionIdSchema, 'params'));
router.use(sessionAuthMiddleware);

/**
 * @swagger
 * /api/sessions/{sessionId}/select:
 *   post:
 *     summary: Create a selection in a ChimeraX session
 *     description: Creates a new selection of atoms, residues, chains, or molecules
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [atom, residue, chain, molecule, model]
 *                 description: Type of selection
 *               specifier:
 *                 type: string
 *                 description: Selection specifier (e.g., "protein", "#1", ":1-10", etc.)
 *               options:
 *                 type: object
 *                 properties:
 *                   extend:
 *                     type: boolean
 *                     description: Extend the current selection
 *                   invert:
 *                     type: boolean
 *                     description: Invert the selection
 *                   replace:
 *                     type: boolean
 *                     description: Replace the current selection
 *     responses:
 *       201:
 *         description: Selection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     selectionName:
 *                       type: string
 *                       description: Unique name for the selection
 *                     count:
 *                       type: integer
 *                       description: Number of selected entities
 *                     type:
 *                       type: string
 *                       enum: [atom, residue, chain, molecule, model]
 *                     specifier:
 *                       type: string
 *                       description: Selection specifier used
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post(
  '/select',
  validateRequest(selectionSchema),
  structureController.createSelection
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/atoms:
 *   put:
 *     summary: Modify atom properties
 *     description: Modifies properties of selected atoms
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selectionName
 *               - properties
 *             properties:
 *               selectionName:
 *                 type: string
 *                 description: Name of the selection to modify
 *               properties:
 *                 type: object
 *                 properties:
 *                   element:
 *                     type: string
 *                     description: Element symbol
 *                   name:
 *                     type: string
 *                     description: Atom name
 *                   position:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 3
 *                     maxItems: 3
 *                     description: Atom position [x, y, z]
 *                   charge:
 *                     type: number
 *                     description: Atom charge
 *                   radius:
 *                     type: number
 *                     description: Atom radius
 *                   serialNumber:
 *                     type: integer
 *                     description: Atom serial number
 *                   occupancy:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Atom occupancy
 *                   bfactor:
 *                     type: number
 *                     description: Atom B-factor
 *     responses:
 *       200:
 *         description: Atoms modified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session or selection not found
 *       500:
 *         description: Server error
 */
router.put(
  '/structures/:structureId/atoms',
  validateRequest(modifyAtomsSchema),
  structureController.modifyAtoms
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/atoms:
 *   post:
 *     summary: Add atoms to a structure
 *     description: Adds new atoms to an existing structure
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - atoms
 *             properties:
 *               atoms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     element:
 *                       type: string
 *                       description: Element symbol
 *                     name:
 *                       type: string
 *                       description: Atom name
 *                     position:
 *                       type: array
 *                       items:
 *                         type: number
 *                       minItems: 3
 *                       maxItems: 3
 *                       description: Atom position [x, y, z]
 *                     charge:
 *                       type: number
 *                       description: Atom charge
 *                     serialNumber:
 *                       type: integer
 *                       description: Atom serial number
 *                     occupancy:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *                       description: Atom occupancy
 *                     bfactor:
 *                       type: number
 *                       description: Atom B-factor
 *     responses:
 *       201:
 *         description: Atoms added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *                     data:
 *                       type: object
 *                       properties:
 *                         addedCount:
 *                           type: integer
 *                           description: Number of atoms added
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.post(
  '/structures/:structureId/atoms',
  validateRequest(addAtomsSchema),
  structureController.addAtoms
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/atoms:
 *   delete:
 *     summary: Remove atoms from a structure
 *     description: Removes atoms from a structure based on a selection
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selectionName
 *             properties:
 *               selectionName:
 *                 type: string
 *                 description: Name of the selection containing atoms to remove
 *     responses:
 *       200:
 *         description: Atoms removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *                     data:
 *                       type: object
 *                       properties:
 *                         removedCount:
 *                           type: integer
 *                           description: Number of atoms removed
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session, structure, or selection not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/structures/:structureId/atoms',
  validateRequest(removeAtomsSchema),
  structureController.removeAtoms
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/bonds:
 *   post:
 *     summary: Add bonds between atoms
 *     description: Creates new bonds between atoms in a structure
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bonds
 *             properties:
 *               bonds:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - atom1
 *                     - atom2
 *                   properties:
 *                     atom1:
 *                       type: string
 *                       description: Specification for the first atom
 *                     atom2:
 *                       type: string
 *                       description: Specification for the second atom
 *                     order:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 3
 *                       description: Bond order (1=single, 2=double, 3=triple)
 *                     length:
 *                       type: number
 *                       description: Bond length in Angstroms
 *                     type:
 *                       type: string
 *                       description: Bond type
 *     responses:
 *       201:
 *         description: Bonds added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *                     data:
 *                       type: object
 *                       properties:
 *                         addedCount:
 *                           type: integer
 *                           description: Number of bonds added
 *                         failedCount:
 *                           type: integer
 *                           description: Number of bonds that failed to add
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session or structure not found
 *       500:
 *         description: Server error
 */
router.post(
  '/structures/:structureId/bonds',
  validateRequest(addBondsSchema),
  structureController.addBonds
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/bonds:
 *   delete:
 *     summary: Remove bonds from a structure
 *     description: Removes bonds from a structure based on a selection
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selectionName
 *             properties:
 *               selectionName:
 *                 type: string
 *                 description: Name of the selection containing bonds to remove
 *     responses:
 *       200:
 *         description: Bonds removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session, structure, or selection not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/structures/:structureId/bonds',
  validateRequest(removeBondsSchema),
  structureController.removeBonds
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/transform:
 *   post:
 *     summary: Apply transformation to a structure
 *     description: Applies a transformation (rotation, translation, etc.) to a structure or selection
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [rotate, translate, center, scale, matrix]
 *                 description: Type of transformation
 *               selectionName:
 *                 type: string
 *                 description: Name of the selection to transform
 *               angle:
 *                 type: number
 *                 description: Rotation angle in degrees (for rotate)
 *               axis:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 3
 *                 maxItems: 3
 *                 description: Rotation axis [x, y, z] (for rotate)
 *               center:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 3
 *                 maxItems: 3
 *                 description: Center point [x, y, z] (for rotate)
 *               translation:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 3
 *                 maxItems: 3
 *                 description: Translation vector [x, y, z] (for translate)
 *               factor:
 *                 type: number
 *                 description: Scaling factor (for scale)
 *               matrix:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                   minItems: 4
 *                   maxItems: 4
 *                 minItems: 4
 *                 maxItems: 4
 *                 description: 4x4 transformation matrix (for matrix)
 *     responses:
 *       200:
 *         description: Transformation applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session, structure, or selection not found
 *       500:
 *         description: Server error
 */
router.post(
  '/structures/:structureId/transform',
  validateRequest(transformationSchema),
  structureController.applyTransformation
);

/**
 * @swagger
 * /api/sessions/{sessionId}/structures/{structureId}/minimize:
 *   post:
 *     summary: Perform energy minimization
 *     description: Performs energy minimization on a structure or selection
 *     tags:
 *       - Structure Modification
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selectionName:
 *                 type: string
 *                 description: Name of the selection to minimize
 *               steps:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of minimization steps
 *               algorithm:
 *                 type: string
 *                 description: Minimization algorithm
 *               forceField:
 *                 type: string
 *                 description: Force field to use
 *               cutoff:
 *                 type: number
 *                 minimum: 0
 *                 description: Non-bonded interaction cutoff distance
 *               maxIterations:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of iterations
 *               energyTolerance:
 *                 type: number
 *                 minimum: 0
 *                 description: Energy convergence criterion
 *     responses:
 *       200:
 *         description: Minimization performed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     initialEnergy:
 *                       type: number
 *                       description: Initial energy before minimization
 *                     finalEnergy:
 *                       type: number
 *                       description: Final energy after minimization
 *                     steps:
 *                       type: integer
 *                       description: Number of steps performed
 *                     converged:
 *                       type: boolean
 *                       description: Whether the minimization converged
 *                     rmsd:
 *                       type: number
 *                       description: Root mean square deviation of atoms
 *                     duration:
 *                       type: number
 *                       description: Duration of minimization in milliseconds
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session, structure, or selection not found
 *       500:
 *         description: Server error
 */
router.post(
  '/structures/:structureId/minimize',
  validateRequest(minimizationSchema),
  structureController.performMinimization
);

/**
 * @swagger
 * /api/sessions/{sessionId}/undo:
 *   post:
 *     summary: Undo last operation
 *     description: Undoes the last operation in the session
 *     tags:
 *       - Structure Modification
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
 *         description: Operation undone successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *                     data:
 *                       type: object
 *                       properties:
 *                         operation:
 *                           type: string
 *                           description: Type of operation that was undone
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post(
  '/undo',
  structureController.undoOperation
);

/**
 * @swagger
 * /api/sessions/{sessionId}/redo:
 *   post:
 *     summary: Redo last undone operation
 *     description: Redoes the last undone operation in the session
 *     tags:
 *       - Structure Modification
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
 *         description: Operation redone successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                       description: Transaction ID
 *                     success:
 *                       type: boolean
 *                       description: Whether the operation was successful
 *                     message:
 *                       type: string
 *                       description: Result message
 *                     data:
 *                       type: object
 *                       properties:
 *                         operation:
 *                           type: string
 *                           description: Type of operation that was redone
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post(
  '/redo',
  structureController.redoOperation
);

/**
 * @swagger
 * /api/sessions/{sessionId}/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Gets the transaction history for a session
 *     tags:
 *       - Structure Modification
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
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             description: Transaction ID
 *                           sessionId:
 *                             type: string
 *                             format: uuid
 *                             description: Session ID
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                             description: Timestamp of the transaction
 *                           operation:
 *                             type: string
 *                             description: Type of operation
 *                           parameters:
 *                             type: object
 *                             description: Operation parameters
 *                           selectionName:
 *                             type: string
 *                             description: Name of the selection
 *                           structureId:
 *                             type: string
 *                             description: Structure ID
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get(
  '/transactions',
  structureController.getTransactionHistory
);

export default router;