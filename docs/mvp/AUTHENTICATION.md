# Authentication and Security

This document details the tasks required to implement the authentication and security features for the Hashi application.

## Task 1: Set Up User Authentication System

### Goal
Implement a secure, JWT-based authentication system that manages user sessions and protects application resources.

### Subtasks

#### 1.1 Implement Authentication Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/authService.ts`
- **Description**: Create a service to handle user authentication.
- **Implementation**:
  - Implement JWT token generation and validation
  - Create password hashing and verification
  - Add user login and registration functionality
  - Implement token refresh mechanism

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';
import config from '../config';
import { repositories } from '../database/repositories';
import { UserRole, UserStatus } from '../types/auth';

export interface TokenPayload {
  sub: string;      // User ID
  role: UserRole;   // User role
  iat?: number;     // Issued at
  exp?: number;     // Expiration time
  jti?: string;     // JWT ID
  iss?: string;     // Issuer
  aud?: string;     // Audience
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;
  private readonly bcryptSaltRounds: number;

  constructor() {
    this.jwtSecret = config.auth.jwtSecret;
    this.jwtExpiresIn = config.auth.jwtExpiresIn;
    this.jwtRefreshExpiresIn = config.auth.jwtRefreshExpiresIn;
    this.jwtIssuer = config.auth.jwtIssuer;
    this.jwtAudience = config.auth.jwtAudience;
    this.bcryptSaltRounds = config.auth.bcryptSaltRounds;
  }

  /**
   * Generate JWT tokens for a user
   */
  public generateTokens(userId: string, role: UserRole): AuthTokens {
    const jwtId = uuid();
    
    const tokenPayload: TokenPayload = {
      sub: userId,
      role,
      jti: jwtId,
      iss: this.jwtIssuer,
      aud: this.jwtAudience
    };
    
    // Generate access token
    const accessToken = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
    
    // Generate refresh token with longer expiration
    const refreshToken = jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtRefreshExpiresIn
    });

    // Extract expiration time from token
    const decoded = jwt.decode(accessToken) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Validate a JWT token
   */
  public validateToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.warn(`Token validation failed: ${error}`);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens | null> {
    const decoded = this.validateToken(refreshToken);
    
    if (!decoded) {
      return null;
    }
    
    // Get user from database to ensure they still exist and are active
    const user = await repositories.users.findById(decoded.sub);
    
    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }
    
    // Generate new tokens
    return this.generateTokens(user.id, user.role);
  }

  /**
   * Authenticate a user with email and password
   */
  public async authenticateUser(email: string, password: string): Promise<AuthTokens | null> {
    try {
      // Find user by email
      const user = await repositories.users.findByEmail(email);
      
      if (!user) {
        return null;
      }
      
      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        logger.warn(`Authentication attempt for inactive user: ${email}`);
        return null;
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }
      
      // Generate tokens
      return this.generateTokens(user.id, user.role);
    } catch (error) {
      logger.error(`Authentication error: ${error}`);
      return null;
    }
  }

  /**
   * Register a new user
   */
  public async registerUser(
    email: string, 
    password: string, 
    firstName: string,
    lastName: string
  ): Promise<{ userId: string; tokens: AuthTokens } | null> {
    try {
      // Check if user already exists
      const existingUser = await repositories.users.findByEmail(email);
      
      if (existingUser) {
        return null;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.bcryptSaltRounds);
      
      // Create user
      const user = await repositories.users.create({
        email,
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        profile: {
          firstName,
          lastName
        }
      });
      
      // Generate tokens
      const tokens = this.generateTokens(user.id, user.role);
      
      return {
        userId: user.id,
        tokens
      };
    } catch (error) {
      logger.error(`User registration error: ${error}`);
      return null;
    }
  }
}

// Export as singleton
export const authService = new AuthService();
export default authService;
```

#### 1.2 Implement Authentication Controller
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/authController.ts`
- **Description**: Create a controller to handle authentication-related HTTP requests.
- **Implementation**:
  - Implement login endpoint
  - Create user registration endpoint
  - Add token refresh endpoint
  - Implement logout functionality

```typescript
import { Request, Response } from 'express';
import authService from '../services/authService';
import logger from '../utils/logger';
import { repositories } from '../database/repositories';

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const tokens = await authService.authenticateUser(email, password);
    
    if (!tokens) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }
    
    // Get user for response
    const user = await repositories.users.findByEmail(email);
    
    // Return tokens and user info
    return res.status(200).json({
      status: 'success',
      data: {
        tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile
        }
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'An error occurred during login'
    });
  }
};

// Register user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const result = await authService.registerUser(email, password, firstName, lastName);
    
    if (!result) {
      return res.status(400).json({
        status: 'error',
        code: 'USER_EXISTS',
        message: 'User with this email already exists'
      });
    }
    
    return res.status(201).json({
      status: 'success',
      data: {
        userId: result.userId,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error}`);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'An error occurred during registration'
    });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'Refresh token is required'
      });
    }
    
    const tokens = await authService.refreshToken(refreshToken);
    
    if (!tokens) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error}`);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'An error occurred during token refresh'
    });
  }
};

// Additional controller methods
```

