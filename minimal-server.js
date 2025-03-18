/**
 * Minimal Test Server for ChimeraX Integration
 */

// Load environment variables from test file
require('dotenv').config({ path: '.env.test' });

const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 8765;
// Use hard-coded path to ensure correctness
const CHIMERAX_PATH = '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';

console.log(`Using ChimeraX path: ${CHIMERAX_PATH}`);

// State
let chimeraxProcess = null;

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hashi minimal test server running',
    timestamp: new Date().toISOString()
  });
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
    chimeraxProcess = spawn(CHIMERAX_PATH, ['--nogui', '--silent']);
    
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
      code: 'CHIMERAX_ERROR',
      message: `Failed to start ChimeraX: ${error.message}`
    });
  }
});

app.post('/api/chimerax/command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Command is required'
    });
  }
  
  if (!chimeraxProcess) {
    return res.status(400).json({
      status: 'error',
      code: 'CHIMERAX_ERROR',
      message: 'ChimeraX is not running. Start it first.'
    });
  }
  
  // For testing, just log the command and return success
  console.log(`Executing ChimeraX command: ${command}`);
  
  res.json({
    status: 'success',
    message: 'Command sent to ChimeraX',
    command
  });
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
      code: 'CHIMERAX_ERROR',
      message: `Failed to stop ChimeraX: ${error.message}`
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Minimal Test Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET  /api/health`);
  console.log(`- GET  /api/chimerax/status`);
  console.log(`- POST /api/chimerax/start`);
  console.log(`- POST /api/chimerax/command (requires {"command": "..."} in body)`);
  console.log(`- POST /api/chimerax/stop`);
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