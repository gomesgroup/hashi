# Security Implementation in Hashi

This document details the security implementation in the Hashi application, including authentication, authorization, and API protection features.

## Authentication System

The authentication system is built on JWT (JSON Web Tokens) and provides comprehensive user identity management.

### Key Components

1. **User Model** (`src/server/models/userModel.ts`)
   - In-memory user storage with support for persistency
   - Complete user profile and preference management
   - Secure password handling and activity logging
   - Token management for refresh operations

2. **Authentication Service** (`src/server/services/authService.ts`)
   - User registration and account management
   - Token generation, validation, and refresh
   - Password management with secure hashing (bcrypt)
   - Email verification and password reset

3. **Authentication Middleware** (`src/server/middlewares/auth.ts`)
   - JWT token validation
   - User information attachment to requests
   - Optional authentication for public resources
   - Session ownership validation

4. **Security Middleware** (`src/server/middlewares/security.ts`)
   - Rate limiting to prevent brute force attacks
   - CORS configuration for cross-origin security
   - Security headers via Helmet
   - Request tracking for audit purposes

## Authorization System

Role-based access control provides fine-grained authorization across the application.

### User Roles

The system implements four hierarchical user roles, each with specific permissions:

1. **Admin**
   - Full system access
   - User management capabilities
   - System configuration and monitoring

2. **Researcher**
   - Create and manage own sessions
   - Upload and manage molecular files
   - Create snapshots and movies
   - Modify molecular structures

3. **Viewer**
   - View own sessions (read-only)
   - View molecular structures
   - Access snapshots with permission
   - Update profile and preferences

4. **Guest**
   - Access to public resources only
   - View demonstration features
   - Limited session capabilities

### Permission System

The permission service (`src/server/services/permissionService.ts`) implements:

- Action-based permission model (create, read, update, delete)
- Subject-based resource protection (session, file, structure, etc.)
- Condition-based validation (ownership, sharing status, etc.)
- Role hierarchy with permission inheritance

## API Security Features

### Comprehensive Error Handling

- Centralized error handling system with standardized responses
- Custom error classes with appropriate status codes and error types:
  - `AppError`: Base error class with consistent format
  - `ValidationError`: For input validation failures 
  - `AuthenticationError`: For authentication issues
  - `AuthorizationError`: For permission problems
  - `NotFoundError`: For missing resources
  - `ConflictError`: For duplicate resources
  - `RateLimitError`: For rate limiting violations
  - `StorageError`: For file storage issues
  - `ChimeraXError`: For ChimeraX operation failures
- Detailed error context for debugging
- User-friendly error messages for client applications

### JWT Implementation

- Short-lived access tokens (configurable expiration)
- Refresh token rotation for enhanced security
- Token validation with proper signature verification
- Secure token storage recommendations for clients
- JWT payload customization with user role and permissions

### Password Security

- Bcrypt hashing with configurable salt rounds
- Strong password requirements with comprehensive validation
- Account lockout after multiple failed attempts
- Secure password reset workflow with token expiration
- Password strength checking with configurable requirements

### Request Protection

- Input validation using Joi schemas with custom validators
- Advanced rate limiting with differentiation between successful and failed attempts
- Request tracking with UUID-based request IDs for comprehensive logging
- Consistent error responses with appropriate HTTP status codes
- Content length limits to prevent large payload attacks
- Enhanced validation for file uploads and structure formats

### Network Security

- Sophisticated CORS protection with environment-specific configurations
- Enhanced security headers via Helmet:
  - Comprehensive Content Security Policy with environment-specific settings
  - Cross-Origin policies (Embedder, Opener, Resource)
  - XSS Protection and Frame protection
  - DNS prefetch control and Referrer Policy
  - HSTS with proper configuration
  - Prevention of MIME type sniffing
  - Origin Agent Cluster for better isolation

## Integration with Existing Systems

The security implementation integrates seamlessly with the existing application components:

1. **Session Management**
   - Sessions are associated with user IDs
   - Permission checks enforce session ownership
   - Anonymous sessions are supported with limited capabilities

2. **File Handling**
   - File ownership is tracked and enforced
   - Permission-based file access
   - Secure file upload validation

3. **Structure Modification**
   - Role-based access to modification features
   - Transaction history with user attribution
   - Permissions for specific modification operations

4. **Rendering and Visualization**
   - User-specific rendering job queues
   - Access control for generated assets
   - Permission checks for rendering configurations

## Configuration

Security features are highly configurable through environment variables:

```
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=hashi-api
JWT_AUDIENCE=hashi-client

# Password Security
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRES_SPECIAL_CHAR=true
PASSWORD_REQUIRES_NUMBER=true
PASSWORD_REQUIRES_UPPERCASE=true
PASSWORD_REQUIRES_LOWERCASE=true

# Rate Limiting
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,https://example.com
```

## API Endpoints

The authentication and user management API is exposed through endpoints at `/api/auth/*`:

1. **User Registration**: `POST /api/auth/register`
2. **User Login**: `POST /api/auth/login`
3. **Token Refresh**: `POST /api/auth/refresh-token`
4. **User Logout**: `POST /api/auth/logout`
5. **Password Reset Request**: `POST /api/auth/reset-password`
6. **Password Reset with Token**: `POST /api/auth/reset-password/:token`
7. **Email Verification**: `GET /api/auth/verify-email/:token`
8. **Get User Profile**: `GET /api/auth/profile`
9. **Update User Profile**: `PUT /api/auth/profile`
10. **Update User Preferences**: `PUT /api/auth/preferences`
11. **Change Password**: `PUT /api/auth/password`
12. **Get All Users (Admin)**: `GET /api/auth/users`

Detailed API documentation is available in `authentication_api.md`.

## Best Practices

The implementation follows security best practices including:

- No storage of plaintext passwords
- Consistent time user lookup to prevent timing attacks
- Principle of least privilege in permission assignment
- Defense in depth with multiple security layers
- Secure defaults with explicit permission granting
- Complete audit logging of security events