#### 1.3 Implement Auth Middleware
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/auth.ts`
- **Description**: Create middleware for route protection and authorization.
- **Implementation**:
  - Implement authentication middleware
  - Create role-based access control middleware
  - Add optional authentication middleware
  - Implement permission checking

```typescript
import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import logger from '../utils/logger';
import { UserRole } from '../types/auth';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Validate token
    const payload = authService.validateToken(token);
    
    if (!payload) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }
    
    // Attach user info to request
    req.userId = payload.sub;
    req.role = payload.role;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error}`);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'Authentication error'
    });
  }
};

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
export const roleMiddleware = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Auth middleware must be called first
    if (!req.userId || !req.role) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }
    
    // Check if user's role is in allowed roles
    if (!roles.includes(req.role)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Additional middleware functions
```

#### 1.4 Set Up Authentication Routes
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/routes/authRoutes.ts`
- **Description**: Configure routes for authentication endpoints.
- **Implementation**:
  - Create login route
  - Implement registration route
  - Add token refresh route
  - Set up logout route
  - Implement user profile routes

```typescript
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { loginSchema, registerSchema, refreshTokenSchema } from '../validation/authSchemas';

const router = Router();

// Public routes
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/refresh-token', validateRequest(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/me', authMiddleware, validateRequest(userUpdateSchema), authController.updateCurrentUser);
router.delete('/me', authMiddleware, authController.deleteAccount);

export default router;
```

#### 1.5 Implement User Management
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/database/entities/User.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/database/repositories/userRepository.ts`
- **Description**: Create user model and database integration.
- **Implementation**:
  - Define User entity
  - Create user repository
  - Implement CRUD operations for users
  - Add profile management functionality

## Task 2: Implement Security Features

### Goal
Enhance application security by implementing important security features and following best practices.

### Subtasks

#### 2.1 Implement Rate Limiting
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/security.ts`
- **Description**: Add rate limiting to prevent brute force attacks.
- **Implementation**:
  - Configure global rate limiter
  - Add stricter rate limiting for authentication endpoints
  - Implement IP-based rate limiting
  - Create custom rate limiting for sensitive operations

```typescript
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Global rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later'
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later'
    });
  }
});

// Authentication rate limiter
export const authRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 failed attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many failed login attempts, please try again later'
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Authentication rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many failed login attempts, please try again later'
    });
  }
});

// Additional rate limiters
```

#### 2.2 Implement CORS and Security Headers
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/security.ts`
- **Description**: Configure CORS and add security headers.
- **Implementation**:
  - Configure CORS with proper origin validation
  - Add security headers with helmet
  - Implement Content Security Policy
  - Add cross-site scripting protection

```typescript
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import logger from '../utils/logger';

// CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.allowedOrigins;
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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

// Security headers with helmet
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws://localhost:*', 'wss://*.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
});

// Additional security middleware
```

#### 2.3 Implement Input Validation
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/validation.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/validation/authSchemas.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/validation/sessionSchemas.ts`
- **Description**: Add robust input validation.
- **Implementation**:
  - Create validation middleware using Joi
  - Implement validation schemas for different endpoints
  - Add sanitization for user inputs
  - Create validation error handling

```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

/**
 * Validation middleware using Joi
 */
export const validateRequest = (schema: Joi.Schema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (!error) {
      return next();
    }
    
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    logger.debug(`Validation error: ${JSON.stringify(errors)}`);
    
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors
    });
  };
};

// Additional validation helpers
```

#### 2.4 Implement Error Handling
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/errorHandler.ts`
- **Description**: Create robust error handling middleware.
- **Implementation**:
  - Implement global error handler
  - Create custom error classes
  - Add error logging
  - Implement consistent error responses

#### 2.5 Implement Security Monitoring
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/utils/securityMonitor.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/middlewares/securityLogging.ts`
- **Description**: Add security monitoring and logging.
- **Implementation**:
  - Create security event logging
  - Implement abnormal behavior detection
  - Add audit logging for sensitive operations
  - Create security alerts

## Acceptance Criteria

The tasks in this document are considered complete when:

1. Users can register, login, and manage their accounts
2. Protected routes are properly secured with authentication
3. Role-based access control is implemented
4. Security headers and CORS are properly configured
5. Input validation is implemented for all endpoints
6. Rate limiting is in place for sensitive endpoints
7. Error handling provides secure responses
8. Security monitoring and logging are implemented