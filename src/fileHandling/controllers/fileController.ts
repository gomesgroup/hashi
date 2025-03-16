import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

import * as fileManagerService from '../services/fileManagerService';
import { FileFormat } from '../types';
import { validateFileExtension } from '../validation/fileValidator';
import logger from '../../server/utils/logger';

/**
 * Handle single file upload
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    // File should be available through multer middleware
    const file = req.file;
    if (!file) {
      res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
        error: {
          code: 'NO_FILE'
        }
      });
      return;
    }
    
    // Extract session ID if provided
    const sessionId = req.body.sessionId;
    
    // Read file as buffer
    const buffer = fs.readFileSync(file.path);
    
    // Process file
    const result = await fileManagerService.processFileFromBuffer(
      buffer,
      file.originalname,
      { sessionId }
    );
    
    // Delete temporary file from multer
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      logger.warn(`Failed to delete temporary file: ${file.path}`, err);
    }
    
    // Return result
    res.status(201).json({
      status: 'success',
      data: {
        id: result.id,
        name: result.name,
        type: result.type,
        size: result.size,
        format: result.storage.format,
        uploaded: result.uploaded,
        sessionId: result.sessionId
      }
    });
  } catch (error) {
    logger.error(`File upload error: ${error}`);
    
    // Clean up any temporary files
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    res.status(400).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'UPLOAD_PROCESSING_ERROR'
      }
    });
  }
}

/**
 * Handle multiple file uploads
 */
export async function uploadMultipleFiles(req: Request, res: Response): Promise<void> {
  try {
    // Files should be available through multer middleware
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No files uploaded',
        error: {
          code: 'NO_FILES'
        }
      });
      return;
    }
    
    // Extract session ID if provided
    const sessionId = req.body.sessionId;
    
    // Process each file
    const results = [];
    const tempFilePaths = files.map(file => file.path);
    
    try {
      for (const file of files) {
        // Read file as buffer
        const buffer = fs.readFileSync(file.path);
        
        // Process file
        const result = await fileManagerService.processFileFromBuffer(
          buffer,
          file.originalname,
          { sessionId }
        );
        
        results.push({
          id: result.id,
          name: result.name,
          type: result.type,
          size: result.size,
          format: result.storage.format,
          uploaded: result.uploaded,
          sessionId: result.sessionId
        });
      }
      
      // Return results
      res.status(201).json({
        status: 'success',
        data: results
      });
    } finally {
      // Clean up temporary files from multer
      for (const path of tempFilePaths) {
        try {
          fs.unlinkSync(path);
        } catch (err) {
          logger.warn(`Failed to delete temporary file: ${path}`, err);
        }
      }
    }
  } catch (error) {
    logger.error(`Multiple file upload error: ${error}`);
    
    // Clean up any temporary files
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
    
    res.status(400).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'UPLOAD_PROCESSING_ERROR'
      }
    });
  }
}

/**
 * Download a file
 */
export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.id;
    
    // Get the file
    const file = fileManagerService.getFileById(fileId);
    if (!file) {
      res.status(404).json({
        status: 'error',
        message: 'File not found',
        error: {
          code: 'FILE_NOT_FOUND'
        }
      });
      return;
    }
    
    // Check format conversion parameter
    let filePath = file.storage.path;
    let contentType = file.storage.mimetype;
    
    if (req.query.format) {
      const targetFormat = req.query.format as string;
      
      // Validate requested format
      const validationResult = validateFileExtension(`file.${targetFormat}`);
      if (!validationResult.valid || !validationResult.format) {
        res.status(400).json({
          status: 'error',
          message: `Invalid format: ${targetFormat}`,
          error: {
            code: 'INVALID_FORMAT'
          }
        });
        return;
      }
      
      // Convert if requested format is different from current format
      if (validationResult.format !== file.storage.format) {
        try {
          const convertedFile = await fileManagerService.convertFile(
            fileId,
            { targetFormat: validationResult.format }
          );
          
          filePath = convertedFile.storage.path;
          contentType = convertedFile.storage.mimetype;
          
        } catch (error) {
          res.status(400).json({
            status: 'error',
            message: `Cannot convert to format ${targetFormat}: ${(error as Error).message}`,
            error: {
              code: 'CONVERSION_ERROR'
            }
          });
          return;
        }
      }
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle errors
    fileStream.on('error', (error) => {
      logger.error(`Error streaming file: ${error}`);
      
      // Only send error if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Error streaming file',
          error: {
            code: 'STREAM_ERROR'
          }
        });
      } else {
        res.end();
      }
    });
  } catch (error) {
    logger.error(`File download error: ${error}`);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'DOWNLOAD_ERROR'
      }
    });
  }
}

