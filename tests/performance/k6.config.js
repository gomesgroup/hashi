// K6 performance testing configuration
export default {
  // Define thresholds that represent our SLA
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],
  },
  // Basic load test - run for 30 seconds
  scenarios: {
    loadTest: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },   // Ramp up to 10 users
        { duration: '20s', target: 20 },   // Ramp up to 20 users
        { duration: '1m', target: 20 },    // Stay at 20 users for 1 minute
        { duration: '10s', target: 0 },    // Ramp down to 0 users
      ],
    },
  },
  // Output to create on completion
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};