# Implementation Details

## Session Management API

### Architecture

The Session Management API follows a layered architecture:

1. **Routes Layer**: Defines API endpoints and routes requests to controllers
2. **Controller Layer**: Handles HTTP requests/responses and calls service methods
3. **Service Layer**: Contains business logic for session management
4. **Model Layer**: Defines data structures for sessions

### Components

#### ChimeraX Service

The ChimeraX service (`src/server/services/chimerax.ts`) is responsible for managing ChimeraX processes:

- Spawning headless ChimeraX processes with REST API enabled
- Managing process lifecycle (initialization, monitoring, termination)
- Handling dynamic port assignment for REST API
- Monitoring process health and activity
- Cleaning up idle processes

Key features:
- Process isolation: Each session runs in its own ChimeraX process
- Port management: Dynamically assigns ports to avoid conflicts
- Error handling: Handles process failures and crashes
- Activity tracking: Monitors process activity to detect idle processes

#### Session Service

The Session service (`src/server/services/session.ts`) manages user sessions:

- Creating sessions with unique identifiers
- Storing session metadata
- Tracking session activity
- Managing session lifecycle
- Session authentication and authorization
- Session timeout detection and cleanup

Key features:
- In-memory session storage (can be extended to use a database)
- Unique session IDs using UUID v4
- User-session mapping for access control
- Automatic timeout detection and cleanup
- Activity tracking with heartbeat mechanism

#### Authentication Middleware

The authentication middleware (`src/server/middlewares/auth.ts`) provides:

- User authentication via a header-based approach
- Session access authorization
- Request preprocessing for controllers

#### Request Validation

The validation middleware (`src/server/middlewares/validation.ts`) provides:

- Request validation using Joi schemas
- Error formatting for validation failures
- Schema definitions for various request types

### Data Flow

1. Client makes a request to create a session
2. Authentication middleware validates the user
3. Request validation middleware validates the request data
4. Session controller processes the request
5. Session service creates a new session
6. ChimeraX service spawns a new ChimeraX process
7. Session controller returns the session details
8. Client can then interact with the session via other endpoints

### Session Lifecycle

1. **Creation**: Client requests a new session, ChimeraX process is spawned
2. **Active**: Client interacts with the session via API endpoints
3. **Maintenance**: Client sends heartbeat requests to keep the session active
4. **Timeout**: If no activity for a period, session times out
5. **Termination**: Session is explicitly terminated or cleaned up after timeout

### Session Security

- Each session has a unique identifier (UUID)
- Sessions are associated with specific users
- Access control ensures only authorized users can access a session
- Validation ensures requests are properly formatted
- Error handling prevents sensitive information leakage

### Error Handling

The API implements comprehensive error handling:

- Validation errors return specific field errors
- Authentication/authorization failures return appropriate HTTP status codes
- Server errors are logged but don't expose internal details to clients
- Proper HTTP status codes are used for different error scenarios

### Session Metrics and Monitoring

- Session creation time and last activity time are tracked
- Session status is monitored and updated
- Idle sessions are automatically detected and cleaned up
- Logs provide debugging information for session activities