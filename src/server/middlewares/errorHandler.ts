import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError, NotFoundError, ValidationError as CustomValidationError } from '../utils/errors';
import { ValidationError as JoiValidationError } from 'joi';

/**
 * Middleware to handle 404 errors (routes not found)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Not Found - ${req.originalUrl}`));
};

/**
 * Central error handling middleware
 * Processes all errors and returns standardized error responses
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let appError: AppError;
  
  // Convert various error types to AppError
  if (err instanceof AppError) {
    // Already an AppError instance
    appError = err;
  } else if (err instanceof JoiValidationError) {
    // Convert Joi validation errors
    appError = CustomValidationError.fromJoiError(err);
  } else {
    // Generic error conversion
    appError = new AppError(
      err.message || 'An unexpected error occurred',
      500,
      undefined,
      undefined,
      false // Non-operational errors
    );
  }
  
  // Log the error based on severity
  if (appError.statusCode >= 500) {
    logger.error(`${appError.statusCode} - ${appError.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    logger.error(err.stack);
  } else {
    logger.warn(`${appError.statusCode} - ${appError.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  // Send response
  res.status(appError.statusCode).json({
    status: 'error',
    code: appError.type,
    message: appError.message,
    details: appError.details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
