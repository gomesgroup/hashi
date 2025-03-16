import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import config from '../config';
import sessionService from '../services/session';
import authService from '../services/authService';
import permissionService from '../services/permissionService';
import { UserRole, JWTPayload } from '../types/auth';

/**
 * Authentication middleware for checking if a request is authenticated
 * Uses JWT tokens for authentication
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided');
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      
      // Find the user
      const user = authService.getUserFromToken(token);
      
      if (!user) {
        logger.warn(`Authentication failed: User not found for token`);
        return res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication token'
        });
      }

      // Attach user info to the request
      req.userId = decoded.sub;
      req.user = user;
      req.role = decoded.role;
      req.token = token;
      
      next();
    } catch (error) {
      logger.warn('Authentication failed: Invalid token', error);
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
};

/**
 * Optional authentication middleware
 * Authenticates the user if a token is provided, but doesn't require authentication
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    // If no Authorization header, continue as unauthenticated
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      
      // Find the user
      const user = authService.getUserFromToken(token);
      
      if (user) {
        // Attach user info to the request
        req.userId = decoded.sub;
        req.user = user;
        req.role = decoded.role;
        req.token = token;
      }
    } catch (error) {
      // Ignore token validation errors for optional auth
      logger.debug('Optional auth: Invalid token', error);
    }
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
};

/**
 * Role-based access middleware
 * Checks if the authenticated user has the required role
 * @param roles Allowed roles for the route
 */
export const roleMiddleware = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no user or role attached, authentication middleware didn't run or failed
    if (!req.user || !req.role) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.role)) {
      logger.warn(`Authorization failed: User ${req.userId} with role ${req.role} attempted to access a route requiring roles: ${roles.join(', ')}`);
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

/**
 * Permission-based access middleware
 * Checks if the authenticated user has permission to perform an action on a subject
 * @param action Action to perform
 * @param subject Subject to perform action on
 * @param conditionsFn Function to extract conditions from request
 */
export const permissionMiddleware = (
  action: string,
  subject: string,
  conditionsFn?: (req: Request) => Record<string, any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no user or role attached, authentication middleware didn't run or failed
    if (!req.user || !req.role) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Get conditions from request if conditionsFn is provided
    const conditions = conditionsFn ? conditionsFn(req) : {};

    // Check if user has permission
    const hasPermission = permissionService.hasPermission(req.role, action, subject, conditions);

    if (!hasPermission) {
      logger.warn(`Permission denied: User ${req.userId} with role ${req.role} attempted ${action} on ${subject}`);
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Session authorization middleware
 * Verifies that the authenticated user has access to the requested session
 */
export const sessionAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const sessionId = req.params.id;
  
  if (!sessionId) {
    return res.status(400).json({
      status: 'error',
      code: 'BAD_REQUEST',
      message: 'Session ID is required'
    });
  }

  // Check if the user has access to this session
  const hasAccess = sessionService.validateSessionAccess(sessionId, userId);
  
  if (!hasAccess) {
    logger.warn(`Authorization failed: User ${userId} attempted to access session ${sessionId}`);
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'You do not have access to this session'
    });
  }

  next();
};