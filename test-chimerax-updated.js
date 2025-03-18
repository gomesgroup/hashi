// Simple script to test the Hashi MVP backend with ChimeraX integration
const fs = require('fs');
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

console.log('HASHI MVP BACKEND TEST\n');

// Step 1: Verify ChimeraX installation
const chimeraxPath = process.env.CHIMERAX_PATH || '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';
console.log(`1. Verifying ChimeraX installation at: ${chimeraxPath}`);

try {
  if (fs.existsSync(chimeraxPath)) {
    console.log(`   ✅ ChimeraX executable found`);
    
    // Try to run ChimeraX with --version flag to verify it works
    try {
      const version = execSync(`"${chimeraxPath}" --version`, { encoding: 'utf8' });
      console.log(`   ✅ ChimeraX version: ${version.trim()}`);
    } catch (err) {
      console.error(`   ❌ Error running ChimeraX: ${err.message}`);
    }
  } else {
    console.error(`   ❌ ChimeraX executable not found at ${chimeraxPath}`);
  }
} catch (err) {
  console.error(`   ❌ Error checking ChimeraX: ${err.message}`);
}

// Step 2: Create a minimal dev server
console.log('\n2. Setting up minimal dev server for testing...');

const PORT = 4567; // Use a different port to avoid conflicts
const devServer = `
const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

const CHIMERAX_PATH = '${chimeraxPath}';
let chimeraxProcess = null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hashi test server running' });
});

app.get('/api/chimerax/status', (req, res) => {
  res.json({ 
    status: 'success', 
    chimeraxRunning: chimeraxProcess !== null,
    chimeraxPath: CHIMERAX_PATH
  });
});

app.post('/api/chimerax/start', (req, res) => {
  if (chimeraxProcess) {
    return res.json({ status: 'success', message: 'ChimeraX already running' });
  }
  
  try {
    chimeraxProcess = spawn(CHIMERAX_PATH, ['--nogui', '--silent']);
    chimeraxProcess.stdout.on('data', data => console.log(\`ChimeraX: \${data}\`));
    chimeraxProcess.stderr.on('data', data => console.error(\`ChimeraX error: \${data}\`));
    chimeraxProcess.on('close', code => {
      console.log(\`ChimeraX process exited with code \${code}\`);
      chimeraxProcess = null;
    });
    
    res.json({ status: 'success', message: 'ChimeraX started' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/chimerax/stop', (req, res) => {
  if (!chimeraxProcess) {
    return res.json({ status: 'success', message: 'ChimeraX not running' });
  }
  
  chimeraxProcess.kill();
  chimeraxProcess = null;
  res.json({ status: 'success', message: 'ChimeraX stopped' });
});

app.listen(${PORT}, () => {
  console.log(\`Test server running at http://localhost:${PORT}\`);
});
`;

const testServerPath = path.join(__dirname, 'test-server.js');
fs.writeFileSync(testServerPath, devServer);
console.log(`   ✅ Created test server at ${testServerPath}`);

// Step 3: Start the test server
console.log('\n3. Starting test server...');
let serverProcess;

try {
  serverProcess = spawn('node', [testServerPath], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`   Server: ${data.toString().trim()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`   Server error: ${data.toString().trim()}`);
  });
  
  // Wait for server to start
  setTimeout(() => {
    console.log('   ✅ Test server should now be running');
    console.log(`   Test endpoint: http://localhost:${PORT}/api/health`);
    
    // Step 4: Print test commands
    console.log('\n4. Test commands:');
    console.log(`   • Check server health:  curl http://localhost:${PORT}/api/health`);
    console.log(`   • Check ChimeraX status: curl http://localhost:${PORT}/api/chimerax/status`);
    console.log(`   • Start ChimeraX: curl -X POST http://localhost:${PORT}/api/chimerax/start`);
    console.log(`   • Stop ChimeraX: curl -X POST http://localhost:${PORT}/api/chimerax/stop`);
    
    console.log('\n5. To stop the test server, press Ctrl+C');
    console.log('   You can also run the commands directly using curl from another terminal');
    
    // Keep the script running to maintain the server
    process.on('SIGINT', () => {
      console.log('\nStopping test server...');
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });
  }, 2000);
} catch (err) {
  console.error(`   ❌ Error starting test server: ${err.message}`);
}