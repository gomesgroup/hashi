# Authentication and Authorization API

This document provides detailed information about the authentication and authorization system in the Hashi application.

## Authentication Flow

The authentication system in Hashi is based on JWT (JSON Web Tokens) and follows this general flow:

1. **Registration**: User creates an account with email and password
2. **Email Verification**: User verifies their email (optional)
3. **Login**: User authenticates and receives JWT tokens
4. **Access Protected Resources**: User includes the JWT in subsequent requests
5. **Token Refresh**: Access token is refreshed using the refresh token
6. **Logout**: User invalidates their refresh token

## API Endpoints

### User Registration

Creates a new user account.

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limiting**: Strict (10 requests per 15 minutes)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "organization": "Research Institute"
  }
  ```
- **Success Response**:
  - **Code**: 201 Created
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "user-id",
        "email": "user@example.com",
        "role": "viewer",
        "status": "pending",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "organization": "Research Institute"
        },
        "createdAt": "2023-07-01T12:00:00Z",
        "updatedAt": "2023-07-01T12:00:00Z"
      },
      "message": "User registered successfully"
    }
    ```
- **Error Responses**:
  - **Code**: 409 Conflict
    ```json
    {
      "status": "error",
      "code": "CONFLICT",
      "message": "Email address is already registered",
      "details": {
        "requestId": "df3a77b8-1d96-4a8e-8cbb-22871af79522",
        "field": "email",
        "value": "user@example.com"
      }
    }
    ```
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "VALIDATION_ERROR",
      "message": "Invalid request data",
      "details": {
        "requestId": "8f7a61c4-5b27-4d3e-9c98-12a45bc78e34",
        "errors": [
          {
            "field": "password",
            "message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
          }
        ]
      }
    }
    ```

### User Login

Authenticates a user and returns JWT tokens.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limiting**: Strict (10 requests per 15 minutes)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "refresh-token-uuid",
        "expiresIn": 3600,
        "tokenType": "Bearer"
      },
      "message": "Login successful"
    }
    ```
- **Error Responses**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "AUTHENTICATION_ERROR",
      "message": "Invalid email or password",
      "details": {
        "requestId": "a2c4e6g8-1b3d-5f7h-9j1l-k3m5n7p9r1t3",
        "attemptCount": 2,
        "maxAttempts": 5
      }
    }
    ```
  - **Code**: 403 Forbidden
    ```json
    {
      "status": "error",
      "code": "AUTHENTICATION_ERROR",
      "message": "Account is locked. Please reset your password.",
      "details": {
        "requestId": "b3d5f7h9-2c4e-6g8i-k1m3-n5p7r9t1v3x5",
        "reason": "too_many_failed_attempts",
        "lockedUntil": "2023-07-01T13:00:00Z"
      }
    }
    ```
  - **Code**: 429 Too Many Requests
    ```json
    {
      "status": "error",
      "code": "RATE_LIMIT",
      "message": "Too many authentication attempts, please try again later",
      "details": {
        "requestId": "c4e6g8i1-3d5f-7h9j-l1n3-p5r7t9v1x3z5",
        "retryAfter": 900,
        "authAttempts": true
      }
    }
    ```

### Refresh Token

Refreshes an access token using a refresh token.

- **URL**: `/api/auth/refresh-token`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "refreshToken": "refresh-token-uuid"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "new-refresh-token-uuid",
        "expiresIn": 3600,
        "tokenType": "Bearer"
      },
      "message": "Token refreshed successfully"
    }
    ```
- **Error Response**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "INVALID_REFRESH_TOKEN",
      "message": "Invalid or expired refresh token"
    }
    ```

### Logout

Logs out a user by invalidating their refresh token.

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Logged out successfully"
    }
    ```
- **Error Response**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
    ```

### Request Password Reset

Initiates a password reset process.

- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Auth Required**: No
- **Rate Limiting**: Strict (10 requests per 15 minutes)
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Password reset instructions sent to email if it exists"
    }
    ```

### Reset Password with Token

Resets a password using a token sent to the user's email.

- **URL**: `/api/auth/reset-password/:token`
- **Method**: `POST`
- **Auth Required**: No
- **URL Parameters**: `token=[string]` where `token` is the reset token
- **Request Body**:
  ```json
  {
    "newPassword": "NewSecurePassword123!"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Password reset successfully"
    }
    ```
- **Error Responses**:
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "INVALID_RESET_TOKEN",
      "message": "Invalid or expired reset token"
    }
    ```
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "INVALID_PASSWORD",
      "message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    }
    ```

### Verify Email

Verifies a user's email address using a token.

- **URL**: `/api/auth/verify-email/:token`
- **Method**: `GET`
- **Auth Required**: No
- **URL Parameters**: `token=[string]` where `token` is the email verification token
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Email verified successfully"
    }
    ```
- **Error Response**:
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "INVALID_VERIFICATION_TOKEN",
      "message": "Invalid verification token"
    }
    ```

### Get User Profile

Retrieves the current user's profile.

- **URL**: `/api/auth/profile`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "user-id",
        "email": "user@example.com",
        "role": "researcher",
        "status": "active",
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "organization": "Research Institute",
          "department": "Computational Chemistry",
          "bio": "Researcher focusing on protein structures"
        },
        "preferences": {
          "theme": "dark",
          "moleculeDisplayMode": "ribbon",
          "colorScheme": "element",
          "notifications": true,
          "showWelcomeScreen": false
        },
        "createdAt": "2023-07-01T12:00:00Z",
        "updatedAt": "2023-07-15T08:30:00Z",
        "lastLogin": "2023-07-15T08:30:00Z",
        "emailVerified": true
      },
      "message": "User profile retrieved successfully"
    }
    ```
- **Error Response**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
    ```

