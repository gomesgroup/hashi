import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Import our configuration
import config from './k6.config.js';
export { config as options };

// Custom metrics
const sessionCreationDuration = new Trend('session_creation_duration');
const commandExecutionDuration = new Trend('command_execution_duration');
const activeSessionsGauge = new Counter('active_sessions');
const sessionErrors = new Rate('session_errors');

// Test data
const BASE_URL = 'http://localhost:3000/api/v1';
const commands = [
  'open 1a3n',
  'view',
  'color orange',
  'style stick',
  'surface',
  'clip front',
  'turn y 20',
  'style ball',
  'transparency 30',
  'select :a',
];

// Main test function
export default function() {
  // Create a new session
  const startTime = new Date();
  
  const createSessionResponse = http.post(`${BASE_URL}/sessions`, JSON.stringify({
    name: `LoadTest-${randomString(8)}`,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const sessionCreationTime = new Date() - startTime;
  sessionCreationDuration.add(sessionCreationTime);
  
  // Check if session was created successfully
  const success = check(createSessionResponse, {
    'session created successfully': (r) => r.status === 201,
    'session ID returned': (r) => r.json('sessionId') !== undefined,
  });
  
  if (!success) {
    sessionErrors.add(1);
    console.error(`Failed to create session: ${createSessionResponse.status} ${createSessionResponse.body}`);
    return;
  }
  
  // Extract session ID
  const sessionId = createSessionResponse.json('sessionId');
  activeSessionsGauge.add(1);
  
  try {
    // Pick 3 random commands to execute
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * commands.length);
      const command = commands[randomIndex];
      
      const cmdStartTime = new Date();
      
      // Execute command
      const commandResponse = http.post(`${BASE_URL}/commands`, JSON.stringify({
        sessionId: sessionId,
        command: command,
        options: {
          timeout: 5000,
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const commandTime = new Date() - cmdStartTime;
      commandExecutionDuration.add(commandTime);
      
      check(commandResponse, {
        'command executed successfully': (r) => r.status === 200,
      });
      
      // Wait between commands
      sleep(1);
    }
    
    // Get command history
    const historyResponse = http.get(`${BASE_URL}/commands/history/${sessionId}`);
    
    check(historyResponse, {
      'history retrieved successfully': (r) => r.status === 200,
      'history contains commands': (r) => r.json('commands').length > 0,
    });
    
    // End session
    const endSessionResponse = http.delete(`${BASE_URL}/sessions/${sessionId}`);
    
    check(endSessionResponse, {
      'session ended successfully': (r) => r.status === 200,
    });
    
    activeSessionsGauge.add(-1); // Decrement active sessions
  } catch (e) {
    console.error(`Error during test: ${e}`);
    sessionErrors.add(1);
    
    // Try to close the session regardless of errors
    http.delete(`${BASE_URL}/sessions/${sessionId}`);
    activeSessionsGauge.add(-1);
  }
  
  // Random wait between 1-3 seconds before next iteration
  sleep(Math.random() * 2 + 1);
}