# Hashi Monitoring Guide

This guide provides detailed information on setting up and using the monitoring infrastructure for Hashi.

## Overview

Hashi includes a comprehensive monitoring stack with the following components:

1. **Prometheus**: For metrics collection and storage
2. **Grafana**: For metrics visualization and alerting
3. **ELK Stack**: For log aggregation and analysis
   - **Elasticsearch**: Log storage and indexing
   - **Logstash**: Log processing and enrichment
   - **Kibana**: Log visualization and exploration

## Enabling Monitoring

The monitoring stack is included in the Docker Compose configuration but is disabled by default to conserve resources.

### Starting the Monitoring Stack

To enable the monitoring stack:

```bash
# Prometheus and Grafana only
docker-compose --profile monitoring up -d

# ELK stack only
docker-compose --profile logging up -d

# Full monitoring stack
docker-compose --profile monitoring --profile logging up -d
```

### Accessing Monitoring Dashboards

Once the monitoring stack is running, you can access the following dashboards:

1. **Prometheus**: `http://your-server:9090`
2. **Grafana**: `http://your-server:3002` (default credentials: admin/admin)
3. **Kibana**: `http://your-server:5601`

## Prometheus Configuration

Prometheus is configured to scrape metrics from the following targets:

1. **Hashi Application**: Core application metrics
2. **Node Exporter**: Host system metrics (optional)
3. **Postgres Exporter**: Database metrics (optional)
4. **cAdvisor**: Container metrics

### Available Metrics

Hashi exposes the following custom metrics:

#### HTTP Metrics
- `hashi_http_request_count_total` - Total number of HTTP requests
- `hashi_http_request_duration_seconds` - Duration of HTTP requests

#### ChimeraX Metrics
- `hashi_chimerax_active_sessions` - Number of active ChimeraX sessions
- `hashi_chimerax_session_creation_total` - Total number of sessions created
- `hashi_chimerax_session_termination_total` - Total number of sessions terminated
- `hashi_chimerax_command_total` - Total number of ChimeraX commands executed

#### File Operation Metrics
- `hashi_file_upload_count_total` - Total number of file uploads
- `hashi_file_download_count_total` - Total number of file downloads
- `hashi_storage_usage_bytes` - Storage usage in bytes

#### Rendering Metrics
- `hashi_render_count_total` - Total number of rendering operations
- `hashi_render_duration_seconds` - Duration of rendering operations

#### System Metrics
- `hashi_process_cpu_usage` - Process CPU usage percentage
- `hashi_process_memory_usage` - Process memory usage percentage

#### Authentication Metrics
- `hashi_authentication_attempts_total` - Authentication attempts

### Configuring Prometheus

The Prometheus configuration is located at `/monitoring/prometheus/prometheus.yml`. You can modify this file to:

1. Add or remove scrape targets
2. Adjust scrape intervals
3. Configure alerting rules
4. Set up remote storage

## Grafana Configuration

Grafana is pre-configured with the following:

1. **Prometheus Data Source**: Connected to the Prometheus instance
2. **Default Dashboards**:
   - System Overview Dashboard
   - Hashi Application Dashboard
   - ChimeraX Sessions Dashboard
   - API Performance Dashboard

### Configuring Alerting

To configure alerts in Grafana:

1. Navigate to the Alerting section in Grafana
2. Create new alert rules based on metrics
3. Configure notification channels (email, Slack, PagerDuty, etc.)

Example alert rules:

1. **High CPU Usage**: Alert when CPU usage exceeds 80% for 5 minutes
2. **High Error Rate**: Alert when error rate exceeds 5% for 5 minutes
3. **ChimeraX Session Limit**: Alert when approaching maximum concurrent sessions

## ELK Stack Configuration

The ELK stack is configured to collect, process, and visualize logs from the Hashi application.

### Logstash Configuration

Logstash is configured to:

1. Collect logs from the application log directory
2. Parse JSON-formatted logs
3. Extract fields like correlation IDs, status codes, and error messages
4. Enrich logs with additional metadata
5. Forward logs to Elasticsearch

The Logstash pipeline configuration is located at `/monitoring/logstash/pipeline/hashi-pipeline.conf`.

### Kibana Configuration

Kibana includes:

1. **Index patterns** for Hashi logs
2. **Pre-built dashboards** for monitoring application behavior
3. **Saved searches** for common debugging scenarios

## Advanced Monitoring Configuration

### Adding Node Exporter

To monitor the host system in more detail, add Node Exporter:

