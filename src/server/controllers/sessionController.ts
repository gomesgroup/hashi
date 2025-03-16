import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sessionService from '../services/session';
import logger from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create the upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow common molecular structure file formats
    const allowedExtensions = ['.pdb', '.mol', '.mol2', '.xyz', '.cif', '.sdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only molecular structure files are allowed.') as any);
    }
  }
});

/**
 * Create a new session
 * POST /api/sessions
 */
export const createSession = async (req: Request, res: Response) => {
  try {
    let filePath: string | undefined;
    
    // If a file was uploaded, get its path
    if (req.file) {
      filePath = req.file.path;
    }

    // Create the session with options
    const session = await sessionService.createSession({
      userId: req.userId,
      filePath,
      pdbId: req.body.pdbId
    });

    // Return the created session
    return res.status(201).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    
    const appError = error as AppError;
    
    // If this is a maximum instances error, return a 503
    if (appError.message?.includes('Maximum number of ChimeraX instances')) {
      return res.status(503).json({
        status: 'error',
        code: 'SERVICE_UNAVAILABLE',
        message: 'Server is at maximum capacity. Please try again later.'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error creating session',
      details: process.env.NODE_ENV === 'development' ? appError.message : undefined
    });
  }
};

/**
 * Get session information
 * GET /api/sessions/:id
 */
export const getSession = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Session with ID ${sessionId} not found`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    logger.error('Error getting session:', error);
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error getting session information',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Terminate a session
 * DELETE /api/sessions/:id
 */
export const terminateSession = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const success = await sessionService.terminateSession(sessionId);
    
    if (!success) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Session with ID ${sessionId} not found or already terminated`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Session terminated successfully'
    });
  } catch (error) {
    logger.error('Error terminating session:', error);
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error terminating session',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Update session activity (heartbeat)
 * PUT /api/sessions/:id/heartbeat
 */
export const updateSessionActivity = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = sessionService.updateSessionActivity(sessionId);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `Session with ID ${sessionId} not found`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    logger.error('Error updating session activity:', error);
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error updating session activity',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};