import { ValidationError as JoiValidationError } from 'joi';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  STORAGE = 'STORAGE_ERROR',
  CHIMERAX = 'CHIMERAX_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR'
}

export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: any;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public type: ErrorType;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    type = ErrorType.INTERNAL,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): ErrorResponse {
    return {
      status: 'error',
      code: this.type,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details: any) {
    super(message, 400, ErrorType.VALIDATION, details);
  }

  static fromJoiError(error: JoiValidationError): ValidationError {
    return new ValidationError(
      'Validation error',
      error.details.map(detail => ({
        message: detail.message,
        path: detail.path,
      }))
    );
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: any) {
    super(message, 401, ErrorType.AUTHENTICATION, details);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', details?: any) {
    super(message, 403, ErrorType.AUTHORIZATION, details);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, ErrorType.NOT_FOUND, details);
  }
}

/**
 * Conflict error (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: any) {
    super(message, 409, ErrorType.CONFLICT, details);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details?: any) {
    super(message, 429, ErrorType.RATE_LIMIT, details);
  }
}

/**
 * Storage error
 */
export class StorageError extends AppError {
  constructor(message = 'Storage error', details?: any) {
    super(message, 500, ErrorType.STORAGE, details);
  }
}

/**
 * ChimeraX error
 */
export class ChimeraXError extends AppError {
  constructor(message = 'ChimeraX operation failed', details?: any) {
    super(message, 500, ErrorType.CHIMERAX, details);
  }
}