### Update User Profile

Updates the current user's profile information.

- **URL**: `/api/auth/profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Smith",
    "organization": "New Research Lab",
    "department": "Structural Biology",
    "bio": "Updated researcher biography"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "user-id",
        "email": "user@example.com",
        "profile": {
          "firstName": "John",
          "lastName": "Smith",
          "organization": "New Research Lab",
          "department": "Structural Biology",
          "bio": "Updated researcher biography"
        },
        "updatedAt": "2023-07-15T09:30:00Z"
      },
      "message": "Profile updated successfully"
    }
    ```
- **Error Response**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
    ```

### Update User Preferences

Updates the current user's preferences.

- **URL**: `/api/auth/preferences`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "theme": "light",
    "moleculeDisplayMode": "ball-and-stick",
    "colorScheme": "chain",
    "notifications": false,
    "defaultWorkspace": "protein_analysis",
    "showWelcomeScreen": true
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "user-id",
        "preferences": {
          "theme": "light",
          "moleculeDisplayMode": "ball-and-stick",
          "colorScheme": "chain",
          "notifications": false,
          "defaultWorkspace": "protein_analysis",
          "showWelcomeScreen": true
        },
        "updatedAt": "2023-07-15T10:15:00Z"
      },
      "message": "Preferences updated successfully"
    }
    ```
- **Error Response**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
    ```

### Change Password

Changes the current user's password.

- **URL**: `/api/auth/password`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Password updated successfully"
    }
    ```
- **Error Responses**:
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "INCORRECT_PASSWORD",
      "message": "Current password is incorrect"
    }
    ```
  - **Code**: 400 Bad Request
    ```json
    {
      "status": "error",
      "code": "INVALID_PASSWORD",
      "message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    }
    ```

### Get All Users (Admin Only)

Retrieves a list of all users (admin only).

- **URL**: `/api/auth/users`
- **Method**: `GET`
- **Auth Required**: Yes (Admin role only)
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "user-id-1",
          "email": "admin@example.com",
          "role": "admin",
          "status": "active",
          "createdAt": "2023-06-01T10:00:00Z"
        },
        {
          "id": "user-id-2",
          "email": "researcher@example.com",
          "role": "researcher",
          "status": "active",
          "createdAt": "2023-06-15T14:30:00Z"
        }
      ],
      "message": "Users retrieved successfully"
    }
    ```
- **Error Responses**:
  - **Code**: 401 Unauthorized
    ```json
    {
      "status": "error",
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
    ```
  - **Code**: 403 Forbidden
    ```json
    {
      "status": "error",
      "code": "FORBIDDEN",
      "message": "You do not have permission to access this resource"
    }
    ```

## Role-Based Access Control

The Hashi authentication system implements four distinct user roles, each with specific permissions:

### Admin Role

Administrators have full access to all system functions, including:
- Managing all user accounts
- Accessing and modifying all sessions and files
- System configuration and monitoring

### Researcher Role

Researchers can create and manage their own molecular data:
- Create and manage their own sessions
- Upload and manage their own files
- Create and modify molecular structures
- Generate renderings and movies
- Update their profile and preferences

### Viewer Role

Viewers have limited read-only access:
- View their own sessions (but not create new ones)
- View molecular structures
- Access snapshots and movies they've been granted access to
- Update their profile and preferences

### Guest Role

Guests have minimal access:
- View public resources only
- No ability to create or modify data
- Limited to demonstration features

## Security Considerations

The authentication system implements several security best practices:

### Password Security
- Passwords are hashed using BCrypt with configurable salt rounds
- Password requirements enforce strong password practices
- Account lockout after multiple failed login attempts

### Token Security
- Short-lived JWT access tokens (1 hour by default)
- Separate refresh tokens with secure storage
- Token invalidation on logout
- HTTPS-only cookies when used in browser environments

### API Protection
- Rate limiting on authentication endpoints
- CORS protection with configurable allowed origins
- Security headers for preventing common web vulnerabilities
- Input validation for all API inputs

### Account Security
- Email verification for new accounts
- Secure password reset process
- Activity logging for security events

## Enhanced Error Handling

The authentication system implements a sophisticated error handling mechanism with standardized error responses:

### Error Types

- **ValidationError** (400): Input validation failures for request parameters
- **AuthenticationError** (401): Authentication failures and invalid tokens
- **AuthorizationError** (403): Permission and access control failures
- **NotFoundError** (404): Resource not found errors
- **ConflictError** (409): Resource conflicts (e.g., duplicate email)
- **RateLimitError** (429): Rate limit exceeded for API endpoints
- **AppError** (500): Generic application errors with contextual information

### Error Response Format

All error responses follow this standardized format:

```json
{
  "status": "error",
  "code": "ERROR_TYPE",
  "message": "Human-readable error description",
  "details": {
    "requestId": "unique-uuid-for-request-tracking",
    "field": "specific-field-with-error",
    "errors": [
      {"field": "field1", "message": "Error message for field1"},
      {"field": "field2", "message": "Error message for field2"}
    ],
    "additionalInfo": "Context-specific information"
  }
}
```

### Benefits

1. **Consistency**: All errors follow the same structure across the API
2. **Traceability**: Request IDs enable tracking errors through logs
3. **Client-Friendly**: Clear messages and error codes support better client handling
4. **Security-Aware**: Error responses avoid leaking sensitive information
5. **Contextual**: Detailed information aids debugging while maintaining security