```yaml
# Add to docker-compose.yml
node-exporter:
  image: prom/node-exporter:latest
  container_name: hashi-node-exporter
  restart: unless-stopped
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - '--path.procfs=/host/proc'
    - '--path.sysfs=/host/sys'
    - '--path.rootfs=/rootfs'
    - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
  ports:
    - "9100:9100"
  networks:
    - hashi-network
  profiles:
    - monitoring
```

### Adding Postgres Exporter

To monitor PostgreSQL in detail:

```yaml
# Add to docker-compose.yml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter:latest
  container_name: hashi-postgres-exporter
  restart: unless-stopped
  environment:
    DATA_SOURCE_NAME: "postgresql://${DB_USERNAME:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_DATABASE:-hashi}?sslmode=disable"
  ports:
    - "9187:9187"
  networks:
    - hashi-network
  depends_on:
    - db
  profiles:
    - monitoring
```

## Performance Monitoring

### Key Performance Indicators

Monitor these key metrics to ensure Hashi is performing well:

1. **Response Time**: Should be under 200ms for API endpoints
2. **Error Rate**: Should be under 1% of total requests
3. **ChimeraX Session Creation Time**: Should be under 5 seconds
4. **Memory Usage**: Should stay below 70% of allocated memory
5. **CPU Usage**: Should stay below 70% of allocated CPU
6. **Database Query Time**: Should be under 100ms for most queries

### Performance Tuning

If performance issues are detected:

1. **Node.js Configuration**: Adjust memory limits and garbage collection
2. **ChimeraX Processes**: Adjust maximum concurrent instances
3. **Database Tuning**: Optimize PostgreSQL configuration
4. **Caching**: Implement Redis for session and data caching

## Log Analysis

### Structured Logging

Hashi uses structured JSON logging with consistent fields:

```json
{
  "timestamp": "2023-11-01T12:34:56.789Z",
  "level": "info",
  "message": "Request processed successfully",
  "correlationId": "1234-5678-9012",
  "module": "sessionController",
  "context": {
    "sessionId": "abcd-efgh-ijkl",
    "userId": "user-1234",
    "method": "GET",
    "path": "/api/sessions/abcd-efgh-ijkl"
  },
  "duration": 123
}
```

### Common Log Queries

To diagnose issues in Kibana:

1. **Error Investigation**:
   ```
   level:error
   ```

2. **Slow Requests**:
   ```
   duration:>1000
   ```

3. **User Activity**:
   ```
   context.userId:"user-1234"
   ```

4. **Session Tracking**:
   ```
   context.sessionId:"abcd-efgh-ijkl"
   ```

5. **Correlation Tracking**:
   ```
   correlationId:"1234-5678-9012"
   ```

## Alerting Strategies

### Critical Alerts

These alerts require immediate attention:

1. **Service Down**: Application or database is unavailable
2. **High Error Rate**: Error rate exceeds 5% for 3 minutes
3. **Out of Memory**: Memory usage exceeds 90%
4. **Database Connection Failures**: Unable to connect to database

### Warning Alerts

These alerts should be investigated soon:

1. **Elevated Error Rate**: Error rate exceeds 2% for 5 minutes
2. **High CPU Usage**: CPU usage exceeds 80% for 10 minutes
3. **Approaching Session Limit**: More than 80% of max sessions in use
4. **Slow Responses**: 90th percentile response time exceeds 500ms

### Alert Notifications

Configure alert notifications through Grafana using:

1. **Email**: For non-urgent notifications
2. **Slack/Microsoft Teams**: For team visibility
3. **PagerDuty/OpsGenie**: For critical alerts requiring immediate action
4. **SMS**: For critical, time-sensitive alerts

## Troubleshooting with Monitoring

### Scenario: High Response Times

1. Check Grafana dashboards for:
   - CPU and memory usage
   - Database query times
   - ChimeraX process metrics
   
2. Check Kibana for:
   - Slow request logs
   - Database connection issues
   - File system operations

3. Potential solutions:
   - Scale up resources
   - Optimize database queries
   - Implement caching

### Scenario: Increasing Error Rate

1. Check Grafana dashboards for:
   - HTTP status code distribution
   - Error rates by endpoint
   - System resource usage
   
2. Check Kibana for:
   - Specific error messages
   - Stack traces
   - Correlation between errors

3. Potential solutions:
   - Fix bugs in identified endpoints
   - Restart services if resource-related
   - Scale resources if overloaded

## Further Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)