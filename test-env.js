// Small script to create a test .env file with correct ChimeraX path
const fs = require('fs');
const path = require('path');

const testEnvPath = path.join(__dirname, '.env.test');
const chimeraxPath = '/Applications/ChimeraX.app/Contents/MacOS/ChimeraX';

const envContent = `
# Test Environment Configuration
PORT=4567
NODE_ENV=development

# ChimeraX Configuration
CHIMERAX_PATH=${chimeraxPath}
CHIMERAX_BASE_PORT=6100
MAX_CHIMERAX_INSTANCES=1

# JWT Secret for Auth Testing
JWT_SECRET=test_secret_key
`;

fs.writeFileSync(testEnvPath, envContent);
console.log(`Created test environment file at ${testEnvPath}`);
console.log(`ChimeraX path set to: ${chimeraxPath}`);