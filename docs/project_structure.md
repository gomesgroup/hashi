# Hashi Project Structure

## Overview
Hashi follows a structured organization to maintain clean separation of concerns and facilitate maintainability. This document outlines the project structure and provides an overview of each directory's purpose.

## Directory Structure

```
/hashi
  /src                      # Source code
    /client                 # React frontend
    /server                 # Node.js backend
      /controllers          # Route controllers
      /middlewares          # Express middlewares
      /services             # Business logic
        /storage            # Persistent storage services
      /database             # Database connection and entities
        /entities           # Database models
        /repositories       # Data access layer
        /migrations         # Database schema migrations
      /utils                # Utility functions
      /routes               # API route definitions
      /config               # Configuration
      /types                # TypeScript types
    /fileHandling           # File handling system
      /controllers          # File controllers
      /services             # Storage and conversion services
      /middlewares          # File upload middlewares
      /validation           # File format validation
      /types                # File handling types
      /routes               # File API routes
    /shared                 # Shared code between client and server
  /tests                    # Test files
  /docs                     # Documentation
  /logs                     # Log files (not in version control)
  /.github                  # GitHub workflows
```

## Key Files

### Root Files
- `package.json` - Project metadata and dependencies
- `tsconfig.json` - TypeScript configuration
- `.env.template` - Environment variable template
- `.env` - Environment variables (not in version control)
- `.gitignore` - Git ignore configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `README.md` - Project documentation
- `nodemon.json` - Nodemon configuration for development
- `jest.config.js` - Jest testing configuration

### Server Files
- `src/server/index.ts` - Express server entry point
- `src/server/config/index.ts` - Configuration management
- `src/server/middlewares/errorHandler.ts` - Error handling middleware
- `src/server/middlewares/validation.ts` - Request validation middleware
- `src/server/middlewares/auth.ts` - Authentication middleware
- `src/server/routes/api.ts` - API route definitions
- `src/server/routes/sessionRoutes.ts` - Session management routes
- `src/server/routes/chimeraxRoutes.ts` - ChimeraX process routes
- `src/server/routes/structureRoutes.ts` - Structure modification routes
- `src/server/routes/websocketRoutes.ts` - WebSocket fallback routes
- `src/server/routes/storageRoutes.ts` - Persistent storage routes
- `src/server/utils/logger.ts` - Logging utility
- `src/server/services/ChimeraXProcessManager.ts` - ChimeraX process management
- `src/server/services/session.ts` - Session management
- `src/server/services/structureService.ts` - Structure modification service
- `src/server/services/websocketService.ts` - WebSocket server and connection management
- `src/server/services/storage/StorageHub.ts` - Storage services hub
- `src/server/services/storage/structureService.ts` - Structure storage service
- `src/server/services/storage/sessionService.ts` - Session storage service
- `src/server/services/storage/projectService.ts` - Project management service
- `src/server/services/storage/searchService.ts` - Search and filtering service
- `src/server/database/index.ts` - Database connection manager
- `src/server/database/entities/User.ts` - User entity model
- `src/server/database/entities/MolecularStructure.ts` - Structure entity model
- `src/server/database/entities/StructureVersion.ts` - Version history model
- `src/server/controllers/sessionController.ts` - Session controller
- `src/server/controllers/chimeraxController.ts` - ChimeraX controller
- `src/server/controllers/structureController.ts` - Structure modification controller
- `src/server/controllers/websocketController.ts` - WebSocket fallback controller
- `src/server/controllers/storageController.ts` - Persistent storage controller
- `src/server/websocket/handlers.ts` - WebSocket message handlers
- `src/server/types/chimerax.ts` - ChimeraX process types
- `src/server/types/structure.ts` - Structure modification types
- `src/server/types/websocket.ts` - WebSocket message and connection types

### Client Files
- `src/client/components/OperationStatus.tsx` - Real-time operation status component
- `src/client/websocket/WebSocketClient.ts` - WebSocket client implementation

### Shared Files
- `src/shared/types.ts` - Shared TypeScript types

## API Structure
The API follows RESTful conventions with the following structure:

