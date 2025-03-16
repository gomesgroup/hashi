# Hashi API Documentation

## Session Management API

The Session Management API provides endpoints for creating, managing, and terminating user sessions for the ChimeraX web integration.

### Authentication

All API endpoints require authentication using a user ID passed in the `x-user-id` header. This is a temporary solution and will be replaced with proper JWT authentication in the future.

### Endpoints

#### Create a New Session

Creates a new ChimeraX session with an optional molecular structure file or PDB ID.

- **URL:** `/api/sessions`
- **Method:** `POST`
- **Headers:** 
  - `x-user-id`: User identifier for authentication
  - `Content-Type`: `multipart/form-data` (when uploading a file)
- **Request Body:**
  - `file`: (Optional) Molecular structure file to upload
  - `pdbId`: (Optional) PDB ID to load
- **Response:**
  - Status Code: `201 Created`
  - Content:
    ```json
    {
      "status": "success",
      "data": {
        "session": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "created": "2025-03-14T12:00:00.000Z",
          "lastActive": "2025-03-14T12:00:00.000Z",
          "port": 6100,
          "status": "ready"
        }
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid request data
  - `401 Unauthorized`: Authentication required
  - `500 Internal Server Error`: Server error
  - `503 Service Unavailable`: Server at maximum capacity

#### Get Session Information

Retrieves information about a specific session.

- **URL:** `/api/sessions/:id`
- **Method:** `GET`
- **Headers:** 
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `id`: Session ID (UUID)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "status": "success",
      "data": {
        "session": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "created": "2025-03-14T12:00:00.000Z",
          "lastActive": "2025-03-14T12:00:00.000Z",
          "port": 6100,
          "status": "ready"
        }
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid session ID format
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error

#### Terminate a Session

Terminates a session and its associated ChimeraX process.

- **URL:** `/api/sessions/:id`
- **Method:** `DELETE`
- **Headers:** 
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `id`: Session ID (UUID)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "status": "success",
      "message": "Session terminated successfully"
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid session ID format
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error

#### Update Session Activity (Heartbeat)

Updates the activity timestamp for a session to prevent timeout.

- **URL:** `/api/sessions/:id/heartbeat`
- **Method:** `PUT`
- **Headers:** 
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `id`: Session ID (UUID)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "status": "success",
      "data": {
        "session": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "created": "2025-03-14T12:00:00.000Z",
          "lastActive": "2025-03-14T12:00:00.000Z",
          "port": 6100,
          "status": "ready"
        }
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid session ID format
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error

## Command API

The Command API provides endpoints for executing ChimeraX commands, retrieving command history, and accessing command documentation.

### Endpoints

#### Execute Command

Executes a ChimeraX command in a specific session.

- **URL:** `/api/sessions/:sessionId/commands`
- **Method:** `POST`
- **Headers:**
  - `x-user-id`: User identifier for authentication
  - `Content-Type`: `application/json`
- **URL Parameters:**
  - `sessionId`: Session ID (UUID)
- **Request Body:**
  ```json
  {
    "command": "open 1abc",
    "options": {
      "timeout": 30000,
      "background": false,
      "silent": false
    }
  }
  ```
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "success": true,
      "data": {
        // Command-specific response data from ChimeraX
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid command or parameters
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error or command execution failure

#### Execute Command Sequence

Executes multiple ChimeraX commands in sequence.

- **URL:** `/api/sessions/:sessionId/command-sequence`
- **Method:** `POST`
- **Headers:**
  - `x-user-id`: User identifier for authentication
  - `Content-Type`: `application/json`
- **URL Parameters:**
  - `sessionId`: Session ID (UUID)
- **Request Body:**
  ```json
  {
    "commands": [
      "open 1abc",
      "cartoon",
      "color bychain"
    ],
    "options": {
      "timeout": 60000
    }
  }
  ```
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    [
      {
        "success": true,
        "data": { /* Command 1 response */ }
      },
      {
        "success": true,
        "data": { /* Command 2 response */ }
      },
      {
        "success": true,
        "data": { /* Command 3 response */ }
      }
    ]
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid commands or parameters
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error or command execution failure

#### Get Command History

Retrieves command execution history for a session.

- **URL:** `/api/sessions/:sessionId/commands`
- **Method:** `GET`
- **Headers:**
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `sessionId`: Session ID (UUID)
- **Query Parameters:**
  - `limit`: (Optional) Maximum number of commands to return (default: 100)
  - `offset`: (Optional) Offset for pagination (default: 0)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "success": true,
      "history": [
        {
          "id": "command-id-1",
          "sessionId": "session-uuid",
          "command": "open 1abc",
          "result": {
            "success": true,
            "data": { /* Command response */ }
          },
          "timestamp": "2025-03-14T12:00:00.000Z",
          "executionTimeMs": 500
        },
        {
          "id": "command-id-2",
          "sessionId": "session-uuid",
          "command": "cartoon",
          "result": {
            "success": true,
            "data": { /* Command response */ }
          },
          "timestamp": "2025-03-14T12:00:01.000Z",
          "executionTimeMs": 200
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error

#### Clear Command History

Clears the command history for a session.

- **URL:** `/api/sessions/:sessionId/commands`
- **Method:** `DELETE`
- **Headers:**
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `sessionId`: Session ID (UUID)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "success": true,
      "message": "Command history cleared"
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Authentication required
  - `403 Forbidden`: No access to this session
  - `404 Not Found`: Session not found
  - `500 Internal Server Error`: Server error

#### Get Command Documentation

Retrieves documentation for available ChimeraX commands.

- **URL:** `/api/commands/help`
- **Method:** `GET`
- **Headers:**
  - `x-user-id`: User identifier for authentication
- **Query Parameters:**
  - `category`: (Optional) Filter commands by category
  - `search`: (Optional) Search term for command name or description
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "success": true,
      "commands": [
        {
          "name": "open",
          "synopsis": "Open molecular structure files",
          "description": "Opens molecular structure files in various formats (PDB, mol2, etc.)",
          "category": "io",
          "usage": "open filename [format options]",
          "examples": ["open 1abc", "open myfile.pdb"]
        },
        {
          "name": "cartoon",
          "synopsis": "Show cartoons for atomic structures",
          "description": "Creates cartoon representations for specified atomic models",
          "category": "visualization",
          "usage": "cartoon [#atom-spec]",
          "examples": ["cartoon", "cartoon #1"]
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Authentication required
  - `500 Internal Server Error`: Server error

#### Get Specific Command Documentation

Retrieves documentation for a specific ChimeraX command.

- **URL:** `/api/commands/help/:commandName`
- **Method:** `GET`
- **Headers:**
  - `x-user-id`: User identifier for authentication
- **URL Parameters:**
  - `commandName`: Name of the command
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "success": true,
      "command": {
        "name": "open",
        "synopsis": "Open molecular structure files",
        "description": "Opens molecular structure files in various formats (PDB, mol2, etc.)",
        "category": "io",
        "usage": "open filename [format options]",
        "examples": ["open 1abc", "open myfile.pdb"]
      }
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Authentication required
  - `404 Not Found`: Command not found
  - `500 Internal Server Error`: Server error

## Persistent Storage API

The Persistent Storage API provides endpoints for managing saved molecular structures, sessions, projects, and user preferences. Detailed documentation is available in [Persistent Storage](persistent_storage.md).

### Structure Management

#### Create a New Structure

Saves a molecular structure with metadata.

- **URL:** `/api/storage/structures`
- **Method:** `POST`
- **Headers:**
  - `Authorization`: Bearer token for authentication
  - `Content-Type`: `application/json`
- **Request Body:**
  ```json
  {
    "name": "Glucose Structure",
    "description": "A simple sugar molecule",
    "content": "ATOM...",  // Structure content (PDB, XYZ, etc.)
    "format": "pdb",
    "projectId": "optional-project-id",
    "isPublic": false,
    "tags": ["carbohydrate", "sugar"]
  }
  ```
- **Response:**
  - Status Code: `201 Created`
  - Content:
    ```json
    {
      "id": "structure-uuid",
      "name": "Glucose Structure",
      "description": "A simple sugar molecule",
      "format": "pdb",
      "isPublic": false,
      "createdAt": "2025-03-14T12:00:00.000Z",
      "updatedAt": "2025-03-14T12:00:00.000Z",
      "size": 12345,
      "userId": "user-uuid"
    }
    ```

#### Get Structure

Retrieves a saved structure.

- **URL:** `/api/storage/structures/:structureId`
- **Method:** `GET`
- **Headers:**
  - `Authorization`: Bearer token for authentication
- **URL Parameters:**
  - `structureId`: Structure ID (UUID)
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "structure": {
        "id": "structure-uuid",
        "name": "Glucose Structure",
        "description": "A simple sugar molecule",
        "format": "pdb",
        "isPublic": false,
        "createdAt": "2025-03-14T12:00:00.000Z",
        "updatedAt": "2025-03-14T12:00:00.000Z",
        "size": 12345,
        "userId": "user-uuid"
      },
      "content": "ATOM..."  // Structure content
    }
    ```

