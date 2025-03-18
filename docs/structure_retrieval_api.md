# Structure Retrieval API Documentation

The Structure Retrieval API allows clients to retrieve structural data from active ChimeraX sessions, including atom coordinates, bond information, molecular properties, and structure metadata.

For implementation details, see [Task 6 Completion](task6_completion.md).

## Overview

The Structure Retrieval API provides comprehensive access to molecular structure data managed by ChimeraX through RESTful endpoints. It includes efficient data transformation, caching mechanisms, and supports various output formats to meet different client requirements.

## API Endpoints

### List All Structures in a Session

`GET /api/sessions/:sessionId/structures`

Retrieves a list of all structures within a ChimeraX session.

**Parameters:**
- `sessionId` (path parameter): The session identifier

**Response Example:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "session123_1",
      "modelId": 1,
      "name": "1abc",
      "type": "protein",
      "source": "PDB",
      "resolution": 2.3,
      "chains": 4,
      "residues": 542,
      "atoms": 4235,
      "bonds": 4382,
      "created": "2023-06-15T14:32:10.455Z"
    },
    {
      "id": "session123_2",
      "modelId": 2,
      "name": "ligand",
      "type": "small_molecule",
      "atoms": 32,
      "bonds": 34,
      "created": "2023-06-15T14:32:15.123Z"
    }
  ]
}
```

### Get Complete Structure Data

`GET /api/sessions/:sessionId/structures/:structureId`

Retrieves complete data for a specific structure. Can return data in various formats.

**Parameters:**
- `sessionId` (path parameter): The session identifier
- `structureId` (path parameter): The structure identifier
- `format` (query parameter): The output format (json, pdb, mmcif, sdf, mol2, xyz)

**Response Example (JSON format):**
```json
{
  "status": "success",
  "data": {
    "metadata": {
      "id": "session123_1",
      "modelId": 1,
      "name": "1abc",
      "type": "protein",
      "source": "PDB",
      "resolution": 2.3,
      "chains": 4,
      "residues": 542,
      "atoms": 4235,
      "bonds": 4382,
      "created": "2023-06-15T14:32:10.455Z"
    },
    "atoms": [...],
    "bonds": [...],
    "residues": [...],
    "chains": [...]
  }
}
```

For non-JSON formats, the response will be the raw file content with the appropriate MIME type.

### Get Structure Metadata

`GET /api/sessions/:sessionId/structures/:structureId/metadata`

Retrieves metadata for a specific structure.

**Parameters:**
- `sessionId` (path parameter): The session identifier
- `structureId` (path parameter): The structure identifier

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "id": "session123_1",
    "modelId": 1,
    "name": "1abc",
    "type": "protein",
    "source": "PDB",
    "resolution": 2.3,
    "chains": 4,
    "residues": 542,
    "atoms": 4235,
    "bonds": 4382,
    "created": "2023-06-15T14:32:10.455Z"
  }
}
```

### Get Atom Data

`GET /api/sessions/:sessionId/structures/:structureId/atoms`

Retrieves atom coordinate data for a specific structure, with optional filtering.

**Parameters:**
- `sessionId` (path parameter): The session identifier
- `structureId` (path parameter): The structure identifier
- `chains` (query parameter): Comma-separated list of chain IDs
- `residues` (query parameter): Comma-separated list of residue numbers
- `elements` (query parameter): Comma-separated list of element symbols
- `atomSerials` (query parameter): Comma-separated list of atom serial numbers
- `ligands` (query parameter): Boolean flag to filter for ligands only
- `water` (query parameter): Boolean flag to include/exclude water molecules
- `metals` (query parameter): Boolean flag to include/exclude metal atoms
- `residueRanges` (query parameter): JSON array of objects with chain, start, end properties
- `distanceFrom` (query parameter): JSON object with x, y, z, radius properties

**Response Example:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "element": "C",
      "name": "CA",
      "serial": 145,
      "x": 23.156,
      "y": 45.234,
      "z": 12.567,
      "residue": "ALA",
      "residueId": 23,
      "chain": "A",
      "bfactor": 15.23,
      "occupancy": 1.0
    },
    {
      "id": 2,
      "element": "N",
      "name": "N",
      "serial": 146,
      "x": 22.134,
      "y": 44.876,
      "z": 11.894,
      "residue": "ALA",
      "residueId": 23,
      "chain": "A",
      "bfactor": 14.56,
      "occupancy": 1.0
    }
  ]
}
```

### Get Bond Data

`GET /api/sessions/:sessionId/structures/:structureId/bonds`

Retrieves bond connectivity data for a specific structure.

**Parameters:**
- `sessionId` (path parameter): The session identifier
- `structureId` (path parameter): The structure identifier

**Response Example:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "atom1": 145,
      "atom2": 146,
      "order": 1,
      "length": 1.329
    },
    {
      "id": 2,
      "atom1": 146,
      "atom2": 147,
      "order": 1,
      "length": 1.458
    }
  ]
}
```

