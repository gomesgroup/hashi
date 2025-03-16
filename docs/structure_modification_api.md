# Structure Modification API Documentation

The Structure Modification API provides functionality for modifying molecular structures within ChimeraX sessions. This API enables selecting parts of structures, making structural changes, and applying transformations.

## Overview

The Structure Modification API is built on top of the Session Management API and provides endpoints for:

- Selecting atoms, residues, chains, or molecules
- Modifying atom properties
- Adding/removing atoms and bonds
- Applying transformations (rotation, translation, etc.)
- Performing energy minimization
- Managing modification history with undo/redo functionality

## Authentication

All Structure Modification API endpoints require authentication with a valid user ID in the `x-user-id` header. Additionally, the session must be owned by the authenticated user.

## Base URL

All API endpoints are relative to the base URL:

```
/api
```

## Endpoints

### 1. Create Selection

Creates a new selection of atoms, residues, chains, or molecules.

- **URL**: `/sessions/:sessionId/select`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session

- **Request Body**:
  ```json
  {
    "type": "atom",
    "specifier": "protein",
    "options": {
      "extend": false,
      "invert": false,
      "replace": true
    }
  }
  ```

- **Response** (201 Created):
  ```json
  {
    "status": "success",
    "data": {
      "selectionName": "sel1",
      "count": 1234,
      "type": "atom",
      "specifier": "protein"
    }
  }
  ```

### 2. Modify Atoms

Modifies properties of selected atoms.

- **URL**: `/sessions/:sessionId/structures/:structureId/atoms`
- **Method**: `PUT`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "selectionName": "sel1",
    "properties": {
      "element": "C",
      "position": [10.0, 5.0, 3.5],
      "charge": -0.5,
      "radius": 1.8
    }
  }
  ```

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174000",
      "success": true,
      "message": "Atoms modified successfully"
    }
  }
  ```

### 3. Add Atoms

Adds new atoms to a structure.

- **URL**: `/sessions/:sessionId/structures/:structureId/atoms`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "atoms": [
      {
        "element": "C",
        "name": "C1",
        "position": [10.0, 5.0, 3.5],
        "charge": -0.5,
        "radius": 1.8,
        "serialNumber": 100,
        "occupancy": 1.0,
        "bfactor": 30.0
      },
      {
        "element": "N",
        "name": "N1",
        "position": [12.0, 5.0, 3.5],
        "charge": -0.5,
        "radius": 1.6
      }
    ]
  }
  ```

- **Response** (201 Created):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174001",
      "success": true,
      "message": "Added 2 atoms to structure 1",
      "data": {
        "addedCount": 2
      }
    }
  }
  ```

### 4. Remove Atoms

Removes atoms from a structure based on a selection.

- **URL**: `/sessions/:sessionId/structures/:structureId/atoms`
- **Method**: `DELETE`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "selectionName": "sel1"
  }
  ```

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174002",
      "success": true,
      "message": "Removed 10 atoms",
      "data": {
        "removedCount": 10
      }
    }
  }
  ```

### 5. Add Bonds

Creates new bonds between atoms in a structure.

- **URL**: `/sessions/:sessionId/structures/:structureId/bonds`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "bonds": [
      {
        "atom1": "#1:100@C1",
        "atom2": "#1:100@N1",
        "order": 1
      },
      {
        "atom1": "#1:100@C1",
        "atom2": "#1:100@C2",
        "order": 2
      }
    ]
  }
  ```

- **Response** (201 Created):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174003",
      "success": true,
      "message": "Added 2 bonds",
      "data": {
        "addedCount": 2,
        "failedCount": 0
      }
    }
  }
  ```

### 6. Remove Bonds

Removes bonds from a structure based on a selection.

- **URL**: `/sessions/:sessionId/structures/:structureId/bonds`
- **Method**: `DELETE`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "selectionName": "sel1"
  }
  ```

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174004",
      "success": true,
      "message": "Removed bonds for selection sel1"
    }
  }
  ```

### 7. Apply Transformation

Applies a transformation (rotation, translation, etc.) to a structure or selection.

