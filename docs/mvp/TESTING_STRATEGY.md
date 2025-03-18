# Testing Strategy

This document details the testing approach for the Hashi application, covering unit, integration, and end-to-end testing strategies.

## Task 1: Implement Testing Infrastructure and MVP Tests

### Goal
Set up the testing infrastructure and implement core tests to validate the functionality of the MVP.

### Subtasks

#### 1.1 Configure Testing Framework
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/jest.config.js`
  - `/Users/passos/GitHub/gomesgroup/hashi/jest.client.config.js`
  - `/Users/passos/GitHub/gomesgroup/hashi/package.json` (test scripts)
- **Description**: Set up and configure the testing frameworks.
- **Implementation**:
  - Configure Jest for unit and integration testing
  - Set up React Testing Library for frontend testing
  - Configure Playwright for end-to-end testing
  - Set up test database configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/unit/**/*.test.ts', '**/tests/integration/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts',
    '!src/client/**/*.ts',
    '!src/client/**/*.tsx',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
```

```javascript
// jest.client.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/client', '<rootDir>/tests/client'],
  testMatch: ['**/tests/client/**/*.test.ts', '**/tests/client/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@client/(.*)$': '<rootDir>/src/client/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/client/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};
```

#### 1.2 Implement Backend Unit Tests
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/unit/ChimeraXProcessManager.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/unit/authService.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/unit/sessionService.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/unit/storageService.test.ts`
- **Description**: Create unit tests for backend services.
- **Implementation**:
  - Implement tests for ChimeraX process management
  - Create authentication service tests
  - Add session service tests
  - Implement storage service tests

```typescript
// ChimeraXProcessManager.test.ts example
import { jest } from '@jest/globals';
import childProcess from 'child_process';
import chimeraXProcessManager from '../../src/server/services/ChimeraXProcessManager';
import config from '../../src/server/config';

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    pid: 12345,
    stdout: {
      on: jest.fn(),
    },
    stderr: {
      on: jest.fn(),
    },
    on: jest.fn(),
    kill: jest.fn().mockReturnValue(true),
  })),
}));

// Mock config
jest.mock('../../src/server/config', () => ({
  chimerax: {
    path: '/mock/chimerax',
    basePort: 9000,
    maxInstances: 3,
  },
}));

describe('ChimeraXProcessManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the process manager state
    chimeraXProcessManager['processes'] = new Map();
    chimeraXProcessManager['portPool'] = [9000, 9001, 9002];
  });

  describe('startProcess', () => {
    it('should spawn a ChimeraX process with correct parameters', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      
      const process = await chimeraXProcessManager.startProcess(userId, sessionId);
      
      expect(childProcess.spawn).toHaveBeenCalledWith(
        config.chimerax.path,
        expect.arrayContaining(['--nogui', '--rest', expect.stringContaining('900')]),
        expect.any(Object)
      );
      
      expect(process).toHaveProperty('id');
      expect(process).toHaveProperty('port', 9000);
      expect(process).toHaveProperty('userId', userId);
      expect(process).toHaveProperty('sessionId', sessionId);
      expect(process).toHaveProperty('status', 'starting');
    });

    it('should throw an error if no ports are available', async () => {
      // Start 3 processes to use all ports
      await chimeraXProcessManager.startProcess('user1', 'session1');
      await chimeraXProcessManager.startProcess('user2', 'session2');
      await chimeraXProcessManager.startProcess('user3', 'session3');
      
      // Try to start another process
      await expect(chimeraXProcessManager.startProcess('user4', 'session4'))
        .rejects.toThrow('No available ports for ChimeraX process');
    });
  });

  describe('terminateProcess', () => {
    it('should terminate a running process', async () => {
      const process = await chimeraXProcessManager.startProcess('user123', 'session456');
      
      const result = await chimeraXProcessManager.terminateProcess(process.id);
      
      expect(result).toBe(true);
      expect(process.process.kill).toHaveBeenCalled();
      expect(chimeraXProcessManager['portPool']).toContain(process.port);
    });

    it('should return false if process not found', async () => {
      const result = await chimeraXProcessManager.terminateProcess('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  // Additional tests for other methods
});
```

#### 1.3 Implement API Integration Tests
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/integration/authApi.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/integration/sessionApi.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/integration/structureApi.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/integration/commandApi.test.ts`
- **Description**: Create integration tests for API endpoints.
- **Implementation**:
  - Set up test database for integration tests
  - Implement authentication API tests
  - Create session API tests
  - Add structure API tests
  - Implement command API tests

```typescript
// authApi.test.ts example
import supertest from 'supertest';
import { jest } from '@jest/globals';
import app from '../../src/server/app';
import { repositories } from '../../src/server/database/repositories';
import { AppDataSource } from '../../src/server/database';
import { UserRole, UserStatus } from '../../src/server/types/auth';

const request = supertest(app);

describe('Authentication API', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear users table before each test
    await repositories.users.repository.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      
      // Verify user was created in the database
      const user = await repositories.users.findByEmail('test@example.com');
      expect(user).not.toBeNull();
      expect(user?.role).toBe(UserRole.USER);
      expect(user?.status).toBe(UserStatus.ACTIVE);
    });

    it('should return 400 if user already exists', async () => {
      // Create user first
      await repositories.users.create({
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        profile: {
          firstName: 'Existing',
          lastName: 'User',
        },
      });
      
      const response = await request
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'USER_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      
      await repositories.users.create({
        email: 'test@example.com',
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
    });

    it('should authenticate user and return tokens', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });
  });

  // Additional integration tests
});
```

#### 1.4 Implement Frontend Component Tests
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/client/components/MolecularViewer.test.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/client/components/SessionControls.test.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/client/components/LoginForm.test.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/client/contexts/SessionContext.test.tsx`
- **Description**: Create tests for React components.
- **Implementation**:
  - Set up React Testing Library
  - Create tests for core components
  - Implement context testing
  - Add visual and functional testing

```tsx
// LoginForm.test.tsx example
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../src/client/contexts/AuthContext';
import LoginForm from '../../../src/client/components/LoginForm';
import * as authService from '../../../src/client/services/authService';

// Mock authentication service
jest.mock('../../../src/client/services/authService', () => ({
  loginUser: jest.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLoginForm = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders login form with email and password fields', () => {
    renderLoginForm();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    renderLoginForm();
    
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const mockLoginResponse = {
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      },
      user: {
        id: 'user123',
        email: 'test@example.com',
        role: 'USER',
      },
    };
    
    (authService.loginUser as jest.Mock).mockResolvedValue(mockLoginResponse);
    
    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(authService.loginUser).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
    });
  });

  it('displays error message when login fails', async () => {
    (authService.loginUser as jest.Mock).mockRejectedValue({
      message: 'Invalid credentials',
    });
    
    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

#### 1.5 Implement End-to-End Tests
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/e2e/auth.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/e2e/sessionManagement.test.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/e2e/structureVisualization.test.ts`
- **Description**: Create end-to-end tests for critical user flows.
- **Implementation**:
  - Set up Playwright for E2E testing
  - Implement authentication flow tests
  - Create session management tests
  - Add structure visualization tests

```typescript
// auth.test.ts example
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow user to register', async ({ page }) => {
    // Navigate to registration page
    await page.click('a[href="/register"]');
    
    // Fill in registration form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Test')).toBeVisible();
  });

  test('should allow user to login', async ({ page }) => {
    // Navigate to login page
    await page.click('a[href="/login"]');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should not allow login with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('a[href="/login"]');
    
    // Fill in login form with wrong credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify error
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should allow user to logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Verify redirect to login page
    await expect(page).toHaveURL('/login');
  });
});
```

#### 1.6 Set Up ChimeraX Mock for Testing
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/mocks/ChimeraX.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/tests/mocks/ChimeraXResponses.ts`
- **Description**: Create mocks for ChimeraX interactions in tests.
- **Implementation**:
  - Implement mock ChimeraX process
  - Create mock responses for ChimeraX commands
  - Set up mock for structure loading
  - Add mock for rendering operations

