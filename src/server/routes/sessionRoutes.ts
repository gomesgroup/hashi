import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import { authMiddleware, sessionAuthMiddleware } from '../middlewares/auth';
import { validateRequest, createSessionSchema, sessionIdSchema } from '../middlewares/validation';
import snapshotRoutes from './snapshotRoutes';

const router = Router();

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new session
 *     description: Creates a new ChimeraX session with optional molecular structure file or PDB ID
 *     tags:
 *       - Sessions
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Molecular structure file to upload
 *               pdbId:
 *                 type: string
 *                 description: PDB ID to load
 *     responses:
 *       201:
 *         description: Session created successfully
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
 *                     session:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         created:
 *                           type: string
 *                           format: date-time
 *                         lastActive:
 *                           type: string
 *                           format: date-time
 *                         port:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           enum: [initializing, ready, busy, error, terminated]
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 *       503:
 *         description: Server at maximum capacity
 */
router.post(
  '/',
  authMiddleware,
  sessionController.upload.single('file'),
  validateRequest(createSessionSchema),
  sessionController.createSession
);

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session information
 *     description: Retrieves information about a specific session
 *     tags:
 *       - Sessions
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session information retrieved successfully
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
 *                     session:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         created:
 *                           type: string
 *                           format: date-time
 *                         lastActive:
 *                           type: string
 *                           format: date-time
 *                         port:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           enum: [initializing, ready, busy, error, terminated]
 *       400:
 *         description: Invalid session ID format
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
  '/:id',
  authMiddleware,
  validateRequest(sessionIdSchema, 'params'),
  sessionAuthMiddleware,
  sessionController.getSession
);

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Terminate a session
 *     description: Terminates a session and its associated ChimeraX process
 *     tags:
 *       - Sessions
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session terminated successfully
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
 *                   example: Session terminated successfully
 *       400:
 *         description: Invalid session ID format
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authMiddleware,
  validateRequest(sessionIdSchema, 'params'),
  sessionAuthMiddleware,
  sessionController.terminateSession
);

/**
 * @swagger
 * /api/sessions/{id}/heartbeat:
 *   put:
 *     summary: Update session activity timestamp
 *     description: Updates the activity timestamp for a session to prevent timeout
 *     tags:
 *       - Sessions
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session activity updated successfully
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
 *                     session:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         created:
 *                           type: string
 *                           format: date-time
 *                         lastActive:
 *                           type: string
 *                           format: date-time
 *                         port:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           enum: [initializing, ready, busy, error, terminated]
 *       400:
 *         description: Invalid session ID format
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - no access to this session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id/heartbeat',
  authMiddleware,
  validateRequest(sessionIdSchema, 'params'),
  sessionAuthMiddleware,
  sessionController.updateSessionActivity
);

// Mount snapshot routes
router.use(
  '/:id',
  authMiddleware,
  validateRequest(sessionIdSchema, 'params'),
  sessionAuthMiddleware,
  snapshotRoutes
);

export default router;