# Hashi Docker Setup Guide

This document provides detailed instructions for setting up and using the Docker-based environment for Hashi - ChimeraX Web Integration, with specific focus on OSMesa rendering support.

## Overview

The Hashi project uses Docker to ensure consistent environments across development and production. The containerization approach resolves platform-specific issues, particularly for ChimeraX rendering with OSMesa.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned locally

### Starting the Application

1. Build and start all services:

```bash
docker-compose up --build
```

2. For development environment:

```bash
docker-compose --profile dev up --build
```

3. Access the application at http://localhost:3000

## Environment Configuration

### .env File

Create a `.env` file in the project root with the following variables:

```
# Server Configuration
PORT=3000
WEBSOCKET_PORT=3001
NODE_ENV=development

# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=postgres 
DB_DATABASE=hashi
DB_PORT=5432

# ChimeraX Configuration
CHIMERAX_PATH=/usr/bin/chimerax
OSMESA_AVAILABLE=true

# Monitoring Configuration (optional)
GRAFANA_ADMIN_PASSWORD=admin
```

### Environment Variables

- `CHIMERAX_PATH`: Path to ChimeraX executable
- `OSMESA_AVAILABLE`: Set to `true` if OSMesa is available (determined automatically during startup)
- `DISPLAY`: Virtual display used by Xvfb (default: `:99`)
- `LIBGL_ALWAYS_SOFTWARE`: Forces software-based OpenGL rendering
- `MESA_GL_VERSION_OVERRIDE`: Sets the OpenGL version to use

## Container Architecture

The project uses a multi-container architecture:

1. **app**: Main application container with Node.js and ChimeraX
2. **db**: PostgreSQL database
3. **dev-tools**: Development tools container (dev profile only)
4. **monitoring**: Prometheus and Grafana for monitoring (monitoring profile only)
5. **logging**: Elasticsearch, Logstash, and Kibana for logging (logging profile only)

## Troubleshooting OSMesa Issues

If you encounter rendering issues ("ChimeraX rendering is unavailable"), follow these steps:

### 1. Check OSMesa Status

OSMesa status is checked during container startup. Look for these messages in the logs:

```
SUCCESS: ChimeraX offscreen rendering (OSMesa) is working correctly
```

or

```
WARNING: ChimeraX offscreen rendering (OSMesa) is not working
```

### 2. Verify OSMesa Installation

Inside the container:

```bash
docker exec -it hashi-app bash
```

Then run:

```bash
ls -la /usr/lib*/libOSMesa*
```

You should see OSMesa library files.

### 3. Test OpenGL Capabilities

```bash
docker exec -it hashi-app bash
```

Then run:

```bash
export DISPLAY=:99
glxinfo | grep -i "opengl" | head -n 10
```

### 4. Manual ChimeraX Test

Create a test script:

```python
from chimerax.core.commands import run
try:
    run(session, "open")
    run(session, "save /tmp/test.png width 200 height 200")
    print("Test successful")
except Exception as e:
    print(f"Error: {e}")
```

Run it with:

```bash
chimerax --nogui --silent --script /tmp/test_script.py
```

### 5. Common Issues and Solutions

#### Missing OSMesa Libraries

**Issue**: `libOSMesa.so not found`

**Solution**: These libraries are installed in the container. If they are missing, rebuild the container with:

```bash
docker-compose build --no-cache app
```

#### Xvfb Not Running

**Issue**: `Error: Can't open display: :99`

**Solution**: Check if Xvfb is running:

```bash
docker exec -it hashi-app ps aux | grep Xvfb
```

If not, restart Xvfb:

```bash
docker exec -it hashi-app bash -c "Xvfb :99 -screen 0 1280x1024x24 -ac +extension GLX +render -noreset &"
```

#### OpenGL Version Issues

**Issue**: `Required OpenGL version not supported`

**Solution**: Set a lower OpenGL version:

```bash
docker exec -it hashi-app bash -c "export MESA_GL_VERSION_OVERRIDE=3.2; chimerax --nogui --silent --script /tmp/test_script.py"
```

## Development Workflow

### 1. Using the Development Container

Start the development container:

```bash
docker-compose --profile dev up -d dev-tools
```

Execute commands inside it:

```bash
docker exec -it hashi-dev-tools npm run dev
```

### 2. Shared Volumes

The development container mounts these directories:
- `.:/app` - Project code
- `node_modules:/app/node_modules` - Node modules

### 3. Hot Reloading

The development server supports hot reloading. Any changes to the source code will automatically reload the application.

## Deployment

### 1. Building for Production

```bash
docker-compose build
```

### 2. Production Deployment

When deploying to production, use:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Image Management

Push the built image to a container registry:

```bash
docker tag hashi-app:latest your-registry/hashi-app:latest
docker push your-registry/hashi-app:latest
```

## Monitoring and Logging

Enable monitoring with:

```bash
docker-compose --profile monitoring up -d
```

Enable logging with:

```bash
docker-compose --profile logging up -d
```

Access monitoring dashboards at http://localhost:3002 (Grafana) and logging at http://localhost:5601 (Kibana).