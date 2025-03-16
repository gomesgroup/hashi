/**
 * Docker container healthcheck script
 * This file is used by the Docker container to verify the application is healthy
 */
const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  protocol: process.env.HEALTHCHECK_PROTOCOL || 'http',
  host: process.env.HEALTHCHECK_HOST || 'localhost',
  port: process.env.HEALTHCHECK_PORT || process.env.PORT || 3000,
  path: process.env.HEALTHCHECK_PATH || '/api/health',
  timeout: parseInt(process.env.HEALTHCHECK_TIMEOUT || '5000', 10),
};

// Choose HTTP or HTTPS client
const client = CONFIG.protocol === 'https' ? https : http;

// Create options for request
const options = {
  hostname: CONFIG.host,
  port: CONFIG.port,
  path: CONFIG.path,
  method: 'GET',
  timeout: CONFIG.timeout,
  headers: {
    'User-Agent': 'Docker-Healthcheck/1.0',
  },
};

// Execute health check request
const healthCheckRequest = client.request(options, (res) => {
  console.log(`Healthcheck status code: ${res.statusCode}`);
  
  // Collect response data
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Process response when complete
  res.on('end', () => {
    try {
      // Parse response as JSON
      const responseData = JSON.parse(data);
      
      // Check for 2xx status code and "ok" status in response
      if (res.statusCode >= 200 && res.statusCode < 300 && responseData.status === 'ok') {
        console.log('Healthcheck passed');
        process.exit(0); // Healthy
      } else {
        console.error(`Healthcheck failed: Status code ${res.statusCode}, response: ${data}`);
        process.exit(1); // Unhealthy
      }
    } catch (error) {
      console.error(`Error parsing healthcheck response: ${error.message}`);
      process.exit(1); // Unhealthy
    }
  });
});

// Handle request errors
healthCheckRequest.on('error', (error) => {
  console.error(`Healthcheck request failed: ${error.message}`);
  process.exit(1); // Unhealthy
});

// Handle request timeout
healthCheckRequest.on('timeout', () => {
  console.error(`Healthcheck timed out after ${CONFIG.timeout}ms`);
  healthCheckRequest.destroy();
  process.exit(1); // Unhealthy
});

// Send the request
healthCheckRequest.end();