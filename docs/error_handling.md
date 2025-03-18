# Error Handling System

This document describes the comprehensive error handling system implemented in Hashi, which provides standardized error responses across all API endpoints.

## Error Types

The system defines a hierarchy of custom error classes to handle different error scenarios:

- **AppError**: Base error class with consistent format and context
- **ValidationError**: For input validation failures (HTTP 400)
- **AuthenticationError**: For authentication issues (HTTP 401)
- **AuthorizationError**: For permission problems (HTTP 403)
- **NotFoundError**: For missing resources (HTTP 404)
- **ConflictError**: For duplicate resources (HTTP 409)
- **RateLimitError**: For rate limiting violations (HTTP 429)
- **StorageError**: For file storage issues (HTTP 500)
- **ChimeraXError**: For ChimeraX operation failures (HTTP 500)

## Error Response Format

All API errors follow a standardized JSON format:

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
    "additionalContext": "Extra information for debugging"
  }
}
```

## Key Features

### Request Tracking

Every error response includes a unique request ID (UUID) that is:
- Logged in the server logs
- Returned to the client
- Usable for correlating client errors with server logs
- Useful for support and debugging

### Enhanced Validation Errors

Validation errors provide detailed information about what went wrong:

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
      },
      {
        "field": "email",
        "message": "Valid email address is required"
      }
    ]
  }
}
```

### Structure Validation Errors

For molecular structure files, specialized validation provides detailed feedback:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid PDB file",
  "details": {
    "requestId": "9d72b4e6-f18a-4c2d-b5a9-3e7d1f2c8b4a",
    "format": "pdb",
    "errors": [
      "No ATOM or HETATM records found in PDB file"
    ],
    "warnings": [
      "Missing HEADER record in PDB file"
    ],
    "detectedFormat": "unknown"
  }
}
```

### Security-Related Errors

Authentication and authorization errors include appropriate context without revealing sensitive information:

```json
{
  "status": "error",
  "code": "AUTHENTICATION_ERROR",
  "message": "Invalid or expired token",
  "details": {
    "requestId": "a2c4e6g8-1b3d-5f7h-9j1l-k3m5n7p9r1t3",
    "tokenAge": "expired"
  }
}
```

```json
{
  "status": "error",
  "code": "AUTHORIZATION_ERROR",
  "message": "Insufficient permissions to access this resource",
  "details": {
    "requestId": "b3d5f7h9-2c4e-6g8i-k1m3-n5p7r9t1v3x5",
    "requiredRole": "ADMIN",
    "resource": "user-management"
  }
}
```

### Rate Limiting Errors

Rate limit errors provide information about retry timing:

```json
{
  "status": "error",
  "code": "RATE_LIMIT",
  "message": "Too many requests, please try again later",
  "details": {
    "requestId": "c4e6g8i1-3d5f-7h9j-l1n3-p5r7t9v1x3z5",
    "retryAfter": 60,
    "limit": 100,
    "window": "15 minutes"
  }
}
```

## Implementation

The error handling system is implemented through:

1. **Custom error classes** defined in `src/server/utils/errors.ts`
2. **Centralized error middleware** in `src/server/middlewares/errorHandler.ts`
3. **Context-specific error handling** in services and controllers

## Best Practices for Clients

Client applications should:

1. Check the `status` field to differentiate between success and error responses
2. Use the `code` field for programmatic error handling
3. Display the `message` field to users when appropriate
4. Log the `requestId` for support and debugging
5. Handle validation errors by highlighting appropriate form fields

## Benefits

1. **Consistency**: Standardized error responses across all API endpoints
2. **Traceability**: Request tracking for monitoring and debugging
3. **Security**: Appropriate error details without leaking sensitive information
4. **User Experience**: Helpful error messages for end users
5. **Developer Experience**: Detailed context for debugging and troubleshooting