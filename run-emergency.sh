#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Hashi - Emergency Fallback Viewer${NC}"
echo "========================================"

# Step 1: Kill existing processes
echo -e "Stopping existing processes..."

# Find and kill existing Node.js processes
NODE_PIDS=$(ps aux | grep "node \(dev-server.js\|emergency-dev.js\)" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PIDS" ]; then
    echo "Killing server processes: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null
else
    echo "No server processes found."
fi

# Wait a moment to ensure processes are terminated
sleep 2

# Create a standalone HTML file that works without any build step
echo -e "Creating standalone emergency fallback HTML..."
cat > standalone-emergency.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hashi - Standalone Emergency Fallback</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f8;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0;
        }
        .error-box {
            background-color: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            padding: 8px 16px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: #2980b9;
        }
        .viewer {
            width: 100%;
            height: 600px;
            background-color: white;
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Hashi - Standalone Emergency Fallback</h1>
        </header>
        
        <div class="error-box">
            <h3>ChimeraX Integration Unavailable</h3>
            <p>
                The ChimeraX integration is currently experiencing OpenGL compatibility issues on this system.
                This HTML file provides a direct RCSB Molecular Viewer fallback that requires no server.
            </p>
        </div>
        
        <div class="controls">
            <input type="text" id="pdbInput" value="1ubq" placeholder="Enter PDB ID" />
            <button onclick="loadStructure()">Load Structure</button>
            <button onclick="loadPdb('1ubq')">1UBQ</button>
            <button onclick="loadPdb('2vaa')">2VAA</button>
            <button onclick="loadPdb('3j3q')">3J3Q</button>
        </div>
        
        <div class="viewer">
            <iframe id="viewer" src="https://www.rcsb.org/3d-view/1ubq?preset=default" title="RCSB Molecular Viewer"></iframe>
        </div>
    </div>
    
    <script>
        function loadStructure() {
            const pdbId = document.getElementById('pdbInput').value.trim();
            if (pdbId) {
                document.getElementById('viewer').src = `https://www.rcsb.org/3d-view/${pdbId}?preset=default`;
            }
        }
        
        function loadPdb(pdbId) {
            document.getElementById('pdbInput').value = pdbId;
            document.getElementById('viewer').src = `https://www.rcsb.org/3d-view/${pdbId}?preset=default`;
        }
    </script>
</body>
</html>
EOL

echo -e "Standalone emergency HTML created at: standalone-emergency.html"

# Run the emergency server (commented out for now)
# echo -e "Starting emergency server..."
# node emergency-dev.js

# Print links
echo -e "${GREEN}Available Options:${NC}"
echo -e "  1. Direct HTML (NO SERVER NEEDED): file://$(pwd)/standalone-emergency.html"
echo -e "  2. RCSB Direct Link: https://www.rcsb.org/3d-view/1ubq"
# echo -e "  3. Emergency server (requires build): http://localhost:3001"