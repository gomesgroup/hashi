// Simple script to test the ChimeraX integration endpoints
const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:4000';

// Helper function to make HTTP requests
async function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: data ? { 'Content-Type': 'application/json' } : {}
    };
    
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`\n${method} ${url} - Status: ${res.statusCode}`);
          console.log(JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('TESTING CHIMERAX INTEGRATION ENDPOINTS\n');
  
  try {
    // Test 1: Check ChimeraX status
    console.log('Test 1: Checking ChimeraX status...');
    await request(`${BASE_URL}/api/chimerax/status`);
    
    // Test 2: Start ChimeraX
    console.log('\nTest 2: Starting ChimeraX...');
    await request(`${BASE_URL}/api/chimerax/start`, 'POST');
    
    // Test 3: Check status again
    console.log('\nTest 3: Checking ChimeraX status after starting...');
    await request(`${BASE_URL}/api/chimerax/status`);
    
    // Test 4: Send command to ChimeraX
    console.log('\nTest 4: Sending command to ChimeraX...');
    await request(`${BASE_URL}/api/chimerax/command`, 'POST', { command: 'open 1abc' });
    
    // Test 5: Stop ChimeraX
    console.log('\nTest 5: Stopping ChimeraX...');
    await request(`${BASE_URL}/api/chimerax/stop`, 'POST');
    
    console.log('\nAll tests completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();