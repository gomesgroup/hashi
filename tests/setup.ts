import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.test file if it exists, otherwise use .env
const testEnvPath = path.resolve(process.cwd(), '.env.test');
const envPath = fs.existsSync(testEnvPath) ? testEnvPath : path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise during tests

// Set up global test timeout (30 seconds)
jest.setTimeout(30000);

// Create fixtures directory if it doesn't exist
const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Global teardown
afterAll(async () => {
  // Clean up any test resources
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    const files = fs.readdirSync(fixturesDir);
    
    // Delete test files created during tests
    for (const file of files) {
      fs.unlinkSync(path.join(fixturesDir, file));
    }
  }
});