/**
 * Simplified Development Server for Hashi
 * 
 * This server is used for testing ChimeraX connectivity and API endpoints
 * without running the full application stack.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Load configuration
const CHIMERAX_PATH = process.env.CHIMERAX_PATH || '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';
console.log(`ChimeraX path from env: ${process.env.CHIMERAX_PATH}`);
console.log(`Using ChimeraX path: ${CHIMERAX_PATH}`);
const SERVER_PORT = process.env.DEV_SERVER_PORT || 4000;
const CHIMERAX_PORT = process.env.CHIMERAX_BASE_PORT || 6100;

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// State
let chimeraxProcess = null;
let chimeraxStatus = 'idle';

/**
 * Start ChimeraX process
 * @returns {Promise<Object>} Process information
 */
async function startChimeraX() {
  if (chimeraxProcess) {
    return { status: chimeraxStatus, port: CHIMERAX_PORT };
  }

  return new Promise((resolve, reject) => {
    try {
      console.log(`Starting ChimeraX process on port ${CHIMERAX_PORT}...`);
      
      const args = [
        '--nogui',
        '--offscreen',
        '--nosilent',
        '--noexit',
        '--cmd',
        `remotecontrol rest start port ${CHIMERAX_PORT} json true`,
      ];
      
      chimeraxProcess = spawn(CHIMERAX_PATH, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      chimeraxStatus = 'starting';
      
      // Log stdout
      chimeraxProcess.stdout.on('data', (data) => {
        console.log(`ChimeraX stdout: ${data.toString().trim()}`);
      });
      
      // Log stderr
      chimeraxProcess.stderr.on('data', (data) => {
        console.error(`ChimeraX stderr: ${data.toString().trim()}`);
      });
      
      // Handle process exit
      chimeraxProcess.on('close', (code) => {
        console.log(`ChimeraX process exited with code ${code}`);
        chimeraxProcess = null;
        chimeraxStatus = 'idle';
      });
      
      chimeraxProcess.on('error', (error) => {
        console.error(`ChimeraX process error: ${error.message}`);
        reject(error);
      });
      
      // Wait for ChimeraX to initialize
      waitForChimeraX()
        .then(() => {
          chimeraxStatus = 'running';
          resolve({ status: chimeraxStatus, port: CHIMERAX_PORT });
        })
        .catch(reject);
    } catch (error) {
      console.error(`Error starting ChimeraX: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Wait for ChimeraX to initialize
 * @returns {Promise<void>} Resolves when ChimeraX is ready
 */
async function waitForChimeraX() {
  const maxAttempts = 30;
  const retryInterval = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:${CHIMERAX_PORT}/version`);
      if (response.ok) {
        console.log(`ChimeraX REST API available on port ${CHIMERAX_PORT}`);
        return;
      }
    } catch (error) {
      // Ignore errors during initialization
    }
    
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  throw new Error(`ChimeraX REST API did not start within ${maxAttempts * retryInterval / 1000} seconds`);
}

/**
 * Stop ChimeraX process
 * @returns {Promise<boolean>} True if process was stopped
 */
async function stopChimeraX() {
  if (!chimeraxProcess) {
    return false;
  }
  
  return new Promise((resolve) => {
    try {
      console.log('Stopping ChimeraX process...');
      
      chimeraxProcess.kill();
      chimeraxProcess = null;
      chimeraxStatus = 'idle';
      
      resolve(true);
    } catch (error) {
      console.error(`Error stopping ChimeraX: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Send a command to ChimeraX
 * @param {string} command Command to send
 * @returns {Promise<Object>} Command result
 */
async function sendCommand(command) {
  if (!chimeraxProcess || chimeraxStatus !== 'running') {
    throw new Error('ChimeraX is not running');
  }
  
  try {
    const encodedCommand = encodeURIComponent(command);
    const url = `http://localhost:${CHIMERAX_PORT}/run?command=${encodedCommand}`;
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(`Error sending command to ChimeraX: ${error.message}`);
    throw error;
  }
}

// Routes

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Development server is running',
    timestamp: new Date(),
    mode: 'ChimeraX Test Server',
  });
});

// Check if ChimeraX is installed and accessible
app.get('/api/chimerax/status', (req, res) => {
  const chimeraxPath = process.env.CHIMERAX_PATH;
  
  if (!chimeraxPath) {
    return res.status(500).json({
      status: 'error',
      message: 'CHIMERAX_PATH not set in environment variables'
    });
  }

  // Check if the file exists
  fs.access(chimeraxPath, fs.constants.X_OK, (err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: `ChimeraX not found or not executable at path: ${chimeraxPath}`,
        error: err.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'ChimeraX is installed and accessible',
      path: chimeraxPath,
      processStatus: chimeraxStatus,
      port: CHIMERAX_PORT,
      pid: chimeraxProcess ? chimeraxProcess.pid : null
    });
  });
});

// Start ChimeraX endpoint
app.post('/api/chimerax/start', async (req, res) => {
  try {
    const result = await startChimeraX();
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Stop ChimeraX endpoint
app.post('/api/chimerax/stop', async (req, res) => {
  try {
    const result = await stopChimeraX();
    res.status(200).json({
      status: 'success',
      stopped: result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Send command to ChimeraX endpoint
app.post('/api/chimerax/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Command must be a non-empty string',
      });
    }
    
    const result = await sendCommand(command);
    
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Session creation simulation endpoint
app.post('/api/sessions', async (req, res) => {
  try {
    // Start ChimeraX if not already running
    if (!chimeraxProcess) {
      await startChimeraX();
    }
    
    // Generate a session ID
    const sessionId = `session-${Date.now()}`;
    
    res.status(201).json({
      status: 'success',
      data: {
        session: {
          id: sessionId,
          created: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          port: parseInt(CHIMERAX_PORT),
          status: 'ready'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Session termination simulation endpoint
app.delete('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  
  res.status(200).json({
    status: 'success',
    message: `Session ${sessionId} terminated successfully`
  });
});

// Setup routes for client-side routing
app.use(express.static(path.join(__dirname, 'dist')));

// Start server
app.listen(SERVER_PORT, () => {
  console.log(`Development server running on http://localhost:${SERVER_PORT}`);
  console.log(`ChimeraX will run on port ${CHIMERAX_PORT}`);
  console.log(`ChimeraX path: ${CHIMERAX_PATH}`);
  console.log(`Health check: http://localhost:${SERVER_PORT}/api/health`);
  console.log(`ChimeraX status: http://localhost:${SERVER_PORT}/api/chimerax/status`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await stopChimeraX();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await stopChimeraX();
  process.exit(0);
});