### Search API

#### Search Stored Data

Search for structures, sessions, and projects.

- **URL:** `/api/storage/search`
- **Method:** `GET`
- **Headers:**
  - `Authorization`: Bearer token for authentication
- **Query Parameters:**
  - `q`: Search query string
  - `type`: Type to search (structure, session, project, all)
  - `tags`: Comma-separated list of tags to filter by
  - `format`: File format to filter by
  - `sortBy`: Field to sort by (name, date, size)
  - `sortOrder`: Sort direction (asc, desc)
  - `page`: Page number for pagination
  - `limit`: Results per page
- **Response:**
  - Status Code: `200 OK`
  - Content:
    ```json
    {
      "structures": [...],  // Array of matching structures
      "sessions": [...],    // Array of matching sessions
      "projects": [...],    // Array of matching projects
      "total": {
        "structures": 5,
        "sessions": 2,
        "projects": 1,
        "all": 8
      },
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
    ```

For more detailed information on the Persistent Storage API, see [Persistent Storage](persistent_storage.md).

## Common ChimeraX Commands

Here are some common ChimeraX commands that can be used with the Command API:

| Command | Description | Example |
|---------|-------------|---------|
| `open` | Open molecular structures | `open 1abc` |
| `close` | Close models | `close #1` |
| `cartoon` | Display cartoon representation | `cartoon` |
| `color` | Set colors | `color red` |
| `surface` | Create molecular surface | `surface` |
| `style` | Change atom/bond display style | `style stick` |
| `select` | Select atoms or other items | `select :phe` |
| `center` | Center view on atoms | `center #1` |
| `view` | Set camera orientation | `view initial` |
| `save` | Save structures or image | `save image.png` |

## Session Status Enum

The session status can be one of the following values:

- `initializing`: Session is being created and ChimeraX is starting
- `ready`: Session is operational and ready to accept commands
- `busy`: Session is processing a command
- `error`: An error occurred with the session
- `terminated`: Session has been terminated