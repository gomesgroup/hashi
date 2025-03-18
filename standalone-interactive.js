/**
 * Enhanced standalone server for Hashi with ChimeraX integration
 * Provides enhanced support for interactive ChimeraX UI features
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// Configuration
const PORT = 9876;
const WS_PORT = 9877;
const CHIMERAX_PATH = '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';
const STATIC_DIR = path.join(__dirname, 'public');
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// Ensure directories exist
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

if (!fs.existsSync(STATIC_DIR)) {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
}

// Check ChimeraX installation
console.log(`Checking ChimeraX at: ${CHIMERAX_PATH}`);
if (fs.existsSync(CHIMERAX_PATH)) {
  console.log('✅ ChimeraX found!');
} else {
  console.error('❌ ChimeraX not found at the specified path!');
  process.exit(1);
}

// Check OSMesa
const OSMESA_LIBRARY = '/opt/homebrew/lib/libOSMesa.dylib';
console.log(`Checking OSMesa at: ${OSMESA_LIBRARY}`);
if (fs.existsSync(OSMESA_LIBRARY)) {
  console.log('✅ OSMesa found!');
} else {
  console.warn('⚠️ OSMesa not found. ChimeraX may not render correctly in headless mode.');
}

// Set up WebSocket server for live updates
const wsServer = http.createServer();
const wss = new WebSocket.Server({ server: wsServer });

// Set up Express app
const app = express();

// Enable CORS for web clients - allow all origins in development
app.use(cors({
  origin: '*', // Allow all origins for debugging purposes
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/api/snapshots', express.static(SNAPSHOTS_DIR));
app.use(express.static(STATIC_DIR));

// State
let chimeraxProcess = null;
let activeClients = [];
let commandQueue = [];
let isProcessingQueue = false;
let commandCounter = 0;
let currentStructureId = null;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  // Add to active clients
  activeClients.push(ws);
  
  // Send initial state
  ws.send(JSON.stringify({
    type: 'status',
    chimeraxRunning: chimeraxProcess !== null,
    pid: chimeraxProcess?.pid || null,
    structureLoaded: currentStructureId !== null,
    structureId: currentStructureId
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Process client command
      if (data.type === 'command') {
        executeChimeraXCommand(data.command, (result) => {
          ws.send(JSON.stringify({
            type: 'commandResult',
            command: data.command,
            result
          }));
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    activeClients = activeClients.filter(client => client !== ws);
  });
});

// Broadcast to all active WebSocket clients
function broadcastEvent(eventData) {
  const message = JSON.stringify(eventData);
  activeClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hashi interactive test server running',
    timestamp: new Date().toISOString(),
    features: ['OSMesa', 'WebSocket', 'CommandQueue', 'InteractiveUI']
  });
});

app.get('/api/chimerax/status', (req, res) => {
  const isRunning = chimeraxProcess !== null;
  res.json({
    status: 'success',
    chimeraxPath: CHIMERAX_PATH,
    running: isRunning,
    pid: isRunning ? chimeraxProcess.pid : null,
    currentStructure: currentStructureId,
    osmesaAvailable: fs.existsSync(OSMESA_LIBRARY)
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
    // Start ChimeraX process with OSMesa
    console.log('Starting ChimeraX process with OSMesa...');
    
    // Create enhanced environment for macOS compatibility - use the environment variables from run-interactive.sh
    const enhancedEnv = process.env;
    
    console.log('Using enhanced environment variables for macOS compatibility');
    
    chimeraxProcess = spawn(CHIMERAX_PATH, ['--nogui', '--offscreen'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: enhancedEnv
    });
    
    // Handle process output
    chimeraxProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`ChimeraX output: ${output}`);
      
      // Broadcast output to WebSocket clients
      broadcastEvent({
        type: 'consoleOutput',
        output,
        source: 'stdout'
      });
    });
    
    chimeraxProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.error(`ChimeraX error: ${output}`);
      
      // Broadcast errors to WebSocket clients
      broadcastEvent({
        type: 'consoleOutput',
        output,
        source: 'stderr'
      });
    });
    
    // Handle process exit
    chimeraxProcess.on('close', (code) => {
      console.log(`ChimeraX process exited with code ${code}`);
      chimeraxProcess = null;
      currentStructureId = null;
      
      // Notify clients
      broadcastEvent({
        type: 'processTerminated',
        exitCode: code
      });
    });
    
    // Notify clients of process start
    broadcastEvent({
      type: 'processStarted',
      pid: chimeraxProcess.pid
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
      message: 'ChimeraX is not running'
    });
  }
  
  // Process structure loading commands to track current structure
  if (command.startsWith('open ')) {
    const match = command.match(/open\s+(\S+)/);
    if (match && match[1]) {
      currentStructureId = match[1].replace(/[^a-zA-Z0-9]/g, '');
      
      // Notify clients
      broadcastEvent({
        type: 'structureLoaded',
        structureId: currentStructureId
      });
    }
  } else if (command === 'close session') {
    currentStructureId = null;
    
    // Notify clients
    broadcastEvent({
      type: 'structureClosed'
    });
  }
  
  // Add command to queue with a unique ID
  const commandId = commandCounter++;
  
  // Execute the command
  executeChimeraXCommand(command, (result) => {
    // Notify WebSocket clients about command execution
    broadcastEvent({
      type: 'commandExecuted',
      command,
      commandId,
      result
    });
  });
  
  res.json({
    status: 'success',
    message: 'Command queued for execution',
    command,
    commandId
  });
});

app.post('/api/chimerax/snapshot', (req, res) => {
  const { width = 800, height = 600, transparent = false, background = '#000000' } = req.body;
  
  if (!chimeraxProcess) {
    return res.status(400).json({
      status: 'error',
      message: 'ChimeraX is not running'
    });
  }
  
  try {
    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${timestamp}.png`;
    const filePath = path.join(SNAPSHOTS_DIR, filename);
    
    // Set background color if not transparent
    if (!transparent && background) {
      executeChimeraXCommand(`set bg_color ${background}`, () => {
        // Take the snapshot
        takeSnapshot();
      });
    } else {
      takeSnapshot();
    }
    
    function takeSnapshot() {
      // Create ChimeraX save command
      const transparencyFlag = transparent ? 'true' : 'false';
      const saveCommand = `save "${filePath}" width ${width} height ${height} supersample 3 transparent ${transparencyFlag}`;
      
      // Execute the command
      executeChimeraXCommand(saveCommand, () => {
        // Wait for the file to be created and verify
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            // Return the image URL
            const imageUrl = `/api/snapshots/${filename}`;
            res.json({
              status: 'success',
              message: 'Snapshot created',
              imageUrl,
              width,
              height,
              transparent
            });
            
            // Notify WebSocket clients
            broadcastEvent({
              type: 'snapshotCreated',
              imageUrl,
              width,
              height
            });
          } else {
            res.status(500).json({
              status: 'error',
              message: 'Failed to create snapshot (file not found)'
            });
          }
        }, 1000);
      });
    }
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
    // Send exit command
    executeChimeraXCommand('exit', () => {
      // Also kill the process to ensure it stops
      setTimeout(() => {
        if (chimeraxProcess) {
          chimeraxProcess.kill();
        }
      }, 500);
    });
    
    res.json({
      status: 'success',
      message: 'ChimeraX stop command sent'
    });
  } catch (error) {
    console.error('Error stopping ChimeraX:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to stop ChimeraX: ${error.message}`
    });
  }
});

// Enhanced API endpoints for UI interactions
app.post('/api/chimerax/view', (req, res) => {
  const { preset } = req.body;
  
  if (!chimeraxProcess) {
    return res.status(400).json({
      status: 'error',
      message: 'ChimeraX is not running'
    });
  }
  
  if (!currentStructureId) {
    return res.status(400).json({
      status: 'error',
      message: 'No structure is loaded'
    });
  }
  
  // Apply the requested view preset
  let command;
  switch (preset) {
    case 'cartoon':
      command = 'cartoon';
      break;
    case 'sphere':
      command = 'style sphere';
      break;
    case 'stick':
      command = 'style stick';
      break;
    case 'ball+stick':
      command = 'style ball+stick';
      break;
    case 'ribbon':
      command = 'ribbon';
      break;
    case 'surface':
      command = 'surface';
      break;
    default:
      command = 'cartoon';
  }
  
  executeChimeraXCommand(command, (result) => {
    res.json({
      status: 'success',
      message: `Applied view preset: ${preset}`,
      command,
      result
    });
    
    // Take a snapshot after changing the view
    executeChimeraXCommand('wait 1', () => {
      // The snapshot will be broadcast to clients
    });
  });
});

// Helper function for command execution with queue
function executeChimeraXCommand(command, callback) {
  if (!chimeraxProcess) {
    if (callback) callback({ error: 'ChimeraX is not running' });
    return;
  }
  
  // Add the command to the queue
  commandQueue.push({ command, callback });
  console.log(`Queuing ChimeraX command: ${command}`);
  
  // Process the queue if not already processing
  if (!isProcessingQueue) {
    processCommandQueue();
  }
}

// Process commands in the queue one at a time
function processCommandQueue() {
  if (commandQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const { command, callback } = commandQueue.shift();
  
  console.log(`Executing ChimeraX command: ${command}`);
  
  try {
    // Send the command to ChimeraX
    chimeraxProcess.stdin.write(command + '\n');
    
    // Simple approach: Wait a bit and then process the next command
    // In a more sophisticated implementation, you would wait for command completion
    setTimeout(() => {
      if (callback) callback({ success: true, command });
      processCommandQueue(); // Process the next command
    }, 500);
  } catch (error) {
    console.error('Error executing command:', error);
    if (callback) callback({ error: error.message });
    processCommandQueue(); // Continue processing the queue
  }
}

// Serve test-interactive.html as the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-interactive.html'));
});

// Start the express server
app.listen(PORT, () => {
  console.log(`Interactive Test Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET  /api/health`);
  console.log(`- GET  /api/chimerax/status`);
  console.log(`- POST /api/chimerax/start`);
  console.log(`- POST /api/chimerax/command (requires {"command": "..."} in body)`);
  console.log(`- POST /api/chimerax/snapshot (optional: {"width": 800, "height": 600})`);
  console.log(`- POST /api/chimerax/view (requires {"preset": "cartoon|sphere|stick|ball+stick|ribbon|surface"} in body)`);
  console.log(`- POST /api/chimerax/stop`);
});

// Start the WebSocket server
wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (chimeraxProcess) {
    console.log('Stopping ChimeraX process...');
    chimeraxProcess.kill();
  }
  wss.clients.forEach(client => {
    client.terminate();
  });
  process.exit(0);
});