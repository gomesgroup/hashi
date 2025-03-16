import { Router } from 'express';
import snapshotController from '../controllers/snapshotController';
import movieController from '../controllers/movieController';

const router = Router({ mergeParams: true });

/**
 * Snapshot and Rendering Routes
 * All routes are relative to /api/sessions/:sessionId
 */

// Snapshot management
router.post('/snapshots', snapshotController.createSnapshot);
router.get('/snapshots', snapshotController.getSessionSnapshots);
router.get('/snapshots/:snapshotId', snapshotController.getSnapshot);
router.delete('/snapshots/:snapshotId', snapshotController.deleteSnapshot);
router.get('/snapshots/:snapshotId/file', snapshotController.getSnapshotFile);

// Movie management
router.post('/movies', movieController.createMovie);
router.get('/movies/:movieId', movieController.getMovieStatus);
router.get('/movies/:movieId/file', movieController.getMovieFile);

// View and style management
router.put('/view', snapshotController.updateViewSettings);
router.post('/styles', snapshotController.applyStyles);

export default router;