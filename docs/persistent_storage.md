# Persistent Storage System

## Overview

The persistent storage system in Hashi provides a robust solution for saving, organizing, and retrieving molecular structures, sessions, metadata, and user preferences. The system supports version history tracking and offers comprehensive search capabilities.

## Key Features

1. **Database-Backed Storage**
   - TypeORM integration with PostgreSQL (production) or SQLite (development)
   - Entity models for structures, sessions, projects, and user preferences
   - Transactional operations for data integrity

2. **Structure and Session Versioning**
   - Automatic version tracking for all changes
   - Support for commit messages to describe changes
   - Comparison capabilities between different versions
   - Rollback functionality to previous versions

3. **Project Organization**
   - Group structures and sessions into projects
   - Track size and usage statistics
   - Set visibility and sharing permissions

4. **Metadata Management**
   - Tagging system for easy organization
   - Custom metadata fields for structures and sessions
   - Support for external database references (e.g., PDB IDs)

5. **Search and Filtering**
   - Full-text search across structures, sessions, and projects
   - Filter by metadata, tags, file format, and date ranges
   - Sort by various criteria (name, date, size)
   - Pagination for large result sets

6. **Storage Quota Management**
   - Per-user storage quotas with monitoring
   - Automatic pruning of old versions when needed
   - Disk usage optimization

7. **User Preferences**
   - Save and restore UI preferences
   - Customize visualization defaults
   - Import/export settings between users

## Architecture

The persistent storage system follows a modular architecture with the following components:

```
/server/database/
  /entities/       # Database models
  /migrations/     # Migration scripts for schema changes
  /repositories/   # Data access layer
  index.ts         # Database connection manager

/server/services/storage/
  index.ts           # Core storage service
  StorageHub.ts      # Central hub for all storage services
  structureService.ts  # Structure-specific operations
  sessionService.ts    # Session-specific operations
  projectService.ts    # Project management
  searchService.ts     # Search functionality
  preferencesService.ts # User preferences management

/server/controllers/
  storageController.ts # REST API controller

/server/routes/
  storageRoutes.ts     # API route definitions
```

## Database Schema

### Core Entities

1. **User**
   - Basic user information and authentication
   - Storage quota tracking
   - References to owned structures, sessions, and projects

2. **MolecularStructure**
   - Metadata (name, description, format, source)
   - Version history references
   - Project association
   - Tagging system

3. **StructureVersion**
   - Version number and commit message
   - File path to actual structure data
   - Creation timestamp and author
   - Metadata specific to this version

4. **ChimeraXSession**
   - Session metadata and settings
   - Version history references
   - Project association
   - Last accessed timestamp

5. **SessionVersion**
   - Version number and commit message
   - File path to session file
   - Creation timestamp and author
   - Metadata specific to this version

6. **Project**
   - Project metadata (name, description)
   - Structure and session associations
   - Tagging system
   - Size tracking

7. **Tag**
   - Name and optional color
   - Created by reference
   - Used for organizing structures and projects

8. **UserPreference**
   - Category and key for preference
   - JSON value for settings
   - User association

## API Endpoints

### Structure Endpoints

- `POST /api/storage/structures` - Create a new structure
- `GET /api/storage/structures/:structureId` - Get structure content
- `GET /api/storage/structures/:structureId/versions/:versionNumber` - Get specific version
- `PUT /api/storage/structures/:structureId` - Update structure and create a new version
- `DELETE /api/storage/structures/:structureId` - Delete structure
- `GET /api/storage/structures/:structureId/compare` - Compare two versions

### Session Endpoints

- `POST /api/storage/sessions` - Create a new session
- `GET /api/storage/sessions/:sessionId` - Get session content
- `GET /api/storage/sessions/:sessionId/versions/:versionNumber` - Get specific version
- `PUT /api/storage/sessions/:sessionId` - Update session
- `DELETE /api/storage/sessions/:sessionId` - Delete session

### Project Endpoints

- `POST /api/storage/projects` - Create a new project
- `GET /api/storage/projects/:projectId` - Get project details
- `PUT /api/storage/projects/:projectId` - Update project
- `DELETE /api/storage/projects/:projectId` - Delete project
- `POST /api/storage/projects/:projectId/structures/:structureId` - Add structure to project
- `DELETE /api/storage/projects/:projectId/structures/:structureId` - Remove structure from project

### Search Endpoint

- `GET /api/storage/search` - Search structures, sessions, and projects
  - Query parameters:
    - `q`: Search query string
    - `type`: Type to search (structure, session, project, all)
    - `tags`: Comma-separated list of tags to filter by
    - `format`: File format to filter by
    - `sortBy`: Field to sort by (name, date, size)
    - `sortOrder`: Sort direction (asc, desc)
    - `page`: Page number for pagination
    - `limit`: Results per page

### User Preference Endpoints

