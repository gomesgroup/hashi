import { Router } from 'express';
import chimeraxController from '../controllers/chimeraxController';

const router = Router();

/**
 * ChimeraX Process Routes
 */

// Process management
router.post('/processes', chimeraxController.createProcess);
router.get('/processes', chimeraxController.getProcesses);
router.get('/processes/:id', chimeraxController.getProcess);
router.delete('/processes/:id', chimeraxController.terminateProcess);

// Command execution
router.post('/processes/:id/command', chimeraxController.sendCommand);

// Maintenance
router.post('/cleanup', chimeraxController.cleanupProcesses);

export default router;