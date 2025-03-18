# Snapshot and Rendering API

This document provides comprehensive information about the Snapshot and Rendering API for the Hashi ChimeraX web integration.

## Overview

The Snapshot and Rendering API allows you to:

1. Generate high-quality static images (snapshots) from ChimeraX sessions
2. Control visualization parameters (camera, lighting, styles, etc.)
3. Create movie sequences with frame-by-frame control
4. Manage rendering jobs and retrieve rendered media files

## Endpoints

### Snapshot Management

#### Create a Snapshot

```
POST /api/sessions/:sessionId/snapshots
```

Generates a snapshot of the current ChimeraX session state.

**Request Body:**

```json
{
  "width": 800,
  "height": 600,
  "format": "png",
  "camera": {
    "position": [0, 0, 100],
    "target": [0, 0, 0],
    "fieldOfView": 30
  },
  "background": {
    "color": "#000000",
    "transparent": false
  },
  "style": {
    "representation": "cartoon",
    "colorScheme": "chainbows"
  },
  "supersampling": 2,
  "showScaleBar": true
}
```

All parameters are optional with reasonable defaults.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sessionId": "abc123",
    "parameters": { /* snapshot parameters */ },
    "status": "pending",
    "createdAt": "2024-03-14T10:15:30Z",
    "updatedAt": "2024-03-14T10:15:30Z"
  }
}
```

The snapshot rendering is performed asynchronously. Check the snapshot status by querying the snapshot by ID.

#### Get Snapshot Status

```
GET /api/sessions/:sessionId/snapshots/:snapshotId
```

Retrieves the status of a snapshot rendering job.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sessionId": "abc123",
    "parameters": { /* snapshot parameters */ },
    "status": "completed",
    "createdAt": "2024-03-14T10:15:30Z",
    "updatedAt": "2024-03-14T10:15:35Z",
    "completedAt": "2024-03-14T10:15:35Z",
    "fileSize": 125000,
    "url": "/api/sessions/abc123/snapshots/3fa85f64-5717-4562-b3fc-2c963f66afa6/file"
  }
}
```

The `status` field can be one of:
- `pending`: Job is in queue
- `processing`: Job is being rendered
- `completed`: Job is finished
- `failed`: Job failed (check `message` field)
- `cancelled`: Job was cancelled

Once the status is `completed`, the snapshot image is available at the URL provided.

#### List Session Snapshots

```
GET /api/sessions/:sessionId/snapshots
```

Lists all snapshots for a session.

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "sessionId": "abc123",
      "parameters": { /* snapshot parameters */ },
      "status": "completed",
      "createdAt": "2024-03-14T10:15:30Z",
      "updatedAt": "2024-03-14T10:15:35Z",
      "completedAt": "2024-03-14T10:15:35Z",
      "fileSize": 125000,
      "url": "/api/sessions/abc123/snapshots/3fa85f64-5717-4562-b3fc-2c963f66afa6/file"
    },
    {
      "id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
      "sessionId": "abc123",
      "parameters": { /* snapshot parameters */ },
      "status": "pending",
      "createdAt": "2024-03-14T10:20:30Z",
      "updatedAt": "2024-03-14T10:20:30Z"
    }
  ]
}
```

#### Get Snapshot File

```
GET /api/sessions/:sessionId/snapshots/:snapshotId/file
```

Downloads the rendered snapshot image file.

The response is a binary file with appropriate content-type headers for the image format.

#### Delete Snapshot

```
DELETE /api/sessions/:sessionId/snapshots/:snapshotId
```

Deletes a snapshot and its associated file. If the snapshot is still processing, it will be cancelled.

**Response:**

```json
{
  "status": "success",
  "message": "Snapshot deleted successfully"
}
```

### View and Style Management

#### Update View Settings

```
PUT /api/sessions/:sessionId/view
```

Updates the camera and lighting settings for the session.

**Request Body:**

```json
{
  "camera": {
    "position": [0, 0, 100],
    "target": [0, 0, 0],
    "fieldOfView": 30
  },
  "lighting": {
    "ambientIntensity": 0.4,
    "ambientColor": "#ffffff",
    "shadows": true,
    "directionalLights": [
      {
        "direction": [0, 0, 1],
        "color": "#ffffff",
        "intensity": 0.8
      }
    ]
  },
  "background": {
    "color": "#000000",
    "transparent": false,
    "gradient": {
      "topColor": "#000000",
      "bottomColor": "#202040"
    }
  }
}
```

**Response:**

```json
{
  "status": "success",
  "message": "View settings updated successfully"
}
```

This endpoint directly updates the current ChimeraX session's view settings. The changes persist in the session and are visible in subsequent snapshots.

#### Apply Styles

```
POST /api/sessions/:sessionId/styles
```

Applies visualization styles to molecular structures in the session.

**Request Body:**

```json
{
  "representation": "cartoon",
  "colorScheme": "chainbows",
  "transparency": 0,
  "showHydrogens": false,
  "showSolvent": false,
  "showHeteroAtoms": true
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Styles applied successfully"
}
```

This endpoint directly updates the molecular representation in the current ChimeraX session. The changes persist in the session and are visible in subsequent snapshots.

### Movie Creation

#### Create a Movie

```
POST /api/sessions/:sessionId/movies
```

Creates a movie sequence from the current ChimeraX session.

**Request Body:**

```json
{
  "width": 800,
  "height": 600,
  "format": "mp4",
  "fps": 30,
  "style": {
    "representation": "cartoon",
    "colorScheme": "chainbows"
  },
  "frames": [
    {
      "duration": 1000,
      "camera": {
        "position": [0, 0, 100],
        "target": [0, 0, 0]
      }
    },
    {
      "duration": 1000,
      "camera": {
        "position": [100, 0, 0],
        "target": [0, 0, 0]
      }
    },
    {
      "duration": 1000,
      "camera": {
        "position": [0, 100, 0],
        "target": [0, 0, 0]
      }
    }
  ]
}
```

Each frame specifies:
- `duration`: Duration in milliseconds
- `camera`, `style`: Specific parameters that override the base values for this frame

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "5fa85f64-5717-4562-b3fc-2c963f66afa8",
    "status": "pending"
  }
}
```

