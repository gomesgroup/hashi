import express from 'express';
import promClient from 'prom-client';
import config from '../config';

// Configuration
const metricsEnabled = process.env.ENABLE_METRICS === 'true' || true;
const metricsPrefix = process.env.METRICS_PREFIX || 'hashi_';

// Prometheus client setup
const register = new promClient.Registry();

// Add default metrics (memory, CPU, etc)
if (metricsEnabled) {
  promClient.collectDefaultMetrics({
    prefix: metricsPrefix,
    register,
  });
}

// HTTP request metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: `${metricsPrefix}http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestCounter = new promClient.Counter({
  name: `${metricsPrefix}http_request_count_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ChimeraX session metrics
const chimeraxActiveSessions = new promClient.Gauge({
  name: `${metricsPrefix}chimerax_active_sessions`,
  help: 'Number of active ChimeraX sessions',
  registers: [register],
});

const chimeraxSessionCreationCounter = new promClient.Counter({
  name: `${metricsPrefix}chimerax_session_creation_total`,
  help: 'Total number of ChimeraX sessions created',
  registers: [register],
});

const chimeraxSessionTerminationCounter = new promClient.Counter({
  name: `${metricsPrefix}chimerax_session_termination_total`,
  help: 'Total number of ChimeraX sessions terminated',
  registers: [register],
});

const chimeraxCommandCounter = new promClient.Counter({
  name: `${metricsPrefix}chimerax_command_total`,
  help: 'Total number of ChimeraX commands executed',
  labelNames: ['status'],
  registers: [register],
});

// File operation metrics
const fileUploadCounter = new promClient.Counter({
  name: `${metricsPrefix}file_upload_count_total`,
  help: 'Total number of file uploads',
  labelNames: ['file_type', 'status'],
  registers: [register],
});

const fileDownloadCounter = new promClient.Counter({
  name: `${metricsPrefix}file_download_count_total`,
  help: 'Total number of file downloads',
  labelNames: ['file_type'],
  registers: [register],
});

const storageUsageGauge = new promClient.Gauge({
  name: `${metricsPrefix}storage_usage_bytes`,
  help: 'Storage usage in bytes',
  labelNames: ['user_id'],
  registers: [register],
});

// Render operation metrics
const renderCounter = new promClient.Counter({
  name: `${metricsPrefix}render_count_total`,
  help: 'Total number of rendering operations',
  labelNames: ['type', 'status'],
  registers: [register],
});

const renderDurationHistogram = new promClient.Histogram({
  name: `${metricsPrefix}render_duration_seconds`,
  help: 'Duration of rendering operations in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [register],
});

// Process resource metrics
const processMemoryGauge = new promClient.Gauge({
  name: `${metricsPrefix}process_memory_usage`,
  help: 'Process memory usage percentage',
  registers: [register],
});

const processCpuGauge = new promClient.Gauge({
  name: `${metricsPrefix}process_cpu_usage`,
  help: 'Process CPU usage percentage',
  registers: [register],
});

// Authentication metrics
const authenticationCounter = new promClient.Counter({
  name: `${metricsPrefix}authentication_attempts_total`,
  help: 'Authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

// Export metrics objects
export const metrics = {
  httpRequestDurationMicroseconds,
  httpRequestCounter,
  chimeraxActiveSessions,
  chimeraxSessionCreationCounter,
  chimeraxSessionTerminationCounter,
  chimeraxCommandCounter,
  fileUploadCounter,
  fileDownloadCounter,
  storageUsageGauge,
  renderCounter,
  renderDurationHistogram,
  processMemoryGauge,
  processCpuGauge,
  authenticationCounter,
};

// Middleware to track HTTP request metrics
export const httpMetricsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!metricsEnabled) {
    return next();
  }

  // Start timer
  const start = process.hrtime();
  
  // Get original end method
  const end = res.end;
  
  // Override end method to capture metrics
  res.end = function(chunk?: any, encoding?: string): express.Response {
    // Calculate duration
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    
    // Simplify route by removing path parameters
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    
    // Record metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    // Call original end
    return end.apply(res, arguments as any);
  };
  
  next();
};

// Resource usage update function (called periodically)
export const updateResourceMetrics = () => {
  if (!metricsEnabled) {
    return;
  }
  
  // Update memory usage
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.rss / (os.totalmem() * 0.8)) * 100; // 80% of total as max
  processMemoryGauge.set(memUsagePercent);
  
  // CPU usage requires more complex calculation and is typically done with external libraries
  // This is a placeholder for actual CPU usage calculation
  processCpuGauge.set(Math.random() * 20); // Placeholder value
};

// Metrics endpoint middleware
export const metricsEndpoint = (req: express.Request, res: express.Response) => {
  // Update resource metrics before serving
  updateResourceMetrics();
  
  // Serve metrics
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Start metrics server if configured to run separately
export const startMetricsServer = () => {
  if (!metricsEnabled) {
    return null;
  }
  
  const metricsPort = parseInt(process.env.METRICS_PORT || '9091', 10);
  const metricsPath = process.env.METRICS_PATH || '/metrics';
  
  const app = express();
  
  app.get(metricsPath, async (req, res) => {
    // Update resource metrics before serving
    updateResourceMetrics();
    
    // Serve metrics
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  
  const server = app.listen(metricsPort, () => {
    console.log(`Metrics server listening on port ${metricsPort}`);
  });
  
  return server;
};

export default {
  metrics,
  httpMetricsMiddleware,
  metricsEndpoint,
  startMetricsServer,
  register
};