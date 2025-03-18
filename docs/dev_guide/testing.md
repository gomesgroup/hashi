# Testing Guide

This guide provides an overview of testing practices and resources for the Hashi project.

## Testing Frameworks

Hashi uses the following testing frameworks:

- **Jest**: For unit and integration testing
- **React Testing Library**: For frontend component testing
- **Supertest**: For API testing
- **Playwright**: For end-to-end testing
- **K6**: For performance testing

## Directory Structure

```
/tests
  /unit                # Unit tests
  /integration         # Integration tests
  /client              # Frontend component tests
  /e2e                 # End-to-end tests
  /security            # Security-focused tests
  /performance         # Performance tests
  /mocks               # Mock utilities
    /chimeraxMock.ts   # ChimeraX mock utilities
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:client

# Run specific tests by pattern
npm test -- -t "pattern"

# Run tests with coverage
npm run test:coverage
```

### Test Categories

#### Backend Tests
```bash
npm run test:backend
```

Tests the server-side components including API endpoints, ChimeraX process management, and database operations.

#### Frontend Tests
```bash
npm run test:client
```

Tests React components, hooks, contexts, and services.

#### Security Tests
```bash
npm run test:security
```

Focuses on authentication, authorization, and input validation.

#### End-to-End Tests
```bash
npm run test:e2e
```

Tests complete user workflows using Playwright.

#### Performance Tests
```bash
npm run test:perf
```

Tests system performance under load using K6.

## ChimeraX and OSMesa Testing

### Standalone Testing Server

For manual testing of ChimeraX integration, use the standalone test server:

```bash
# Start the server
node standalone-test.js

# Test API endpoints
curl http://localhost:9876/api/health
curl -X POST http://localhost:9876/api/chimerax/start
curl -X POST -H "Content-Type: application/json" -d '{"command":"open 1ubq"}' http://localhost:9876/api/chimerax/command
curl -X POST -H "Content-Type: application/json" -d '{"width":800,"height":600}' http://localhost:9876/api/chimerax/snapshot
```

This provides a simple way to test ChimeraX and OSMesa behavior without the full application stack.

### Mock Utilities

The `ChimeraXMockUtil` class provides comprehensive mocking for ChimeraX operations:

```typescript
import ChimeraXMockUtil, { ChimeraXEnvironment } from './mocks/chimeraxMock';

// Configure mock environment
ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
// or
ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);

// Get mock functions
const mockSpawn = ChimeraXMockUtil.getMockSpawn();
const mockFetch = ChimeraXMockUtil.getMockFetch();
const mockFs = ChimeraXMockUtil.getMockFileSystem();
```

Available environments:
- `FULL_RENDERING`: Simulates a system with ChimeraX and OSMesa
- `NO_OSMESA`: Simulates a system with ChimeraX but no OSMesa
- `NO_CHIMERAX`: Simulates a system without ChimeraX
- `SLOW_RENDERING`: Simulates slow rendering for timeout testing
- `COMMAND_ERROR`: Simulates ChimeraX command failures

### Testing OSMesa Detection

```typescript
describe('OSMesa detection', () => {
  it('should detect when OSMesa is available', async () => {
    // Configure mock environment
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
    
    // Test rendering with OSMesa
    // ...
  });
  
  it('should detect when OSMesa is not available', async () => {
    // Configure mock environment
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
    
    // Test rendering without OSMesa
    // ...
  });
});
```

### Testing Fallback Mechanisms

```typescript
describe('Fallback mechanisms', () => {
  it('should provide fallback URL when OSMesa rendering fails', async () => {
    // Configure mock environment
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
    
    // Test fallback rendering
    // ...
    
    // Verify fallback URL
    expect(fallbackUrl).toBe('https://www.rcsb.org/structure/1ubq/image');
  });
});
```

## Writing Tests

### Backend Test Example

```typescript
import request from 'supertest';
import { app } from '../../src/server';
import ChimeraXMockUtil, { ChimeraXEnvironment } from '../mocks/chimeraxMock';

describe('ChimeraX API', () => {
  beforeEach(() => {
    // Set up mocks
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
  });
  
  it('should create a ChimeraX process', async () => {
    const response = await request(app)
      .post('/api/chimerax/processes')
      .send({ sessionId: 'test-session' })
      .expect(201);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data.id).toBeDefined();
  });
});
```

### Frontend Test Example

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MoleculeViewer from '../../src/client/components/MoleculeViewer';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Create mock server
const server = setupServer(
  rest.post('/api/sessions/:sessionId/snapshots', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          id: 'mock-snapshot-id',
          url: '/api/snapshots/mock-snapshot.png'
        }
      })
    );
  })
);

// Start server before tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MoleculeViewer', () => {
  it('should render molecule when ChimeraX snapshot is available', async () => {
    render(<MoleculeViewer structureId="1ubq" width={800} height={600} />);
    
    // Wait for rendering
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-image')).toBeInTheDocument();
    });
  });
});
```

## Additional Resources

- [OSMesa Testing Strategy](/docs/testing/OSMesa_TESTING_STRATEGY.md)
- [Debugging OSMesa](/docs/testing/DEBUGGING_OSMESA.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest#readme)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [K6 Documentation](https://k6.io/docs/)