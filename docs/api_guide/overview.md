# Hashi API Documentation

Welcome to the Hashi API documentation. This guide provides comprehensive information about the Hashi ChimeraX Web Integration API, allowing you to integrate Hashi's molecular visualization capabilities into your own applications.

## API Overview

The Hashi API is a RESTful service that provides access to ChimeraX's molecular visualization and analysis capabilities through HTTP requests. The API follows standard REST conventions and uses JSON for data exchange.

### Base URL

All API endpoints are accessed from the base URL:

```
https://your-hashi-instance.example.com/api
```

For local development, this is typically:

```
http://localhost:3000/api
```

### API Versioning

The current API version is v1, which is implicit in the endpoints. Future breaking changes will be introduced with explicit version prefixes.

### Authentication

Hashi API uses JWT (JSON Web Token) for authentication. To use the API, you need to:

1. Obtain a JWT token via the authentication endpoint
2. Include the token in the `Authorization` header of subsequent requests

Example authentication flow:

```javascript
// Request a token
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'your-password'
  })
});

const { token } = await response.json();

// Use the token in subsequent requests
const protectedResponse = await fetch('http://localhost:3000/api/sessions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Rate Limiting

API requests are subject to rate limiting to ensure fair usage and system stability. The current limits are:

- 100 requests per 15-minute window for authenticated users
- 20 requests per 15-minute window for unauthenticated requests

Rate limit information is included in the response headers:
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in the current window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit window resets

### Error Handling

API errors are returned with appropriate HTTP status codes and a consistent JSON error format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

Common error codes:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but not authorized for the resource
- `404 Not Found`: Resource does not exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Core API Endpoints

The API is organized into these main resource categories:

### Sessions

ChimeraX session management endpoints:

- `GET /sessions`: List all sessions
- `POST /sessions`: Create a new session
- `GET /sessions/:id`: Get session details
- `PUT /sessions/:id`: Update session properties
- `DELETE /sessions/:id`: Terminate and delete a session
- `POST /sessions/:id/commands`: Send commands to a session
- `GET /sessions/:id/snapshots`: Get session snapshots
- `POST /sessions/:id/snapshots`: Create a new snapshot

### Structures

Molecular structure management endpoints:

- `GET /structures`: List all structures
- `POST /structures`: Upload a new structure
- `GET /structures/:id`: Get structure details
- `PUT /structures/:id`: Update structure metadata
- `DELETE /structures/:id`: Delete a structure
- `GET /structures/:id/versions`: List structure versions
- `POST /structures/:id/versions`: Create a new version
- `GET /structures/:id/download`: Download structure file

### Projects

Project management for organizing structures and sessions:

- `GET /projects`: List all projects
- `POST /projects`: Create a new project
- `GET /projects/:id`: Get project details
- `PUT /projects/:id`: Update project properties
- `DELETE /projects/:id`: Delete a project
- `GET /projects/:id/structures`: List structures in project
- `POST /projects/:id/structures`: Add structure to project

### Users

User management endpoints (admin only):

- `GET /users`: List all users
- `POST /users`: Create a new user
- `GET /users/:id`: Get user details
- `PUT /users/:id`: Update user properties
- `DELETE /users/:id`: Delete a user

## WebSocket API

In addition to the REST API, Hashi provides a WebSocket API for real-time updates:

```javascript
const socket = new WebSocket('ws://localhost:3001/ws');

socket.onopen = function(e) {
  console.log('WebSocket connection established');
  
  // Authenticate with the WebSocket
  socket.send(JSON.stringify({
    type: 'authenticate',
    token: 'your-jwt-token'
  }));
};

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Message from server:', data);
};
```

The WebSocket API is used for:
- Real-time structure updates
- Session status changes
- Command execution results
- Asynchronous job notifications

## API Clients

Hashi provides official client libraries for common programming languages:

### JavaScript/TypeScript

```bash
npm install hashi-client
```

```javascript
import { HashiClient } from 'hashi-client';

const client = new HashiClient('http://localhost:3000/api');
await client.authenticate('user@example.com', 'password');

const sessions = await client.sessions.list();
console.log(sessions);
```

### Python

```bash
pip install hashi-client
```

```python
from hashi_client import HashiClient

client = HashiClient('http://localhost:3000/api')
client.authenticate('user@example.com', 'password')

sessions = client.sessions.list()
print(sessions)
```

## API Explorer

An interactive API explorer is available at:

```
http://your-hashi-instance.example.com/api/docs
```

This Swagger UI allows you to:
- Browse all available endpoints
- See request/response schemas
- Try out API calls directly in the browser
- Generate code snippets for various languages

## Next Steps

Explore detailed documentation for specific endpoints:

- [Authentication API](authentication.md)
- [Sessions API](sessions.md)
- [Structures API](structures.md)
- [Projects API](projects.md)
- [Users API](users.md)
- [WebSocket API](websocket.md)

For example implementations and use cases, see the [API Examples](examples.md) page.

---

*This documentation was last updated on [Current Date]. For the latest API reference, refer to the interactive documentation at `/api/docs`.*