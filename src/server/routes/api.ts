import { Router } from 'express';
import sessionRoutes from './sessionRoutes';
import chimeraxRoutes from './chimeraxRoutes';
import commandRoutes from './commandRoutes';
import structureRoutes from './structureRoutes';
import structureRetrievalRoutes from './structureRetrievalRoutes';
import authRoutes from './authRoutes';
import storageRoutes from './storageRoutes';
import { fileRoutes } from '../../fileHandling';
import { optionalAuthMiddleware } from '../middlewares/auth';
import { requestIdMiddleware } from '../middlewares/security';

const router = Router();

// Apply common middleware to all routes
router.use(requestIdMiddleware);
router.use(optionalAuthMiddleware);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date(),
  });
});

// Version endpoint
router.get('/version', (req, res) => {
  res.status(200).json({
    status: 'success',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Authentication and user management routes
router.use('/auth', authRoutes);

// Session management routes
router.use('/sessions', sessionRoutes);

// Structure modification routes
// These routes are mounted on /sessions/:sessionId
router.use('/sessions/:sessionId', structureRoutes);

// Structure retrieval routes
// These routes are mounted on /api/sessions
router.use('/sessions', structureRetrievalRoutes);

// ChimeraX process management routes
router.use('/chimerax', chimeraxRoutes);

// Command API routes
router.use('/', commandRoutes);

// File handling routes
router.use('/files', fileRoutes);

// Persistent storage routes
router.use('/storage', storageRoutes);

export default router;
