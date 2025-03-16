import fs from 'fs';
import path from 'path';

/**
 * Cleanup test files and directories created during tests
 */
export function cleanupTestFiles(): void {
  // Remove fixtures directory
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    const files = fs.readdirSync(fixturesDir);
    
    // Delete each file in the fixtures directory
    for (const file of files) {
      fs.unlinkSync(path.join(fixturesDir, file));
    }
    
    // Remove the directory itself
    fs.rmdirSync(fixturesDir);
  }
  
  // Other cleanup tasks can be added here
}