```typescript
// ChimeraX.ts mock example
import { EventEmitter } from 'events';

class MockChimeraXProcess extends EventEmitter {
  public pid: number;
  public port: number;
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  private responses: Map<string, any>;

  constructor(port: number) {
    super();
    this.pid = Math.floor(Math.random() * 10000);
    this.port = port;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.responses = new Map();
    this.initializeResponses();
  }

  public kill(signal?: string): boolean {
    this.emit('close', 0);
    return true;
  }

  public registerResponse(command: string, response: any): void {
    this.responses.set(command, response);
  }

  public async sendCommand(command: string): Promise<any> {
    // Check for exact match
    if (this.responses.has(command)) {
      return this.responses.get(command);
    }

    // Check for pattern match
    for (const [pattern, response] of this.responses.entries()) {
      if (command.match(new RegExp(pattern))) {
        return typeof response === 'function' ? response(command) : response;
      }
    }

    // Default response
    return { success: false, error: `Command not mocked: ${command}` };
  }

  private initializeResponses(): void {
    // Load pre-defined responses from ChimeraXResponses
    const responses = require('./ChimeraXResponses').default;
    for (const [command, response] of Object.entries(responses)) {
      this.registerResponse(command, response);
    }
  }
}

export const createMockChimeraXProcess = (port: number): MockChimeraXProcess => {
  return new MockChimeraXProcess(port);
};

export default { createMockChimeraXProcess };
```

#### 1.7 Set Up CI Integration
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/.github/workflows/ci.yml`
  - `/Users/passos/GitHub/gomesgroup/hashi/.github/workflows/test.yml`
- **Description**: Configure CI for automated testing.
- **Implementation**:
  - Set up GitHub Actions workflow
  - Configure test runners for different test types
  - Add code coverage reporting
  - Implement linting and type checking

```yaml
# ci.yml example
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage-unit
          path: coverage

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_USER: postgres
          POSTGRES_DB: hashi_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: hashi_test
          DB_TYPE: postgres
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage-integration
          path: coverage

  test-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - run: npm ci
      - run: npm run test:client
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage-client
          path: coverage

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Build application
        run: npm run build
      - name: Run E2E tests
        run: npm run test:e2e
```

## Acceptance Criteria

The tasks in this document are considered complete when:

1. All testing infrastructure is set up and configured
2. Unit tests cover core backend services
3. Integration tests validate API functionality
4. Frontend component tests ensure UI works correctly
5. End-to-end tests verify critical user journeys
6. ChimeraX mocks allow testing without the actual process
7. CI integration runs tests automatically
8. Test coverage meets the target of 70% for core functionality