- **URL**: `/sessions/:sessionId/structures/:structureId/transform`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body** (rotation):
  ```json
  {
    "type": "rotate",
    "selectionName": "sel1",
    "angle": 45.0,
    "axis": [0, 1, 0],
    "center": [10, 10, 10]
  }
  ```

- **Request Body** (translation):
  ```json
  {
    "type": "translate",
    "selectionName": "sel1",
    "translation": [5, 0, 0]
  }
  ```

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174005",
      "success": true,
      "message": "Applied rotate transformation to sel1"
    }
  }
  ```

### 8. Perform Energy Minimization

Performs energy minimization on a structure or selection.

- **URL**: `/sessions/:sessionId/structures/:structureId/minimize`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session
  - `:structureId` - ID of the structure

- **Request Body**:
  ```json
  {
    "selectionName": "sel1",
    "steps": 100,
    "algorithm": "steepest-descent",
    "forceField": "AMBER",
    "cutoff": 10.0,
    "maxIterations": 1000,
    "energyTolerance": 0.001
  }
  ```

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "initialEnergy": 1500.25,
      "finalEnergy": 850.75,
      "steps": 100,
      "converged": true,
      "rmsd": 0.45,
      "duration": 5250
    }
  }
  ```

### 9. Undo Operation

Undoes the last operation in the session.

- **URL**: `/sessions/:sessionId/undo`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174006",
      "success": true,
      "message": "Undid operation modifyAtoms",
      "data": {
        "operation": "modifyAtoms"
      }
    }
  }
  ```

### 10. Redo Operation

Redoes the last undone operation in the session.

- **URL**: `/sessions/:sessionId/redo`
- **Method**: `POST`
- **Parameters**:
  - `:sessionId` - ID of the session

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactionId": "123e4567-e89b-12d3-a456-426614174007",
      "success": true,
      "message": "Redid operation modifyAtoms",
      "data": {
        "operation": "modifyAtoms"
      }
    }
  }
  ```

### 11. Get Transaction History

Gets the transaction history for a session.

- **URL**: `/sessions/:sessionId/transactions`
- **Method**: `GET`
- **Parameters**:
  - `:sessionId` - ID of the session

- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "transactions": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "sessionId": "123e4567-e89b-12d3-a456-426614174000",
          "timestamp": "2023-08-16T15:30:45.123Z",
          "operation": "createSelection",
          "parameters": {
            "criteria": {
              "type": "atom",
              "specifier": "protein"
            }
          },
          "selectionName": "sel1"
        },
        {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "sessionId": "123e4567-e89b-12d3-a456-426614174000",
          "timestamp": "2023-08-16T15:31:12.456Z",
          "operation": "modifyAtoms",
          "parameters": {
            "atomProperties": {
              "element": "C",
              "position": [10.0, 5.0, 3.5]
            },
            "selectionName": "sel1"
          },
          "selectionName": "sel1"
        }
      ]
    }
  }
  ```

## Error Responses

All endpoints may return the following error responses:

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: No access to the session
- **404 Not Found**: Session, structure, or selection not found
- **500 Internal Server Error**: Server error

Example error response:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "details": [
    {
      "field": "type",
      "message": "\"type\" must be one of [atom, residue, chain, molecule, model]"
    }
  ]
}
```

## Selection Specifiers

The Structure Modification API uses ChimeraX selection specifiers. Here are some common examples:

- `#1` - Model 1
- `:100-200` - Residues 100 to 200
- `@CA` - All alpha carbon atoms
- `protein` - All protein atoms
- `/A` - Chain A
- `#1:100-200.A@CA` - Alpha carbons in residues 100-200 of chain A in model 1

For more details on selection specifiers, refer to the [ChimeraX documentation](https://www.cgl.ucsf.edu/chimerax/docs/user/commands/atomspec.html).

## Transaction Management

The Structure Modification API automatically records transactions for all operations. Transactions are stored in a history that can be accessed, undone, and redone. The history is per-session and is limited to the most recent 100 transactions.

## Performance Considerations

- For large structures, prefer selecting specific atoms or residues rather than entire models
- Energy minimization can be computationally expensive; consider limiting the number of steps
- Batch operations (adding multiple atoms or bonds at once) are more efficient than individual operations