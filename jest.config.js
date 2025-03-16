module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*',
    '!src/client/**/*', // Client-side code will be tested with a different config
  ],
  coverageThreshold: {
    global: {
      branches: 80, // Increased to match acceptance criteria
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Configure test environments
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/tests/api/**/*.test.ts'],
      testEnvironment: 'node',
    },
  ],
  // Setup files for the test environment
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Configure timeouts for long-running tests
  testTimeout: 30000,
  // Reporter configuration
  reporters: ['default', 'jest-junit'],
};