Movie generation happens asynchronously. Check the status using the movie ID returned.

#### Get Movie Status

```
GET /api/sessions/:sessionId/movies/:movieId
```

Retrieves the status of a movie rendering job.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "5fa85f64-5717-4562-b3fc-2c963f66afa8",
    "status": "processing",
    "progress": 33,
    "message": "Rendering frames..."
  }
}
```

When the status is `completed`, the response includes the URL to download the movie:

```json
{
  "status": "success",
  "data": {
    "id": "5fa85f64-5717-4562-b3fc-2c963f66afa8",
    "status": "completed",
    "message": "Movie generated successfully",
    "url": "/api/sessions/abc123/movies/5fa85f64-5717-4562-b3fc-2c963f66afa8/file"
  }
}
```

#### Get Movie File

```
GET /api/sessions/:sessionId/movies/:movieId/file
```

Downloads the rendered movie file.

The response is a binary file with the appropriate MIME type (video/mp4 or image/gif).

## Rendering Parameters

### General Rendering Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | number | 800 | Image width in pixels |
| height | number | 600 | Image height in pixels |
| format | string | "png" | Image format (png, jpeg, tiff) |
| quality | number | 90 | For JPEG format, quality from 1-100 |
| supersampling | number | 1 | Anti-aliasing level (1-4) |
| caption | string | null | Optional text caption to add |
| showScaleBar | boolean | false | Whether to display a scale bar |
| scaleBarOptions | object | {} | Options for the scale bar |

### Camera Settings

| Parameter | Type | Description |
|-----------|------|-------------|
| position | [x, y, z] | Camera position in 3D space |
| target | [x, y, z] | Look-at point in 3D space |
| fieldOfView | number | Field of view in degrees |
| near | number | Near clipping plane distance |
| far | number | Far clipping plane distance |
| rotationMatrix | number[] | 4x4 transformation matrix |

### Lighting Settings

| Parameter | Type | Description |
|-----------|------|-------------|
| ambientIntensity | number | Ambient light intensity (0.0-1.0) |
| ambientColor | string | Ambient light color |
| directionalLights | object[] | Array of directional lights |
| shadows | boolean | Enable or disable shadows |

### Background Settings

| Parameter | Type | Description |
|-----------|------|-------------|
| color | string | Background color (hex or name) |
| transparent | boolean | Enable transparency for PNG format |
| gradient | object | Gradient background settings |

### Style Settings

| Parameter | Type | Description |
|-----------|------|-------------|
| representation | string | Molecular representation type |
| colorScheme | string | Coloring scheme |
| material | string | Surface material |
| transparency | number | Transparency level (0.0-1.0) |
| showHydrogens | boolean | Show hydrogen atoms |
| showSolvent | boolean | Show solvent molecules |
| showHeteroAtoms | boolean | Show non-protein atoms |

## Common Representation Types

| Type | Description |
|------|-------------|
| "stick" | Stick/bond representation |
| "sphere" | Sphere (space-filling) representation |
| "ribbon" | Simple protein ribbon |
| "cartoon" | Cartoon representation |
| "surface" | Molecular surface |
| "licorice" | Licorice representation |
| "ball_and_stick" | Ball and stick representation |

## Common Color Schemes

| Scheme | Description |
|--------|-------------|
| "element" | Color by element |
| "chain" | Color by chain |
| "chainbows" | Rainbow colors by chain |
| "rainbow" | Rainbow colors over structure |
| "bfactor" | Color by B-factor |
| "hydrophobicity" | Color by hydrophobicity |
| "charge" | Color by electric charge |
| "residue" | Color by residue type |
| "secondary" | Color by secondary structure |
| "custom" | Custom color scheme |

## Rendering Fallback System

The snapshot rendering system implements a multi-layered fallback approach to ensure images can always be generated, even when optimal rendering resources are not available:

### Primary Rendering: OSMesa
- Uses ChimeraX with OSMesa libraries for high-quality offscreen rendering
- Provides the best visual quality and performance
- Requires OSMesa libraries to be properly installed

### Fallback 1: Xvfb
- Uses a virtual X11 framebuffer (Xvfb) when OSMesa is not available
- Still provides good quality rendering
- Requires Xvfb to be properly configured (automatically handled in Docker)

### Fallback 2: Placeholder Images
- When both OSMesa and Xvfb rendering fail, generates placeholder images
- Uses Node.js canvas library to create informative images
- Shows molecular structure icon with error message
- Ensures UI consistency even when rendering is completely unavailable

The system automatically detects capabilities and chooses the appropriate rendering method. When rendering with primary or fallback methods fails, a descriptive message is provided in the snapshot status response.

## Error Handling

Errors are returned with appropriate HTTP status codes and a JSON object with error details:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message"
  }
}
```

