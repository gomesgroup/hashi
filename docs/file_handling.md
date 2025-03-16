# File Handling System Documentation

The File Handling System is a crucial component of the Hashi application, providing functionality for uploading, storing, processing, and converting molecular structure files for visualization with ChimeraX.

## Overview

The system manages molecular structure files throughout their lifecycle:

1. **Upload**: Handles file uploads via multipart form data, validating format and size
2. **Validation**: Ensures files have valid formats and structures 
3. **Storage**: Manages temporary and persistent storage of files
4. **Conversion**: Uses ChimeraX to convert between molecular file formats
5. **Retrieval**: Allows downloading files in original or converted formats
6. **Cleanup**: Automatically removes temporary files and orphaned session files

## Supported File Formats

The system currently supports the following molecular file formats:

- **PDB** (Protein Data Bank format) - `.pdb`
- **mmCIF** (Macromolecular Crystallographic Information File) - `.cif`, `.mmcif`
- **SDF** (Structure Data File) - `.sdf`
- **MOL** (Molecular file format) - `.mol`
- **MOL2** (Tripos molecular file format) - `.mol2`
- **XYZ** (Simple atomic coordinate format) - `.xyz`

## System Architecture

The file handling system consists of several modules:

- **Types**: Defines data structures, interfaces, and enums for file handling
- **Config**: Contains configuration settings for file storage, validation, and cleanup
- **Validation**: Validates file formats, sizes, and content
- **Storage Service**: Manages file storage, movement, and deletion
- **Conversion Service**: Handles format conversions using ChimeraX
- **File Manager Service**: Coordinates file operations across the system
- **Controllers**: Implements API endpoints for file operations
- **Middlewares**: Handles file uploads and error conditions

## File Storage Organization

Files are stored in three locations based on their lifecycle stage:

1. **Temporary Storage** (`/tmp/hashi/uploads/`): Initial storage for uploaded files
2. **Session Storage** (`/tmp/hashi/sessions/{sessionId}/`): Files associated with a specific session
3. **Persistent Storage** (`/srv/hashi/structures/`): Permanent storage for saved structures

## API Endpoints

The system provides the following API endpoints:

- `POST /api/files/upload`: Upload a single file
- `POST /api/files/upload/multiple`: Upload multiple files
- `GET /api/files/{id}`: Download a file (with optional format conversion)
- `POST /api/files/{id}/convert`: Convert a file to another format
- `DELETE /api/files/{id}`: Delete a file
- `GET /api/files/formats/supported`: Get supported file formats
- `GET /api/files/session/{sessionId}`: Get files for a session
- `GET /api/files/{id}/metadata`: Get file metadata

## File Validation

Files are validated at multiple levels:

1. **Extension Validation**: Checks if the file extension is supported
2. **Size Validation**: Ensures the file size is within configured limits
3. **Content Validation**: Verifies file content has the expected structure for its format
4. **ChimeraX Validation**: Attempts to open files with ChimeraX to verify compatibility

## File Conversion

The system uses ChimeraX for file format conversion:

1. Files can be converted between supported formats
2. Conversion is performed via ChimeraX command-line interface
3. Format-specific options can be provided for conversion
4. Not all conversion paths are supported; see the supported conversion matrix

## Security Considerations

The file handling system implements several security measures:

1. **Path Traversal Prevention**: File paths are carefully constructed and validated
2. **Content Type Validation**: Files are checked for expected format patterns
3. **Size Limits**: Configurable limits on file sizes and upload counts
4. **Temporary File Cleanup**: Automatic removal of old temporary files
5. **Isolation**: Each session's files are stored in separate directories

## Configuration Options

The system can be configured through environment variables:

- **File Storage Paths**: `HASHI_TEMP_DIR`, `HASHI_SESSION_DIR`, `HASHI_STORAGE_DIR`
- **Size Limits**: `HASHI_MAX_FILE_SIZE`, `HASHI_MAX_FIELD_SIZE`, `HASHI_MAX_FILES`
- **Security**: `HASHI_ALLOW_UNKNOWN_FORMATS`, `HASHI_VALIDATE_CONTENT`
- **ChimeraX Integration**: `CHIMERAX_PATH`, `CHIMERAX_CONVERSION_TIMEOUT`
- **Cleanup**: `HASHI_TEMP_FILE_TTL`, `HASHI_SESSION_FILE_TTL`, `HASHI_CLEANUP_INTERVAL`

## Error Handling

The system implements consistent error handling:

1. **Validation Errors**: Specific error messages for format, size, and content issues
2. **Storage Errors**: Reports file system issues with clear error messages
3. **Conversion Errors**: Explains why conversion may have failed
4. **Not Found Errors**: Clear indication when files cannot be found

## Integration with Other Systems

The file handling system integrates with:

1. **Session Management API**: Files can be associated with sessions
2. **ChimeraX Process Management**: Uses ChimeraX for file validation and conversion
3. **React Frontend**: Provides API endpoints for file upload, download, and conversion

## Usage Examples

### Uploading a File

```javascript
// Example with fetch API
const formData = new FormData();
formData.append('file', fileObject);

// Optional: associate with session
formData.append('sessionId', sessionId);

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.data.id contains the file ID for future operations
```

### Converting a File

```javascript
// Request conversion to mmCIF format
const response = await fetch(`/api/files/${fileId}/convert`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'mmcif'
  })
});

const result = await response.json();
// result.data.id contains the converted file ID
```

### Downloading a File

```javascript
// Basic download
window.location.href = `/api/files/${fileId}`;

// Download with conversion on-the-fly
window.location.href = `/api/files/${fileId}?format=pdb`;
```