- Base API Path: `/api`
- Health Check: `/api/health`
- Version Info: `/api/version`
- ChimeraX Processes: `/api/chimerax/*`
  - Create, manage, and terminate ChimeraX processes
  - Send commands to ChimeraX processes
- Sessions: `/api/sessions/*`
  - Create, manage, and terminate ChimeraX sessions
  - View and style management
  - Snapshot and rendering operations
- Structure Modification: `/api/sessions/:sessionId/*`
  - Select atoms, residues, chains, molecules
  - Modify atom properties
  - Add/remove atoms and bonds
  - Apply transformations (rotation, translation, etc.)
  - Perform energy minimization
  - Transaction history with undo/redo functionality
- Files: `/api/files/*`
  - Upload, download, and convert molecular structure files
- Snapshots: `/api/sessions/:sessionId/snapshots/*`
  - Generate and manage static images
  - Download rendered images
- Movies: `/api/sessions/:sessionId/movies/*`
  - Create and manage movie animations
  - Download rendered movie files
- Persistent Storage: `/api/storage/*`
  - Manage molecular structures, sessions, and projects
  - Track version history with comparison
  - Search and filter saved data
  - Manage user preferences
- WebSocket Fallback: `/ws-api/*`
  - WebSocket status endpoint
  - Message sending and broadcasting
  - Session connection management
  - Operation status notifications

## WebSocket Protocol
The WebSocket server is available at `ws://localhost:3000/ws` and supports the following:

- Authentication via token and session ID
- Real-time structure change notifications
- Operation status updates (start, progress, completion, error)
- Heartbeat mechanism for connection health monitoring
- Message prioritization and delivery guarantees
- Automatic reconnection with exponential backoff
- REST API fallback for environments without WebSocket support

## Development Workflow
1. Start the server: `npm run dev`
2. Run tests: `npm test`
3. Lint code: `npm run lint`
4. Format code: `npm run format`
5. Build for production: `npm run build`
6. Run production build: `npm start`

## Environment Configuration
Configured through the `.env` file with the following variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development, test, production)
- `CORS_ORIGIN` - Allowed CORS origin
- `CHIMERAX_PATH` - Path to ChimeraX executable
- `CHIMERAX_BASE_PORT` - Base port for ChimeraX instances
- `MAX_CHIMERAX_INSTANCES` - Maximum concurrent ChimeraX instances
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `SNAPSHOT_DIR` - Directory for storing snapshots and movies
- `MAX_CONCURRENT_RENDERING_JOBS` - Maximum concurrent rendering jobs
- `DEFAULT_IMAGE_WIDTH` - Default width for rendered images
- `DEFAULT_IMAGE_HEIGHT` - Default height for rendered images
- `MAX_IMAGE_WIDTH` - Maximum allowed image width
- `MAX_IMAGE_HEIGHT` - Maximum allowed image height
- `WEBSOCKET_PORT` - WebSocket server port (default: 3001)
- `WEBSOCKET_PATH` - WebSocket endpoint path (default: /ws)
- `WEBSOCKET_HEARTBEAT_INTERVAL` - Heartbeat interval (ms) (default: 30000)
- `WEBSOCKET_HEARTBEAT_TIMEOUT` - Heartbeat timeout (ms) (default: 10000)
- `WEBSOCKET_MAX_CONNECTIONS` - Maximum concurrent WebSocket connections (default: 100)
- `WEBSOCKET_MESSAGE_QUEUE_SIZE` - Message queue size per connection (default: 50)
- `WEBSOCKET_MESSAGE_RETRY_ATTEMPTS` - Maximum retry attempts for failed messages (default: 3)
- `WEBSOCKET_MESSAGE_EXPIRY_TIME` - Message expiry time (ms) (default: 60000)
- `DB_TYPE` - Database type (sqlite, postgres)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `STORAGE_BASE_PATH` - Base path for file storage
- `STORAGE_MAX_SIZE_PER_USER` - Maximum storage per user (MB)
- `STORAGE_ALLOWED_FILE_TYPES` - Comma-separated list of allowed file types
- `STORAGE_MAX_VERSIONS_PER_STRUCTURE` - Maximum versions to keep per structure