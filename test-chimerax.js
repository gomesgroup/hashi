// Simple script to verify ChimeraX installation and setup
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

console.log('CHIMERAX VERIFICATION UTILITY\n');

// 1. Check for ChimeraX path in environment variables
const chimeraxPath = process.env.CHIMERAX_PATH;
console.log(`1. CHIMERAX_PATH in .env: ${chimeraxPath || 'Not set'}`);

// 2. Check if ChimeraX executable exists
if (chimeraxPath) {
  try {
    fs.accessSync(chimeraxPath, fs.constants.X_OK);
    console.log(`2. ChimeraX executable exists and is executable: ✅`);
  } catch (error) {
    console.error(`2. ChimeraX executable issue: ❌ (${error.message})`);
    console.log(`   Verify the path in .env file is correct.`);
  }
} else {
  console.error(`2. Cannot check ChimeraX executable: ❌ (CHIMERAX_PATH not set)`);
}

// 3. Check if ChimeraX version is correct
try {
  if (chimeraxPath) {
    const version = execSync(`"${chimeraxPath}" --nogui --silent --cmd "version; exit;"`, { encoding: 'utf8' });
    console.log(`3. ChimeraX version: ${version.trim() || 'Unknown'}`);
  } else {
    console.error(`3. Cannot check ChimeraX version: ❌ (CHIMERAX_PATH not set)`);
  }
} catch (error) {
  console.error(`3. Error checking ChimeraX version: ❌ (${error.message})`);
}

// 4. Test if dev server can be started
console.log(`\n4. Dev server status:`);
try {
  console.log(`   - Looking for processes on port 4000...`);
  const portCheck = execSync('lsof -i :4000 || echo "No process found"', { encoding: 'utf8' });
  
  if (portCheck.includes('No process found')) {
    console.log(`   - Port 4000 is available for dev server`);
  } else {
    console.log(`   - Process already running on port 4000:\n${portCheck}`);
  }
} catch (error) {
  console.log(`   - Error checking port: ${error.message}`);
}

// 5. Display test commands
console.log(`\n5. Test commands:`);
console.log(`   - Start dev server:    node dev-server.js`);
console.log(`   - Test API endpoints:  node test-endpoints.js`);
console.log(`   - Check ChimeraX status: curl http://localhost:4000/api/chimerax/status`);
console.log(`   - Start ChimeraX:        curl -X POST http://localhost:4000/api/chimerax/start`);
console.log(`   - Send ChimeraX command: curl -X POST -H "Content-Type: application/json" -d '{"command":"open 1abc"}' http://localhost:4000/api/chimerax/command`);

console.log('\nVerification complete.');