Common error codes:
- `SESSION_NOT_FOUND`: Session ID is invalid or expired
- `SNAPSHOT_NOT_FOUND`: Snapshot ID not found
- `SNAPSHOT_FILE_NOT_FOUND`: Snapshot file not available or not yet rendered
- `INVALID_PARAMETERS`: Invalid rendering parameters
- `RENDERING_FAILED`: Rendering operation failed
- `OSMESA_NOT_AVAILABLE`: OSMesa libraries required for optimal rendering are not available
- `XVFB_NOT_AVAILABLE`: Xvfb fallback rendering is not available
- `USING_PLACEHOLDER`: Rendering unavailable, using placeholder image instead
- `MOVIE_NOT_FOUND`: Movie ID not found
- `MOVIE_FILE_NOT_FOUND`: Movie file not available or not yet rendered
- `SERVER_ERROR`: Internal server error

## Rate Limiting and Security

- Rendering operations are resource-intensive. Heavy usage may be rate-limited.
- Authentication is required for all endpoints.
- Image dimensions are limited to reasonable values (max 3840x2160).
- Long-running jobs may be automatically cancelled if idle.
- Files older than the configured TTL will be automatically cleaned up.

## Examples

### Basic Snapshot Generation

```javascript
// Generate a basic snapshot
fetch('/api/sessions/abc123/snapshots', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    width: 800,
    height: 600,
    style: {
      representation: 'cartoon',
      colorScheme: 'chainbows'
    }
  })
})
.then(response => response.json())
.then(data => {
  // Check status periodically until completed
  console.log('Snapshot job ID:', data.data.id);
});
```

### Publication-Quality Rendering

```javascript
// Generate a high-quality rendering for publication
fetch('/api/sessions/abc123/snapshots', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    width: 3000,
    height: 2000,
    format: 'png',
    supersampling: 4,
    background: {
      transparent: true
    },
    lighting: {
      ambientIntensity: 0.6,
      shadows: true,
      directionalLights: [
        {
          direction: [1, -1, 1],
          intensity: 0.7
        },
        {
          direction: [-1, -1, 1],
          intensity: 0.5
        }
      ]
    },
    style: {
      representation: 'cartoon',
      colorScheme: 'chainbows',
      showHeteroAtoms: true
    },
    showScaleBar: true,
    scaleBarOptions: {
      position: 'bottom-right',
      length: 10,
      color: 'black'
    }
  })
});
```

### Creating a Rotation Movie

```javascript
// Generate a rotation movie around Y axis
fetch('/api/sessions/abc123/movies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    width: 800,
    height: 600,
    format: 'mp4',
    fps: 30,
    style: {
      representation: 'cartoon',
      colorScheme: 'chainbows'
    },
    background: {
      color: '#000000'
    },
    frames: Array.from({ length: 36 }, (_, i) => {
      const angle = (i * 10) * (Math.PI / 180);
      const x = 100 * Math.sin(angle);
      const z = 100 * Math.cos(angle);
      return {
        duration: 100,
        camera: {
          position: [x, 0, z],
          target: [0, 0, 0]
        }
      };
    })
  })
});
```