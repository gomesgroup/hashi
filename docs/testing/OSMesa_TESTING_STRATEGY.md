# OSMesa Testing Strategy

This document outlines the strategy for testing ChimeraX rendering with OSMesa in the Hashi application.

## Overview

ChimeraX requires OSMesa libraries for offscreen rendering (rendering without a display). This is critical for server-side rendering, especially in Docker containers and CI/CD environments.

The testing strategy ensures that:
1. The application correctly detects when OSMesa is available
2. The application provides appropriate fallbacks when OSMesa is not available
3. The transition between rendering modes is smooth and well-communicated to users

## Test Frameworks

The testing strategy is implemented using the following frameworks:

- **Jest**: For unit and integration testing
- **Supertest**: For testing the API endpoints
- **React Testing Library**: For frontend component testing
- **MSW (Mock Service Worker)**: For mocking API responses in frontend tests

## Testing Levels

### 1. Dependency Verification Tests

The `verifyDependencies.ts` script and its shell companion `verify-dependencies.sh` test the availability of ChimeraX and OSMesa on the system. These tests:

- Check for ChimeraX installation
- Verify OSMesa library presence
- Detect if ChimeraX is properly linked with OSMesa
- Handle different platforms (Linux, macOS, Windows)
- Provide clear feedback on what's missing and how to fix it

### 2. Backend Unit Tests

Backend unit tests focus on how the application detects and responds to OSMesa rendering capabilities:

- `ChimeraXProcessManager`: Tests process spawning, commands, and termination
- `RenderingQueue`: Tests how rendering jobs are submitted, processed, and prioritized
- `SnapshotService`: Tests snapshot generation with and without OSMesa

### 3. Mock Systems

The `ChimeraXMockUtil` class provides mock implementations for testing different scenarios:

- `FULL_RENDERING`: Simulates a system with working ChimeraX and OSMesa
- `NO_OSMESA`: Simulates a system where ChimeraX is available but OSMesa is missing
- `NO_CHIMERAX`: Simulates a system where ChimeraX is not installed
- `SLOW_RENDERING`: Simulates slow rendering for timeout testing
- `COMMAND_ERROR`: Simulates ChimeraX command failures

### 4. API Integration Tests

API tests verify the behavior of the ChimeraX REST API endpoints:

- Process creation and management
- Command execution with successful rendering
- Error handling for missing OSMesa
- Fallback mechanisms
- Session cleanup

### 5. Frontend Component Tests

Frontend tests ensure the visualization components handle rendering issues gracefully:

- `MoleculeViewer`: Tests loading, error states, and fallback visualization
- `RenderingOptions`: Tests that rendering options adapt to system capabilities
- `ErrorHandling`: Tests user notifications for rendering issues

## Running Tests

To run the full test suite:

```bash
npm test
```

To run specific test categories:

```bash
# Test OSMesa detection specifically
npm test -- -t "OSMesa"

# Test API endpoints
npm run test:backend

# Test frontend components
npm run test:client
```

## Continuous Integration

The CI pipeline includes:

1. Dependency verification to detect missing libraries
2. Unit and integration tests in a Docker environment
3. Testing on both Linux and macOS runners for cross-platform verification
4. Automated system for recording OSMesa support in build artifacts

## Manual Testing

For full verification, manual testing should confirm:

1. Rendering works on systems with OSMesa installed
2. Fallback mechanisms activate correctly when OSMesa is missing
3. Appropriate error messages are displayed to users
4. Performance remains acceptable in fallback mode

## Troubleshooting

Common testing issues and solutions:

- **Test timeouts**: Increase timeout values for slow rendering tests
- **Mock mismatches**: Ensure child_process and fetch mocks are properly reset
- **Platform differences**: Use platform-specific test paths in the verify scripts
- **Docker integration**: Use the test-specific Docker image with OSMesa preinstalled

## Documentation

All test utilities are documented with JSDoc comments. Additional documentation is available in:

- `docs/dev-plans/04_TESTING_DOCUMENTATION.md`: Overall testing plan
- `docs/testing/OSMesa_TESTING_STRATEGY.md`: This document
- Code comments in test files and mock implementations