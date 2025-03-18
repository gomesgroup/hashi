/**
 * Fallback server for Hashi with RCSB viewer integration
 * Provides a simple alternative when ChimeraX has OpenGL issues
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// Configuration
const PORT = 9876;
const WS_PORT = 9877;
const STATIC_DIR = path.join(__dirname, 'public');

// Set up WebSocket server for notifications
const wsServer = http.createServer();
const wss = new WebSocket.Server({ server: wsServer });

// Set up Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(STATIC_DIR));

// Track connected clients
let activeClients = [];

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  // Add to active clients
  activeClients.push(ws);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    message: 'Using RCSB fallback viewer due to ChimeraX OpenGL issues',
    usingFallback: true
  }));
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    activeClients = activeClients.filter(client => client !== ws);
  });
});

// Broadcast to all WS clients
function broadcastEvent(eventData) {
  const message = JSON.stringify(eventData);
  activeClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hashi fallback server running',
    timestamp: new Date().toISOString(),
    usingFallback: true
  });
});

// ChimeraX API endpoint stubs that return fallback info
app.get('/api/chimerax/status', (req, res) => {
  res.json({
    status: 'success',
    running: false,
    message: 'ChimeraX is unavailable due to OpenGL compatibility issues',
    usingFallback: true,
    fallbackUrl: '/fallback-viewer.html'
  });
});

app.post('/api/chimerax/start', (req, res) => {
  res.json({
    status: 'error',
    message: 'ChimeraX cannot start due to OpenGL compatibility issues. Using RCSB fallback viewer instead.',
    usingFallback: true,
    fallbackUrl: '/fallback-viewer.html'
  });
});

app.post('/api/chimerax/command', (req, res) => {
  // Check if this is a structure load command
  const { command } = req.body;
  if (command && command.startsWith('open ')) {
    const pdbMatch = command.match(/open\s+(\S+)/);
    if (pdbMatch && pdbMatch[1]) {
      const pdbId = pdbMatch[1].replace(/[^a-zA-Z0-9]/g, '');
      return res.json({
        status: 'success',
        message: 'Redirecting to RCSB viewer',
        command,
        pdbId,
        fallbackUrl: `/fallback-viewer.html?pdb=${pdbId}`
      });
    }
  }
  
  res.json({
    status: 'error',
    message: 'ChimeraX commands are unavailable. Using RCSB fallback viewer instead.',
    command
  });
});

// Main fallback route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'fallback-viewer.html'));
});

// Create a copy in the public directory
const fs = require('fs');
if (!fs.existsSync(STATIC_DIR)) {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
}
fs.copyFileSync(
  path.join(__dirname, 'fallback-viewer.html'), 
  path.join(STATIC_DIR, 'index.html')
);

// Start the express server
app.listen(PORT, () => {
  console.log(`Fallback Server running at http://localhost:${PORT}`);
  console.log('Note: ChimeraX integration is unavailable due to OpenGL compatibility issues');
  console.log('Using RCSB Molecular Viewer as fallback');
});

// Start the WebSocket server
wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.clients.forEach(client => {
    client.terminate();
  });
  process.exit(0);
});