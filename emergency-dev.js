const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Create an express app
const app = express();
const PORT = 3001;

// Run a build specifically for the fallback component
console.log('Building emergency fallback...');
exec('npx vite build --config vite.emergency.config.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  console.log(`Build stdout: ${stdout}`);
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// For all other routes, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║  EMERGENCY FALLBACK SERVER RUNNING               ║
  ╠══════════════════════════════════════════════════╣
  ║                                                  ║
  ║  Access the fallback viewer at:                  ║
  ║  http://localhost:${PORT}                          ║
  ║                                                  ║
  ║  This server provides a simple RCSB fallback     ║
  ║  when ChimeraX isn't working due to OpenGL       ║
  ║  compatibility issues.                           ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});