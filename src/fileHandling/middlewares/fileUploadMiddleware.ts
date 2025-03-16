import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import config from '../config';
import logger from '../../server/utils/logger';

// Ensure upload directory exists
if (!fs.existsSync(config.directories.temp)) {
  fs.mkdirSync(config.directories.temp, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.directories.temp);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Extract extension and convert to lowercase
  const extension = path.extname(file.originalname).toLowerCase().slice(1);
  
  // Check if extension is supported
  if (!config.supportedExtensions.includes(extension)) {
    const error = new Error(`Unsupported file extension: ${extension}. Supported extensions: ${config.supportedExtensions.join(', ')}`);
    return cb(error);
  }
  
  // Accept the file
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.limits.fileSize,
    files: config.limits.files,
    fieldSize: config.limits.fieldSize,
  },
});

/**
 * Middleware to handle single file uploads
 */
export const singleFileUpload = upload.single('file');

/**
 * Middleware to handle multiple file uploads
 */
export const multiFileUpload = upload.array('files', config.limits.files);

/**
 * Error handling middleware for multer errors
 */
export function handleFileUploadErrors(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during upload
    let statusCode = 400;
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413; // Payload Too Large
        message = `File too large. Maximum size is ${config.limits.fileSize / 1024 / 1024} MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        statusCode = 400;
        message = `Too many files. Maximum is ${config.limits.files} files per upload`;
        break;
      case 'LIMIT_FIELD_VALUE':
        statusCode = 413;
        message = 'Field value too large';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400;
        message = 'Unexpected field name in form upload';
        break;
      default:
        message = err.message;
    }
    
    logger.warn(`Multer upload error: ${err.code} - ${message}`);
    res.status(statusCode).json({
      status: 'error',
      message,
      error: {
        code: err.code,
        field: err.field
      }
    });
  } else if (err) {
    // Other errors (e.g., from fileFilter)
    logger.warn(`File upload error: ${err.message}`);
    res.status(400).json({
      status: 'error',
      message: err.message,
      error: {
        code: 'UPLOAD_ERROR'
      }
    });
  } else {
    // No error, continue
    next();
  }
}