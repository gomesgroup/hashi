# API Reference

This document provides details about the REST API endpoints available in the Hashi application.

## Authentication and Authorization

The Hashi API uses JWT (JSON Web Tokens) for authentication. All protected endpoints require a valid JWT token to be included in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

For complete documentation of the Authentication API, see [Authentication API Documentation](authentication_api.md).

#### Key Authentication Endpoints

1. **Register User** - `POST /api/auth/register`
   - Creates a new user account with email/password

2. **Login** - `POST /api/auth/login`
   - Authenticates a user and returns JWT tokens

3. **Refresh Token** - `POST /api/auth/refresh-token`
   - Gets a new access token using a refresh token

4. **Logout** - `POST /api/auth/logout`
   - Invalidates the current refresh token

5. **Reset Password** - `POST /api/auth/reset-password`
   - Initiates a password reset process

6. **Verify Email** - `GET /api/auth/verify-email/:token`
   - Verifies a user's email address

7. **Get User Profile** - `GET /api/auth/profile`
   - Retrieves the current user's profile

8. **Update User Profile** - `PUT /api/auth/profile`
   - Updates the current user's profile information

9. **Update User Preferences** - `PUT /api/auth/preferences`
   - Updates the current user's preferences

10. **Change Password** - `PUT /api/auth/password`
    - Changes the current user's password

### Role-Based Access Control

The API implements role-based access control with four primary roles:

- **Admin**: Full system access
- **Researcher**: Can create and manage their own molecular data
- **Viewer**: Limited to read-only access of their own data
- **Guest**: Access to public resources only

Each API endpoint has specific permission requirements that determine which roles can access it.

## ChimeraX Process Management API

### Create a New ChimeraX Process

Creates a new ChimeraX process and associates it with a session ID.

- **URL**: `/api/chimerax/processes`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "sessionId": "optional-custom-session-id"
  }
  ```
- **Success Response**:
  - **Code**: 201 Created
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "session-id",
        "port": 6100,
        "pid": 12345,
        "status": "running",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "lastActive": "2023-01-01T00:00:00.000Z",
        "idleTimeMs": 0
      }
    }
    ```
- **Error Response**:
  - **Code**: 500 Internal Server Error
  - **Content**:
    ```json
    {
      "status": "error",
      "code": "PROCESS_CREATION_FAILED",
      "message": "Failed to create ChimeraX process"
    }
    ```

### Get All ChimeraX Processes

Retrieves information about all active ChimeraX processes.

- **URL**: `/api/chimerax/processes`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "session-id-1",
          "port": 6100,
          "pid": 12345,
          "status": "running",
          "createdAt": "2023-01-01T00:00:00.000Z",
          "lastActive": "2023-01-01T00:00:00.000Z",
          "idleTimeMs": 60000
        },
        {
          "id": "session-id-2",
          "port": 6101,
          "pid": 12346,
          "status": "running",
          "createdAt": "2023-01-01T00:01:00.000Z",
          "lastActive": "2023-01-01T00:01:00.000Z",
          "idleTimeMs": 0
        }
      ]
    }
    ```

### Get Specific ChimeraX Process

Retrieves information about a specific ChimeraX process.

- **URL**: `/api/chimerax/processes/:id`
- **Method**: `GET`
- **URL Parameters**: `id=[string]` where `id` is the session ID
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "id": "session-id",
        "port": 6100,
        "pid": 12345,
        "status": "running",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "lastActive": "2023-01-01T00:00:00.000Z",
        "idleTimeMs": 60000
      }
    }
    ```
- **Error Response**:
  - **Code**: 404 Not Found
  - **Content**:
    ```json
    {
      "status": "error",
      "code": "PROCESS_NOT_FOUND",
      "message": "ChimeraX process with ID session-id not found"
    }
    ```

### Terminate ChimeraX Process

Terminates a specific ChimeraX process.

