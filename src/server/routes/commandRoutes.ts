import { Router } from 'express';
import commandController from '../controllers/commandController';
import { authMiddleware } from '../middlewares/auth';
import { sessionAuthMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * Command API Routes
 * 
 * Routes for executing ChimeraX commands and managing command history
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Session-specific command routes
// These require session authentication to verify the user has access to the session
router.post('/sessions/:sessionId/commands', sessionAuthMiddleware, commandController.executeCommand);
router.post('/sessions/:sessionId/command-sequence', sessionAuthMiddleware, commandController.executeCommandSequence);
router.get('/sessions/:sessionId/commands', sessionAuthMiddleware, commandController.getCommandHistory);
router.delete('/sessions/:sessionId/commands', sessionAuthMiddleware, commandController.clearCommandHistory);

// Command documentation routes
// These don't require session authentication as they're generic information
router.get('/commands/help', commandController.getCommandDocs);
router.get('/commands/help/:commandName', commandController.getCommandDoc);

export default router;