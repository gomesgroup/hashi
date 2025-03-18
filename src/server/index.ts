import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import http from 'http';
import bcrypt from 'bcrypt';
import 'reflect-metadata';

import config from './config';
import swaggerSpec from './config/swagger';
import logger from './utils/logger';
import apiRoutes from './routes/api';
import { initializeDatabase } from './database';
import websocketRoutes from './routes/websocketRoutes';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';
import { initialize as initializeFileHandling } from '../fileHandling';
import { 
  corsMiddleware, 
  securityHeadersMiddleware, 
  rateLimitMiddleware, 
  validationErrorMiddleware 
} from './middlewares/security';

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(securityHeadersMiddleware); // Security headers
app.use(corsMiddleware); // CORS configuration
app.use(rateLimitMiddleware); // Rate limiting

// Basic middleware
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// This middleware is an error handler, so we'll add it after routes

// Request logging
app.use(
  morgan('dev', {
    skip: () => config.server.nodeEnv === 'test',
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!process.env.NODE_ENV?.includes('test')) {
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info(`Created uploads directory at ${uploadsDir}`);
  }
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', apiRoutes);

// WebSocket routes (for fallback HTTP endpoints)
app.use('/ws-api', websocketRoutes);

// Initialize systems
const initializeSystems = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize file handling system
    await initializeFileHandling();
    logger.info('File handling system initialized successfully');
    
    // Initialize authentication system (create default admin user if needed)
    const userModel = (await import('./models/userModel')).default;
    const authService = (await import('./services/authService')).default;
    const { UserRole, UserStatus } = await import('./types/auth');
    
    // Create the default admin account if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hashi.example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminExists = userModel.findByEmail(adminEmail);
    
    if (!adminExists) {
      try {
        // Use private method directly from authService
        const hashedPassword = await bcrypt.hash(adminPassword, config.auth.bcryptSaltRounds);
        userModel.create({
          email: adminEmail,
          password: hashedPassword,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          profile: {
            firstName: 'Admin',
            lastName: 'User'
          }
        });
        logger.info(`Created default admin user with email: ${adminEmail}`);
        if (process.env.NODE_ENV === 'development') {
          logger.info(`Admin password (dev only): ${adminPassword}`);
        }
      } catch (error) {
        logger.error(`Error creating default admin user: ${error}`);
      }
    }
    
    logger.info('Authentication system initialized successfully');
    
    // Initialize storage directories
    const { storageHub } = (await import('./services/storage/StorageHub'));
    // Accessing storage service through storageHub
    const storageService = storageHub.storage;
    logger.info('Storage system initialized successfully');
    
    // Initialize rendering queue system
    const renderingQueue = (await import('./services/renderingQueue')).default;
    await renderingQueue.initialize();
    logger.info('Rendering queue system initialized successfully');
    
    // Initialize movie service
    const movieService = (await import('./services/movieService')).default;
    await movieService.initialize();
    logger.info('Movie service initialized successfully');
    
    // Initialize WebSocket server
    const websocketService = (await import('./services/websocketService')).default;
    await websocketService.initialize(server); // Use the same HTTP server
    logger.info('WebSocket server initialized successfully');
    
    // Initialize WebSocket handlers
    const websocketHandlers = (await import('./websocket/handlers')).default;
    await websocketHandlers.initialize();
    logger.info('WebSocket message handlers initialized successfully');
  } catch (error) {
    logger.error(`System initialization error: ${error}`);
    process.exit(1);
  }
};

// Set up session cleanup interval (every 5 minutes)
if (!process.env.NODE_ENV?.includes('test')) {
  const sessionService = require('./services/session').default;
  setInterval(() => {
    sessionService.cleanupTimedOutSessions()
      .catch((err: Error) => logger.error('Error cleaning up timed out sessions:', err));
  }, 5 * 60 * 1000);
  logger.info('Session cleanup job scheduled every 5 minutes');
}

// Error handling
app.use(notFoundHandler);
// Add validation error middleware before the main error handler
app.use(validationErrorMiddleware as unknown as express.ErrorRequestHandler);
app.use(errorHandler as express.ErrorRequestHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  // Initialize systems and then start server
  initializeSystems().then(() => {
    server.listen(config.server.port, () => {
      logger.info(`Server running in ${config.server.nodeEnv} mode on port ${config.server.port}`);
      logger.info(`API Documentation available at http://localhost:${config.server.port}/api-docs`);
      logger.info(`WebSocket server available at ws://localhost:${config.server.port}${config.websocket.path}`);
    });
  });
} else {
  // Just export the app for testing
  initializeSystems().catch(err => {
    logger.error('Error initializing systems for tests:', err);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Shutting down...');
  
  // Shutdown WebSocket server
  try {
    const websocketService = (await import('./services/websocketService')).default;
    await websocketService.shutdown();
  } catch (error) {
    logger.error(`Error shutting down WebSocket server: ${(error as Error).message}`);
  }
  
  // Close database connection
  try {
    const { AppDataSource } = (await import('./database'));
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error(`Error closing database connection: ${(error as Error).message}`);
  }
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

export default app;