- **URL**: `/api/chimerax/processes/:id`
- **Method**: `DELETE`
- **URL Parameters**: `id=[string]` where `id` is the session ID
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "ChimeraX process with ID session-id terminated successfully"
    }
    ```
- **Error Response**:
  - **Code**: 404 Not Found
  - **Content**:
    ```json
    {
      "status": "error",
      "code": "PROCESS_NOT_FOUND",
      "message": "ChimeraX process with ID session-id not found"
    }
    ```

### Send Command to ChimeraX Process

Sends a command to a specific ChimeraX process.

- **URL**: `/api/chimerax/processes/:id/command`
- **Method**: `POST`
- **URL Parameters**: `id=[string]` where `id` is the session ID
- **Request Body**:
  ```json
  {
    "command": "open 1zik"
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "data": {
        "result": "Command executed successfully"
      }
    }
    ```
- **Error Response**:
  - **Code**: 404 Not Found
  - **Content**:
    ```json
    {
      "status": "error",
      "code": "COMMAND_FAILED",
      "message": "Failed to execute command"
    }
    ```

### Clean Up Idle Processes

Terminates ChimeraX processes that have been idle for longer than the specified timeout.

- **URL**: `/api/chimerax/cleanup`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "timeoutMs": 1800000
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "status": "success",
      "message": "Cleaned up 2 idle ChimeraX processes",
      "data": {
        "terminatedCount": 2
      }
    }
    ```

## Session Management API

For complete Session Management API documentation, see [Session API Documentation](api_documentation.md).

## File Handling API

For complete File Handling API documentation, see [File Handling Documentation](file_handling.md).

## Structure Retrieval API

The Structure Retrieval API provides endpoints for retrieving structural data from active ChimeraX sessions. For detailed documentation, see:
- [Structure Retrieval API Documentation](structure_retrieval_api.md)
- [Task 6 Implementation Details](task6_completion.md)

### Key Structure Retrieval Endpoints

1. **List Structures** - `GET /api/sessions/:sessionId/structures`
   - Retrieves a list of all structures in a session

2. **Get Structure** - `GET /api/sessions/:sessionId/structures/:structureId`
   - Retrieves complete data for a specific structure in various formats

3. **Get Structure Metadata** - `GET /api/sessions/:sessionId/structures/:structureId/metadata`
   - Retrieves metadata for a specific structure

4. **Get Atom Data** - `GET /api/sessions/:sessionId/structures/:structureId/atoms`
   - Retrieves atom coordinate data with optional filtering

5. **Get Bond Data** - `GET /api/sessions/:sessionId/structures/:structureId/bonds`
   - Retrieves bond connectivity data for a structure

6. **Get Structure Properties** - `GET /api/sessions/:sessionId/structures/:structureId/properties`
   - Retrieves calculated molecular properties for a structure

7. **Clear Structure Cache** - `DELETE /api/sessions/:sessionId/structures/cache`
   - Clears cached structure data for a session

## Structure Modification API

The Structure Modification API provides endpoints for modifying molecular structures within ChimeraX sessions. For detailed documentation, see [Structure Modification API Documentation](structure_modification_api.md).

### Key Structure Modification Endpoints

1. **Create Selection** - `POST /api/sessions/:sessionId/select`
   - Creates a new selection of atoms, residues, chains, or molecules

2. **Modify Atoms** - `PUT /api/sessions/:sessionId/structures/:structureId/atoms`
   - Modifies properties of selected atoms

3. **Add Atoms** - `POST /api/sessions/:sessionId/structures/:structureId/atoms`
   - Adds new atoms to a structure

4. **Remove Atoms** - `DELETE /api/sessions/:sessionId/structures/:structureId/atoms`
   - Removes atoms from a structure based on a selection

5. **Add Bonds** - `POST /api/sessions/:sessionId/structures/:structureId/bonds`
   - Creates new bonds between atoms

6. **Remove Bonds** - `DELETE /api/sessions/:sessionId/structures/:structureId/bonds`
   - Removes bonds from a structure based on a selection

7. **Apply Transformation** - `POST /api/sessions/:sessionId/structures/:structureId/transform`
   - Applies a transformation (rotation, translation, etc.) to a structure or selection

8. **Energy Minimization** - `POST /api/sessions/:sessionId/structures/:structureId/minimize`
   - Performs energy minimization on a structure or selection

9. **Undo Operation** - `POST /api/sessions/:sessionId/undo`
   - Undoes the last operation in the session

10. **Redo Operation** - `POST /api/sessions/:sessionId/redo`
    - Redoes the last undone operation in the session

11. **Get Transaction History** - `GET /api/sessions/:sessionId/transactions`
    - Gets the transaction history for a session

## Snapshot and Rendering API

The Snapshot and Rendering API provides endpoints for generating high-quality static images and movie sequences from ChimeraX sessions. For detailed documentation, see [Snapshot and Rendering API Documentation](snapshot_rendering_api.md).

