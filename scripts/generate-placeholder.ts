/**
 * Script to generate placeholder images for failed ChimeraX renders
 * 
 * This creates a basic placeholder image that will be used when ChimeraX 
 * rendering fails due to missing OSMesa or other issues.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'src', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log(`Created assets directory at ${assetsDir}`);
}

// Default image dimensions
const width = 800;
const height = 600;

// Create canvas
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, width, height);

// Draw border
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 4;
ctx.strokeRect(10, 10, width - 20, height - 20);

// Draw diagonal cross lines to indicate unavailable
ctx.beginPath();
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 2;
ctx.moveTo(20, 20);
ctx.lineTo(width - 20, height - 20);
ctx.moveTo(width - 20, 20);
ctx.lineTo(20, height - 20);
ctx.stroke();

// Draw molecular graphic style icon in center
const centerX = width / 2;
const centerY = height / 2;
const radius = 100;

// Draw central atom
ctx.beginPath();
ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
ctx.fillStyle = '#cccccc';
ctx.fill();

// Draw connecting atom 1
ctx.beginPath();
ctx.arc(centerX + radius * 0.6, centerY - radius * 0.4, radius * 0.2, 0, 2 * Math.PI);
ctx.fill();

// Draw connecting atom 2  
ctx.beginPath();
ctx.arc(centerX - radius * 0.6, centerY - radius * 0.4, radius * 0.2, 0, 2 * Math.PI);
ctx.fill();

// Draw connecting atom 3
ctx.beginPath();
ctx.arc(centerX, centerY + radius * 0.6, radius * 0.2, 0, 2 * Math.PI);
ctx.fill();

// Draw bonds
ctx.lineWidth = 10;
ctx.strokeStyle = '#cccccc';

// Bond 1
ctx.beginPath();
ctx.moveTo(centerX + radius * 0.1, centerY);
ctx.lineTo(centerX + radius * 0.5, centerY - radius * 0.3);
ctx.stroke();

// Bond 2
ctx.beginPath();
ctx.moveTo(centerX - radius * 0.1, centerY);
ctx.lineTo(centerX - radius * 0.5, centerY - radius * 0.3);
ctx.stroke();

// Bond 3
ctx.beginPath();
ctx.moveTo(centerX, centerY + radius * 0.1);
ctx.lineTo(centerX, centerY + radius * 0.5);
ctx.stroke();

// Draw text
ctx.fillStyle = '#666666';
ctx.font = 'bold 28px Arial';
ctx.textAlign = 'center';
ctx.fillText('ChimeraX Rendering Unavailable', centerX, height - 120);

ctx.font = '18px Arial';
ctx.fillText('OSMesa libraries required for offscreen rendering', centerX, height - 90);
ctx.fillText('are missing or not properly configured.', centerX, height - 65);

// Save images
const outputPathPng = path.join(assetsDir, 'placeholder.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPathPng, buffer);

console.log(`Generated placeholder PNG image at ${outputPathPng}`);

// Also save as JPEG for JPEG format requests
const outputPathJpg = path.join(assetsDir, 'placeholder.jpg');
const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
fs.writeFileSync(outputPathJpg, jpegBuffer);

console.log(`Generated placeholder JPEG image at ${outputPathJpg}`);

// Print instructions
console.log('\nYou may need to install the canvas dependencies if not already done:');
console.log('  - On Ubuntu/Debian: sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev');
console.log('  - On macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg');
console.log('  - On Windows: see https://github.com/Automattic/node-canvas#compiling');