import { Router } from 'express';
import { StorageController } from '../controllers/storageController';
import { authenticate } from '../middlewares/auth';

const router = Router();
const storageController = new StorageController();

// Structure endpoints
router.post('/structures', authenticate, storageController.createStructure);
router.get('/structures/:structureId', authenticate, storageController.getStructure);
router.get('/structures/:structureId/versions/:versionNumber', authenticate, storageController.getStructureVersion);
router.put('/structures/:structureId', authenticate, storageController.updateStructure);
router.delete('/structures/:structureId', authenticate, storageController.deleteStructure);
router.get('/structures/:structureId/compare', authenticate, storageController.compareStructureVersions);

// Session endpoints
router.post('/sessions', authenticate, storageController.createSession);
router.get('/sessions/:sessionId', authenticate, storageController.getSession);
router.get('/sessions/:sessionId/versions/:versionNumber', authenticate, storageController.getSessionVersion);
router.put('/sessions/:sessionId', authenticate, storageController.updateSession);
router.delete('/sessions/:sessionId', authenticate, storageController.deleteSession);

// Project endpoints
router.post('/projects', authenticate, storageController.createProject);
router.get('/projects/:projectId', authenticate, storageController.getProject);
router.put('/projects/:projectId', authenticate, storageController.updateProject);
router.delete('/projects/:projectId', authenticate, storageController.deleteProject);
router.post('/projects/:projectId/structures/:structureId', authenticate, storageController.addStructureToProject);
router.delete('/projects/:projectId/structures/:structureId', authenticate, storageController.removeStructureFromProject);

// Search endpoint
router.get('/search', authenticate, storageController.search);

// User preferences endpoints
router.get('/preferences/:category', authenticate, storageController.getUserPreferences);
router.put('/preferences/:category/:key', authenticate, storageController.setUserPreference);
router.delete('/preferences/:category/:key', authenticate, storageController.deleteUserPreference);
router.delete('/preferences/:category', authenticate, storageController.resetUserPreferences);
router.get('/preferences', authenticate, storageController.exportUserPreferences);
router.post('/preferences', authenticate, storageController.importUserPreferences);

export default router;