### Key Snapshot and Rendering Endpoints

1. **Create Snapshot** - `POST /api/sessions/:sessionId/snapshots`
   - Generates a snapshot of the current session state with specified parameters

2. **Get Snapshot** - `GET /api/sessions/:sessionId/snapshots/:snapshotId`
   - Retrieves metadata for a specific snapshot

3. **List Snapshots** - `GET /api/sessions/:sessionId/snapshots`
   - Lists all snapshots for a session

4. **Download Snapshot** - `GET /api/sessions/:sessionId/snapshots/:snapshotId/file`
   - Downloads the rendered snapshot image

5. **Delete Snapshot** - `DELETE /api/sessions/:sessionId/snapshots/:snapshotId`
   - Deletes a snapshot and its associated file

6. **Update View Settings** - `PUT /api/sessions/:sessionId/view`
   - Updates camera, lighting, and background settings

7. **Apply Styles** - `POST /api/sessions/:sessionId/styles`
   - Applies visualization styles to molecules in the session

8. **Create Movie** - `POST /api/sessions/:sessionId/movies`
   - Creates a movie sequence with frame-by-frame control

9. **Get Movie Status** - `GET /api/sessions/:sessionId/movies/:movieId`
   - Gets the status and progress of a movie rendering job

10. **Download Movie** - `GET /api/sessions/:sessionId/movies/:movieId/file`
    - Downloads the rendered movie file

## Frontend Integration

The React frontend integrates with these API endpoints through dedicated service classes:

### Client-Side API Services

- **sessionService.ts**: Handles session management operations
  - Creates and manages session lifecycle
  - Handles session persistence with localStorage
  - Implements automatic session refresh to prevent timeouts

- **fileService.ts**: Manages file operations
  - Handles file uploads with drag-and-drop interface
  - Validates file formats and size limits
  - Downloads structure files in various formats

- **structureService.ts**: Retrieves molecular structure data
  - Gets structure metadata and atom coordinates
  - Retrieves bond connectivity data
  - Applies filtering options for atom data

- **commandService.ts**: Executes ChimeraX commands
  - Sends commands to ChimeraX processes
  - Maintains command history

### Authentication and Error Handling

- The frontend implements a request/response interceptor system using Axios
- Authentication is handled through session IDs
- Automatic redirection to login on session expiration
- Comprehensive error handling and user feedback

### WebGL Visualization Integration

The frontend molecular viewer connects to the Structure Retrieval API to:
- Load and display atom coordinates and bond connectivity
- Apply different visualization styles (ball-and-stick, stick, sphere)
- Enable interactive manipulation of structures
- Implement camera controls for rotation, zoom, and pan

## WebSocket API

The WebSocket API provides real-time bidirectional communication for status updates, notifications, and long-running operations. For detailed documentation, see [WebSocket Support Documentation](websocket_support.md).

### WebSocket Connection

- **WebSocket URL**: `ws://localhost:3000/ws`
- **Authentication**: Required via message after connection
- **Protocol**: Text-based JSON messages

### WebSocket Message Types

1. **Authentication** - `authentication`
   - Authenticates a WebSocket connection
   - Required before sending/receiving other messages

2. **Heartbeat** - `heartbeat` / `heartbeat_ack`
   - Keeps the connection alive and verifies health

3. **Operation Status** - `operation_started` / `operation_progress` / `operation_completed` / `operation_failed`
   - Provides real-time updates on long-running operations

4. **Structure Changes** - `structure_change` / `selection_update` / `atom_modification` / `bond_modification`
   - Notifies clients of changes to molecular structures

5. **Notifications** - `notification`
   - Sends alerts and notifications to clients

6. **Custom Messages** - `custom`
   - For application-specific messages

### REST API Fallback Endpoints

For environments where WebSockets are not available, the following REST endpoints provide equivalent functionality:

1. **Get WebSocket Status** - `GET /ws-api/status`
   - Gets the current status of the WebSocket server

2. **Send Message** - `POST /ws-api/send`
   - Sends a message (fallback for WebSocket send)

3. **Broadcast Message** - `POST /ws-api/broadcast`
   - Broadcasts a message to all session connections

4. **Get Session Connections** - `GET /ws-api/connections/session/:sessionId`
   - Gets a list of active WebSocket connections for a session

5. **Send Operation Status** - `POST /ws-api/notify/operation`
   - Sends a notification about operation status