- `GET /api/storage/preferences/:category` - Get all preferences in a category
- `PUT /api/storage/preferences/:category/:key` - Set a preference
- `DELETE /api/storage/preferences/:category/:key` - Delete a preference
- `DELETE /api/storage/preferences/:category` - Reset category to defaults
- `GET /api/storage/preferences` - Export all preferences
- `POST /api/storage/preferences` - Import preferences

## Usage Examples

### Creating a New Structure

```typescript
// Example request
const response = await fetch('/api/storage/structures', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Glucose',
    description: 'Simple sugar molecule',
    content: '...PDB or other molecular format content...',
    format: 'pdb',
    projectId: 'optional-project-id',
    isPublic: false,
    tags: ['carbohydrate', 'sugar'],
  }),
});

const result = await response.json();
```

### Searching Structures

```typescript
// Example request
const response = await fetch(
  '/api/storage/search?q=glucose&type=structure&tags=carbohydrate&sortBy=date&sortOrder=desc&page=1&limit=20'
);

const results = await response.json();
// results contains matching structures with pagination info
```

### Managing User Preferences

```typescript
// Saving a preference
await fetch('/api/storage/preferences/visualization/defaultRepresentation', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    value: 'cartoon',
  }),
});

// Getting preferences for a category
const response = await fetch('/api/storage/preferences/visualization');
const preferences = await response.json();
// preferences = { defaultRepresentation: 'cartoon', ... }
```

## Implementation Details

### Storage Service

The core Storage Service handles the actual file operations:

```typescript
class StorageService {
  // Generate a unique storage path for a file
  public generateStoragePath(options: StorageOptions): string;
  
  // Save a file to the storage
  public async saveFile(content: string | Buffer, filePath: string): Promise<void>;
  
  // Read a file from storage
  public async readFile(filePath: string): Promise<Buffer>;
  
  // Delete a file from storage
  public async deleteFile(filePath: string): Promise<boolean>;
  
  // Check storage quota
  public async checkStorageQuota(userId: string, size: number): Promise<boolean>;
  
  // Update user's storage usage
  public async updateStorageUsage(userId: string, size: number): Promise<void>;
  
  // Cleanup old versions
  public async cleanupOldVersions(structureId: string): Promise<void>;
}
```

### Structure Storage Service

Specialized service for handling molecular structures:

```typescript
class StructureStorageService {
  // Create a new molecular structure
  public async createStructure(params: CreateStructureParams): Promise<MolecularStructure>;
  
  // Update an existing structure and create a new version
  public async updateStructure(params: UpdateStructureParams): Promise<MolecularStructure>;
  
  // Delete a structure and all its versions
  public async deleteStructure(structureId: string, userId: string): Promise<boolean>;
  
  // Get a specific version of a structure
  public async getStructureVersion(
    structureId: string, 
    versionNumber?: number
  ): Promise<{ content: Buffer; version: StructureVersion }>;
  
  // Compare two versions of a structure
  public async compareVersions(
    structureId: string, 
    version1: number, 
    version2: number
  ): Promise<any>;
}
```

### Session Storage Service

Specialized service for handling ChimeraX sessions:

```typescript
class SessionStorageService {
  // Create a new ChimeraX session
  public async createSession(params: CreateSessionParams): Promise<ChimeraXSession>;
  
  // Update an existing session and create a new version
  public async updateSession(params: UpdateSessionParams): Promise<ChimeraXSession>;
  
  // Delete a session and all its versions
  public async deleteSession(sessionId: string, userId: string): Promise<boolean>;
  
  // Get a specific version of a session
  public async getSessionVersion(
    sessionId: string, 
    versionNumber?: number
  ): Promise<{ content: Buffer; version: SessionVersion }>;
}
```

## Configuration

The persistent storage system can be configured through environment variables:

```
# Database configuration
DB_TYPE=postgres # or sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=hashi
DB_SYNCHRONIZE=false # In production, set to false and use migrations
DB_LOGGING=false
DB_ENTITIES_PATH=
DB_MIGRATIONS_PATH=
DB_MIGRATIONS_RUN=true

# Storage configuration
STORAGE_BASE_PATH=./storage
STORAGE_MAX_SIZE_PER_USER=1024 # in MB
STORAGE_ALLOWED_FILE_TYPES=pdb,xyz,mol,mol2,sdf,cif
STORAGE_MAX_VERSIONS_PER_STRUCTURE=10
```

## Security Considerations

1. **Authentication and Authorization**
   - All storage endpoints require authentication
   - Users can only access their own data unless explicitly shared
   - Admin users have additional capabilities

2. **Data Validation**
   - Input validation for all API endpoints
   - File format checking for uploaded structures
   - Size limits to prevent abuse

3. **Storage Quotas**
   - Per-user quotas to prevent system overload
   - Admin-configurable quota limits

4. **Versioning Security**
   - Version history cannot be altered, only new versions added
   - All versions track the creating user