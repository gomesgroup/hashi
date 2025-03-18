
const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

const CHIMERAX_PATH = '/usr/local/bin/chimerax';
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
    chimeraxProcess.stdout.on('data', data => console.log(`ChimeraX: ${data}`));
    chimeraxProcess.stderr.on('data', data => console.error(`ChimeraX error: ${data}`));
    chimeraxProcess.on('close', code => {
      console.log(`ChimeraX process exited with code ${code}`);
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

app.listen(4567, () => {
  console.log(`Test server running at http://localhost:4567`);
});
