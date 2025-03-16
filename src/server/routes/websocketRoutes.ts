import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import websocketController from '../controllers/websocketController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: WebSocket
 *   description: WebSocket API fallback endpoints
 */

/**
 * @swagger
 * /ws-api/status:
 *   get:
 *     summary: Get WebSocket server status
 *     tags: [WebSocket]
 *     responses:
 *       200:
 *         description: WebSocket server status
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
 *                     totalConnections:
 *                       type: number
 *                       example: 10
 *                     authenticatedConnections:
 *                       type: number
 *                       example: 8
 *                     openConnections:
 *                       type: number
 *                       example: 10
 *                     sessionConnections:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         "session-id-1": 2
 *                         "session-id-2": 1
 */
router.get('/status', websocketController.getStatus);

/**
 * @swagger
 * /ws-api/send:
 *   post:
 *     summary: Send a message using REST (WebSocket fallback)
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - payload
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Target session ID
 *               type:
 *                 type: string
 *                 description: Message type
 *               payload:
 *                 type: object
 *                 description: Message payload
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                     messageId:
 *                       type: string
 *                     delivered:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 */
router.post('/send', authMiddleware, websocketController.sendMessage);

/**
 * @swagger
 * /ws-api/broadcast:
 *   post:
 *     summary: Broadcast a message to all session connections (WebSocket fallback)
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - type
 *               - payload
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Target session ID
 *               type:
 *                 type: string
 *                 description: Message type
 *               payload:
 *                 type: object
 *                 description: Message payload
 *     responses:
 *       200:
 *         description: Message broadcast successfully
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
 *                     messageId:
 *                       type: string
 *                     deliveredCount:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 */
router.post('/broadcast', authMiddleware, websocketController.broadcastToSession);

/**
 * @swagger
 * /ws-api/connections/session/{sessionId}:
 *   get:
 *     summary: Get active WebSocket connections for a session
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session connections
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       connectedAt:
 *                         type: string
 *                       lastActiveAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.get('/connections/session/:sessionId', authMiddleware, websocketController.getSessionConnections);

/**
 * @swagger
 * /ws-api/notify/operation:
 *   post:
 *     summary: Send operation status notification
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - operationId
 *               - operationType
 *               - status
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Target session ID
 *               operationId:
 *                 type: string
 *                 description: Operation ID
 *               operationType:
 *                 type: string
 *                 description: Type of operation
 *               status:
 *                 type: string
 *                 enum: [started, progress, completed, failed]
 *                 description: Operation status
 *               progress:
 *                 type: number
 *                 description: Progress percentage (0-100)
 *               details:
 *                 type: object
 *                 description: Additional details
 *               error:
 *                 type: string
 *                 description: Error message if status is 'failed'
 *     responses:
 *       200:
 *         description: Notification sent successfully
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
 *                     messageId:
 *                       type: string
 *                     deliveredCount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 */
router.post('/notify/operation', authMiddleware, websocketController.notifyOperationStatus);

export default router;