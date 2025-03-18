/**
 * Standalone test script for Hashi MVP evaluation
 * This script doesn't rely on any existing configuration
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');

// Hard-coded configuration
const PORT = 9876; // Use an unlikely port
const CHIMERAX_PATH = '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';

// Check if ChimeraX exists
console.log(`Checking ChimeraX at: ${CHIMERAX_PATH}`);
if (fs.existsSync(CHIMERAX_PATH)) {
  console.log('✅ ChimeraX found!');
} else {
  console.error('❌ ChimeraX not found at the specified path!');
  process.exit(1);
}

// Setup express app
const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Create snapshots directory if it doesn't exist
const SNAPSHOTS_DIR = './snapshots';
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// State
let chimeraxProcess = null;

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hashi standalone test server running',
    timestamp: new Date().toISOString()
  });
});

// Serve static snapshot files
app.get('/api/snapshots/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = `${SNAPSHOTS_DIR}/${filename}`;
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      status: 'error',
      message: 'Snapshot not found'
    });
  }
  
  res.sendFile(filePath, { root: process.cwd() });
});

app.get('/api/chimerax/status', (req, res) => {
  const isRunning = chimeraxProcess !== null;
  res.json({
    status: 'success',
    chimeraxPath: CHIMERAX_PATH,
    running: isRunning,
    pid: isRunning ? chimeraxProcess.pid : null
  });
});

app.post('/api/chimerax/start', (req, res) => {
  if (chimeraxProcess) {
    return res.json({
      status: 'success',
      message: 'ChimeraX is already running',
      pid: chimeraxProcess.pid
    });
  }

  try {
    // Start ChimeraX process
    console.log('Starting ChimeraX process...');
    console.log('Setting OSMESA_LIBRARY to: /opt/homebrew/lib/libOSMesa.dylib');
    // Use --nogui for headless mode, no --silent to allow stdin commands
    // Add OSMESA_LIBRARY to the environment to help ChimeraX find the OSMesa libraries
    chimeraxProcess = spawn(CHIMERAX_PATH, ['--nogui', '--offscreen'], {
      stdio: ['pipe', 'pipe', 'pipe'], // Explicitly enable all stdio
      env: {
        ...process.env,
        OSMESA_LIBRARY: '/opt/homebrew/lib/libOSMesa.dylib',
        DYLD_LIBRARY_PATH: '/opt/homebrew/lib:' + (process.env.DYLD_LIBRARY_PATH || '')
      }
    });
    
    // Handle process output
    chimeraxProcess.stdout.on('data', (data) => {
      console.log(`ChimeraX output: ${data.toString().trim()}`);
    });
    
    chimeraxProcess.stderr.on('data', (data) => {
      console.error(`ChimeraX error: ${data.toString().trim()}`);
    });
    
    // Handle process exit
    chimeraxProcess.on('close', (code) => {
      console.log(`ChimeraX process exited with code ${code}`);
      chimeraxProcess = null;
    });
    
    res.json({
      status: 'success',
      message: 'ChimeraX started successfully',
      pid: chimeraxProcess.pid
    });
  } catch (error) {
    console.error('Failed to start ChimeraX:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to start ChimeraX: ${error.message}`
    });
  }
});

app.post('/api/chimerax/command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({
      status: 'error',
      message: 'Command is required'
    });
  }
  
  if (!chimeraxProcess) {
    return res.status(400).json({
      status: 'error',
      message: 'ChimeraX is not running. Start it first.'
    });
  }
  
  console.log(`Executing ChimeraX command: ${command}`);
  
  // Actually send command to ChimeraX via stdin
  chimeraxProcess.stdin.write(command + '\n');
  
  res.json({
    status: 'success',
    message: 'Command sent to ChimeraX',
    command
  });
});

// Snapshot endpoint
app.post('/api/chimerax/snapshot', (req, res) => {
  const { width = 800, height = 600, background = '#000000' } = req.body;
  
  if (!chimeraxProcess) {
    return res.status(400).json({
      status: 'error',
      message: 'ChimeraX is not running. Start it first.'
    });
  }
  
  try {
    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${timestamp}.png`;
    const filePath = `${SNAPSHOTS_DIR}/${filename}`;
    
    // Create ChimeraX save command
    const saveCommand = `save "${filePath}" width ${width} height ${height} supersample 3 transparent false`;
    console.log(`Taking snapshot with command: ${saveCommand}`);
    
    // Send the save command to ChimeraX
    chimeraxProcess.stdin.write(saveCommand + '\n');
    
    // Wait for the file to be created
    // This is a naive approach and a more robust solution would use a promise with file polling
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        // Return the image URL
        const imageUrl = `/api/snapshots/${filename}`;
        res.json({
          status: 'success',
          message: 'Snapshot created',
          imageUrl,
          width,
          height
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Failed to create snapshot'
        });
      }
    }, 1000); // Wait 1 second for the file to be created
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to create snapshot: ${error.message}`
    });
  }
});

app.post('/api/chimerax/stop', (req, res) => {
  if (!chimeraxProcess) {
    return res.json({
      status: 'success',
      message: 'ChimeraX is not running'
    });
  }
  
  try {
    chimeraxProcess.kill();
    chimeraxProcess = null;
    
    res.json({
      status: 'success',
      message: 'ChimeraX stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping ChimeraX:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to stop ChimeraX: ${error.message}`
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Standalone Test Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET  /api/health`);
  console.log(`- GET  /api/chimerax/status`);
  console.log(`- POST /api/chimerax/start`);
  console.log(`- POST /api/chimerax/command (requires {"command": "..."} in body)`);
  console.log(`- POST /api/chimerax/snapshot (optional: {"width": 800, "height": 600})`);
  console.log(`- GET  /api/snapshots/:filename`);
  console.log(`- POST /api/chimerax/stop`);
  console.log('\nTest with curl:');
  console.log(`curl http://localhost:${PORT}/api/health`);
  console.log(`curl http://localhost:${PORT}/api/chimerax/status`);
  console.log(`curl -X POST http://localhost:${PORT}/api/chimerax/start`);
  console.log(`curl -X POST -H "Content-Type: application/json" -d '{"command":"open 1abc"}' http://localhost:${PORT}/api/chimerax/command`);
  console.log(`curl -X POST -H "Content-Type: application/json" -d '{"width":800,"height":600}' http://localhost:${PORT}/api/chimerax/snapshot`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (chimeraxProcess) {
    console.log('Stopping ChimeraX process...');
    chimeraxProcess.kill();
  }
  process.exit(0);
});