/**
 * Convert a file to a different format
 */
export async function convertFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.id;
    const targetFormat = req.body.format;
    
    // Validate format
    if (!targetFormat) {
      res.status(400).json({
        status: 'error',
        message: 'Target format is required',
        error: {
          code: 'MISSING_FORMAT'
        }
      });
      return;
    }
    
    // Validate format extension
    const validationResult = validateFileExtension(`file.${targetFormat}`);
    if (!validationResult.valid || !validationResult.format) {
      res.status(400).json({
        status: 'error',
        message: validationResult.error || `Invalid format: ${targetFormat}`,
        error: {
          code: 'INVALID_FORMAT'
        }
      });
      return;
    }
    
    // Additional conversion options
    const options = req.body.options || {};
    
    // Convert file
    const convertedFile = await fileManagerService.convertFile(
      fileId,
      { 
        targetFormat: validationResult.format,
        options 
      }
    );
    
    // Return result
    res.status(200).json({
      status: 'success',
      data: {
        id: convertedFile.id,
        name: convertedFile.name,
        type: convertedFile.type,
        size: convertedFile.size,
        format: convertedFile.storage.format,
        uploaded: convertedFile.uploaded,
        sessionId: convertedFile.sessionId,
        sourceFileId: fileId
      }
    });
  } catch (error) {
    logger.error(`File conversion error: ${error}`);
    
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({
        status: 'error',
        message: (error as Error).message,
        error: {
          code: 'FILE_NOT_FOUND'
        }
      });
    } else if ((error as Error).message.includes('not supported')) {
      res.status(400).json({
        status: 'error',
        message: (error as Error).message,
        error: {
          code: 'UNSUPPORTED_CONVERSION'
        }
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: (error as Error).message,
        error: {
          code: 'CONVERSION_ERROR'
        }
      });
    }
  }
}

/**
 * Delete a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.id;
    
    // Delete the file
    const result = await fileManagerService.deleteFile(fileId);
    
    if (result) {
      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'File not found',
        error: {
          code: 'FILE_NOT_FOUND'
        }
      });
    }
  } catch (error) {
    logger.error(`File deletion error: ${error}`);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'DELETION_ERROR'
      }
    });
  }
}

/**
 * Get supported file formats
 */
export function getSupportedFormats(req: Request, res: Response): void {
  try {
    const formats = Object.values(FileFormat);
    
    // Get available conversions
    const conversions: Record<string, string[]> = {};
    
    for (const format of formats) {
      const targets = Object.values(FileFormat).filter(target => 
        fileManagerService.convertFile.name && format !== target
      );
      conversions[format] = targets;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        formats,
        conversions
      }
    });
  } catch (error) {
    logger.error(`Error getting supported formats: ${error}`);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'FORMATS_ERROR'
      }
    });
  }
}

/**
 * Get files by session ID
 */
export function getFilesBySession(req: Request, res: Response): void {
  try {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      res.status(400).json({
        status: 'error',
        message: 'Session ID is required',
        error: {
          code: 'MISSING_SESSION_ID'
        }
      });
      return;
    }
    
    // Get files for the session
    const files = fileManagerService.getFilesBySessionId(sessionId);
    
    // Map to response format
    const responseFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      format: file.storage.format,
      uploaded: file.uploaded,
      sessionId: file.sessionId
    }));
    
    res.status(200).json({
      status: 'success',
      data: responseFiles
    });
  } catch (error) {
    logger.error(`Error getting files by session: ${error}`);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'SESSION_FILES_ERROR'
      }
    });
  }
}

/**
 * Get file metadata
 */
export function getFileMetadata(req: Request, res: Response): void {
  try {
    const fileId = req.params.id;
    
    // Get the file
    const file = fileManagerService.getFileById(fileId);
    if (!file) {
      res.status(404).json({
        status: 'error',
        message: 'File not found',
        error: {
          code: 'FILE_NOT_FOUND'
        }
      });
      return;
    }
    
    // Return file metadata
    res.status(200).json({
      status: 'success',
      data: {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        format: file.storage.format,
        uploaded: file.uploaded,
        sessionId: file.sessionId
      }
    });
  } catch (error) {
    logger.error(`Error getting file metadata: ${error}`);
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      error: {
        code: 'METADATA_ERROR'
      }
    });
  }
}