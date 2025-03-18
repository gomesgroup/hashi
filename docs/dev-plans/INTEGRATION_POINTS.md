# Integration Points

This document details the critical points where different components of the system must interact with each other, defining the interfaces, responsibilities, and testing requirements.

## ChimeraX Integration Points

### IP1: ChimeraX REST API ↔ Frontend Visualization

**Devs Involved**: Dev 1 (Backend), Dev 2 (Frontend)

**Description**:  
The backend needs to expose a REST API that allows the frontend to control ChimeraX and retrieve visualizations.

**Interface Definition**:
```typescript
// API Endpoints
POST /api/chimerax/start          // Start ChimeraX process
POST /api/chimerax/stop           // Stop ChimeraX process
POST /api/chimerax/command        // Execute ChimeraX command
POST /api/chimerax/snapshot       // Generate image snapshot
GET  /api/chimerax/status         // Get ChimeraX process status
GET  /api/snapshots/:filename     // Retrieve a snapshot image
```

**Responsibilities**:
- **Dev 1**: Implement backend API endpoints with proper error handling
- **Dev 2**: Implement frontend services to consume these endpoints

**Acceptance Criteria**:
- API endpoints correctly handle all success and error cases
- Frontend can successfully control ChimeraX via API
- Both components gracefully handle connection issues

**Target Completion**: Phase 2, Day 5

### IP2: Docker Environment ↔ Backend Services

**Devs Involved**: Dev 1 (Backend), Dev 3 (Deployment)

**Description**:  
The Docker environment must provide all dependencies needed by the backend services, including ChimeraX and OSMesa.

**Interface Definition**:
```dockerfile
# Key Dockerfile elements
FROM base-image
# Install dependencies including ChimeraX and OSMesa
# Configure environment variables
# Mount volumes for snapshots
# Expose necessary ports
```

**Responsibilities**:
- **Dev 3**: Create Docker environment with all dependencies
- **Dev 1**: Ensure backend works correctly within Docker environment

**Acceptance Criteria**:
- Backend services start correctly inside Docker
- ChimeraX can perform offscreen rendering inside Docker
- File system operations work correctly for snapshots

**Target Completion**: Phase 3, Day 6

### IP3: Testing Framework ↔ Rendering Components

**Devs Involved**: Dev 2 (Frontend), Dev 4 (Testing)

**Description**:  
The testing framework must be able to validate rendering components with both real ChimeraX output and fallback mechanisms.

**Interface Definition**:
```typescript
// ChimeraX Mock Utilities 
import ChimeraXMockUtil, { ChimeraXEnvironment } from './mocks/chimeraxMock';

// Environment control for testing
ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);

// Mock spawn, fetch, and filesystem operations
const mockSpawn = ChimeraXMockUtil.getMockSpawn();
const mockFetch = ChimeraXMockUtil.getMockFetch();
const mockFs = ChimeraXMockUtil.getMockFileSystem();

// Generate test data
const mockJob = ChimeraXMockUtil.createMockRenderingJob('test-job', 'test-session');
```

**Responsibilities**:
- **Dev 4**: Create test framework and mock utilities ✅
- **Dev 2**: Ensure frontend components are testable 🟡

**Acceptance Criteria**:
- Test framework can validate rendering with/without ChimeraX ✅
- Frontend components have high test coverage 🟡
- All edge cases and fallbacks are tested ✅

**Current Status**: In Progress
Frontend testing framework is fully implemented. Waiting for Dev 2 to integrate frontend components with the test utilities.

**Target Completion**: Phase 3, Day 7

### IP4: Testing Framework ↔ Backend Services

**Devs Involved**: Dev 1 (Backend), Dev 4 (Testing)

**Description**:  
The testing framework must be able to validate backend services, especially ChimeraX process management and snapshot generation.

**Interface Definition**:
```typescript
// Integration tests for ChimeraX API endpoints
import request from 'supertest';
import { app } from '../../src/server';
import ChimeraXMockUtil from '../mocks/chimeraxMock';

// Example API test
describe('ChimeraX API', () => {
  it('should handle OSMesa errors properly', async () => {
    // Configure mock for OSMesa failure
    ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
    
    // Test API behavior with failed rendering
    const response = await request(app)
      .post('/api/chimerax/processes/:id/command')
      .send({ command: 'save snapshot.png' })
      .expect(404);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('OpenGL rendering is not available');
  });
});
```

**Responsibilities**:
- **Dev 4**: Create backend test framework ✅
- **Dev 1**: Ensure backend services are testable 🟡

**Acceptance Criteria**:
- Test framework can validate backend with/without ChimeraX ✅
- High test coverage for critical backend services 🟡
- All error paths and edge cases are tested ✅

**Current Status**: Verified
Backend testing framework is fully implemented with comprehensive mocks for ChimeraX and OSMesa. Manual testing confirmed that the backend correctly handles OSMesa unavailability with appropriate error response: "ERROR: Unable to save images because OpenGL rendering is not available".

**Target Completion**: Phase 3, Day 7

## Communication Flow

```
+----------+         +----------+         +----------+         +----------+
|          |         |          |         |          |         |          |
|  Dev 1   |<------->|  Dev 2   |<------->|  Dev 3   |<------->|  Dev 4   |
| Backend  |         | Frontend |         |Deployment|         |  Testing |
|          |         |          |         |          |         |          |
+----------+         +----------+         +----------+         +----------+
      ^                   ^                   ^                   ^
      |                   |                   |                   |
      v                   v                   v                   v
+--------------------------------------------------------------------------+
|                            COORDINATION.md                                |
+--------------------------------------------------------------------------+
```

## Integration Testing Plan

Each integration point should be tested in isolation and then progressively integrated:

1. Mock test each component separately
2. Test integration of pairs of components
3. Test full system integration
4. Test failure and fallback scenarios

## Integration Schedule

| Phase | Integration Points | Participants | Test Method | Status |
|-------|------------------|-------------|------------|--------|
| Phase 2, Day 5 | IP1: API ↔ Frontend | Dev 1, Dev 2, Dev 4 | Unit + Integration tests | Not Started |
| Phase 3, Day 6 | IP2: Docker ↔ Backend | Dev 1, Dev 3, Dev 4 | Local Docker tests | In Progress |
| Phase 3, Day 7 | IP3: Testing ↔ Rendering | Dev 2, Dev 4 | Automated test suite | In Progress |
| Phase 3, Day 7 | IP4: Testing ↔ Backend | Dev 1, Dev 4 | Automated test suite | In Progress |
| Phase 4, Day 8 | Full System | All Devs | End-to-end tests | Not Started |