### Get Structure Properties

`GET /api/sessions/:sessionId/structures/:structureId/properties`

Retrieves calculated molecular properties for a specific structure.

**Parameters:**
- `sessionId` (path parameter): The session identifier
- `structureId` (path parameter): The structure identifier

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "mass": 14256.34,
    "charge": -2,
    "surfaceArea": 9584.23,
    "volume": 23456.78,
    "centerOfMass": [23.45, 56.78, 12.34],
    "dimensions": [45.67, 56.78, 67.89],
    "secondaryStructure": {
      "helix": 123,
      "sheet": 45,
      "coil": 67
    }
  }
}
```

### Clear Structure Cache

`DELETE /api/sessions/:sessionId/structures/cache`

Clears cached structure data for a specific session.

**Parameters:**
- `sessionId` (path parameter): The session identifier

**Response Example:**
```json
{
  "status": "success",
  "message": "Cache cleared for session session123"
}
```

## Data Models

### Structure Metadata

Metadata for a molecular structure:

```typescript
interface StructureMetadata {
  id: string;
  modelId: number;
  name: string;
  type: StructureType;
  description?: string;
  source?: string;
  resolution?: number;
  chains?: number;
  residues?: number;
  atoms?: number;
  bonds?: number;
  created: Date;
}
```

### Atom Data

Coordinate information for an atom:

```typescript
interface AtomData {
  id: number;
  element: string;
  name: string;
  serial: number;
  x: number;
  y: number;
  z: number;
  residue: string;
  residueId: number;
  chain: string;
  bfactor?: number;
  occupancy?: number;
  isHet?: boolean;
}
```

### Bond Data

Connectivity information for a bond:

```typescript
interface BondData {
  id: number;
  atom1: number;
  atom2: number;
  order: number;
  type?: string;
  length?: number;
}
```

### Structure Properties

Calculated properties for a molecular structure:

```typescript
interface StructureProperties {
  mass?: number;
  charge?: number;
  surfaceArea?: number;
  volume?: number;
  centerOfMass?: [number, number, number];
  dimensions?: [number, number, number];
  secondaryStructure?: {
    helix: number;
    sheet: number;
    coil: number;
  };
}
```

## Enhanced Error Handling

The API implements a comprehensive error handling system with standardized responses across all endpoints:

### Error Types

- **400 Bad Request** (`ValidationError`): Invalid input parameters, format errors
- **401 Unauthorized** (`AuthenticationError`): Missing or invalid authentication
- **403 Forbidden** (`AuthorizationError`): Insufficient permissions
- **404 Not Found** (`NotFoundError`): Resource not found (session, structure, version)
- **409 Conflict** (`ConflictError`): Resource conflicts or duplicate resources
- **429 Too Many Requests** (`RateLimitError`): Rate limit exceeded
- **500 Internal Server Error** (`AppError`): Unexpected server error
- **500 Storage Error** (`StorageError`): File storage or retrieval issues
- **500 ChimeraX Error** (`ChimeraXError`): ChimeraX execution failures

### Error Format

Error responses follow this standardized format:

```json
{
  "status": "error",
  "code": "ERROR_TYPE",
  "message": "Human-readable error message",
  "details": {
    "requestId": "unique-request-identifier",
    "field": "problematic-field",
    "additionalContext": "contextual information",
    "errors": ["specific error details"]
  }
}
```

### Validation Errors for Structure Files

Structure-specific validation errors provide detailed information about file issues:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid structure file format",
  "details": {
    "format": "pdb",
    "errors": [
      "No ATOM records found in structure file"
    ],
    "warnings": [
      "Missing HEADER record"
    ],
    "expectedFormat": "pdb",
    "detectedFormat": "unknown"
  }
}
```

### Request Tracking

All responses include a unique request ID for tracking and debugging purposes, especially useful for asynchronous operations or when diagnosing issues in production environments.

## Caching

The Structure Retrieval API implements a two-tier caching system:

1. **Metadata Cache**: Caches structure metadata and other lightweight data with a 5-minute TTL
2. **Coordinate Cache**: Caches atom coordinate data (which can be large) with a 2-minute TTL

The cache automatically invalidates entries after their TTL or can be manually cleared using the cache clearing endpoint.

## Performance Considerations

- For large structures, consider using appropriate filtering parameters when retrieving atom data
- Request only the specific data you need (metadata, atoms, bonds) rather than the complete structure
- Use the JSON format for programmatic access and PDB/mmCIF for visualization and interoperability
- Consider implementing client-side caching for frequently accessed data

## Examples

### Retrieving protein chains

```http
GET /api/sessions/session123/structures/session123_1/atoms?chains=A,B&water=false
```

### Retrieving atoms near a ligand binding site

```http
GET /api/sessions/session123/structures/session123_1/atoms?distanceFrom={"x":23.45,"y":45.67,"z":12.34,"radius":10.0}
```

### Exporting a structure in PDB format

```http
GET /api/sessions/session123/structures/session123_1?format=pdb
```