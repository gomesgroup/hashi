import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import { RateLimitError, ValidationError } from '../utils/errors';

/**
 * Rate limiting middleware
 * Limits the number of requests from a single IP address
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: config.auth.rateLimitWindow, // 15 minutes
  max: config.auth.rateLimitMax, // 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipFailedRequests: false, // Count failed requests against the rate limit
  skipSuccessfulRequests: false, // Count all requests
  requestWasSuccessful: (req: Request) => req.statusCode < 400, // Define success
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    const requestId = randomUUID();
    logger.warn(`Rate limit exceeded for IP: ${req.ip} (request ID: ${requestId})`);
    
    // Use our custom RateLimitError
    next(new RateLimitError('Too many requests, please try again later', { 
      requestId,
      retryAfter: Math.ceil(options.windowMs / 1000)
    }));
  }
});

/**
 * Stricter rate limiting for authentication routes
 */
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skipSuccessfulRequests: true, // Only count failed authentication attempts
  requestWasSuccessful: (req: Request) => req.path.includes('/login') && req.statusCode === 200,
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    const requestId = randomUUID();
    logger.warn(`Authentication rate limit exceeded for IP: ${req.ip} (request ID: ${requestId})`);
    
    // Use our custom RateLimitError with different message
    next(new RateLimitError('Too many authentication attempts, please try again later', { 
      requestId,
      retryAfter: Math.ceil(options.windowMs / 1000),
      authAttempts: true
    }));
  }
});

/**
 * CORS middleware configuration
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.auth.allowedOrigins;
    
    if (allowedOrigins.indexOf(origin) !== -1 || config.server.nodeEnv === 'development') {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
});

/**
 * Helmet middleware configuration for security headers
 */
/**
 * Configure security headers based on environment
 * More restrictive in production, more permissive in development
 */
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: config.server.nodeEnv === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // More permissive in dev
      styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles often needed for UI frameworks
      imgSrc: ["'self'", 'data:', 'blob:'], // Allow data URIs for images and canvas exports
      connectSrc: ["'self'", 'wss:', 'ws:'], // Allow WebSocket connections
      fontSrc: ["'self'", 'data:'], // Allow embedded fonts
      objectSrc: ["'none'"], // Restrict <object>, <embed>, and <applet> elements
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'], // For Web Workers
      childSrc: ["'self'"], // For web workers and embedded frames
      frameSrc: ["'none'"], // Disallow <frame> and <iframe>
      formAction: ["'self'"], // Restrict where forms can submit to
      baseUri: ["'self'"], // Restrict base URIs
      manifestSrc: ["'self'"], // Restrict manifest files
      frameAncestors: ["'none'"], // Control who can embed your site in a frame
      upgradeInsecureRequests: config.server.nodeEnv === 'production', // Upgrade HTTP to HTTPS in production
      blockAllMixedContent: config.server.nodeEnv === 'production', // Block mixed content in production
    }
  },
  // Cross-Origin policies
  crossOriginEmbedderPolicy: config.server.nodeEnv === 'production' 
    ? { policy: 'require-corp' } 
    : false, // Stricter in production
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  
  // Other security headers
  dnsPrefetchControl: { allow: false },
  expectCt: {
    maxAge: 86400, // 1 day
    enforce: config.server.nodeEnv === 'production', // Only enforce in production
  },
  frameguard: { action: 'deny' }, // Prevent clickjacking
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true, // Prevent IE from executing downloads
  noSniff: true, // Prevent MIME type sniffing
  originAgentCluster: true, // Improves isolation between origins
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // More balanced referrer policy
  xssFilter: true // Enable browser's XSS protection
});

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracing
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 
                    req.headers['x-correlation-id'] || 
                    `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId as string);
  
  next();
};

/**
 * Error middleware for handling validation errors
 */
/**
 * Enhanced validation error middleware
 * Handles Joi validation errors and provides detailed feedback
 */
export const validationErrorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.error && err.error.isJoi) {
    logger.warn(`Validation error on ${req.method} ${req.path}:`, err.error);
    
    // Use our custom ValidationError class
    const validationError = ValidationError.fromJoiError(err.error);
    
    // Pass to central error handler
    next(validationError);
  } else {
    next(err);
  }
};

/**
 * Content length limiter
 * Prevents excessively large request bodies
 */
export const contentLengthLimit = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-length'] && parseInt(req.headers['content-length'] as string) > maxSize) {
      const requestId = randomUUID();
      logger.warn(`Request body too large: ${req.headers['content-length']} bytes (${req.method} ${req.path}, request ID: ${requestId})`);
      
      next(new ValidationError('Request body too large', {
        requestId,
        maxSizeBytes: maxSize,
        actualSizeBytes: parseInt(req.headers['content-length'] as string)
      }));
    } else {
      next();
    }
  };
};