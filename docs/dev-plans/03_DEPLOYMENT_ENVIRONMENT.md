# Deployment & Environment Development Plan

## Overview

As Dev 3, you are responsible for deployment and environment configuration, focusing on containerization and cross-platform compatibility. Your work will ensure the application runs consistently across development (macOS) and production (Linux) environments, with proper dependency management.

## Responsibilities

- Creating Docker containerization for ChimeraX
- Ensuring cross-platform compatibility
- Setting up continuous integration/deployment
- Managing environment configuration
- Implementing robust dependency management

## Development Timeline

### Phase 1: Days 1-2 - Environment Setup & Investigation

#### Task 1.1: Development Environment Standardization
- Create development environment setup scripts
- Document environment requirements in [DEPENDENCIES.md](./DEPENDENCIES.md)
- Ensure consistent environment across macOS and Linux

#### Task 1.2: OSMesa Investigation
- Research OSMesa installation and configuration
- Test OSMesa with ChimeraX on both macOS and Linux
- Document findings in [COORDINATION.md](./COORDINATION.md)

#### Task 1.3: Container Strategy Planning
- Evaluate container options for ChimeraX
- Determine Docker configuration requirements
- Create container architecture diagram

### Phase 2: Days 3-5 - Core Implementation

#### Task 2.1: Base Docker Image Creation
- Create base Docker image with ChimeraX dependencies
- Install OSMesa in Docker environment
- Verify ChimeraX operation in container

```dockerfile
# Example Dockerfile for ChimeraX
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    libosmesa6-dev \
    libgl1-mesa-glx \
    libglu1-mesa \
    xvfb \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install ChimeraX
RUN wget https://www.rbvi.ucsf.edu/chimerax/download/1.5/ubuntu-22.04/chimerax_1.5ubuntu22.04_amd64.deb \
    && apt install -y ./chimerax_1.5ubuntu22.04_amd64.deb \
    && rm chimerax_1.5ubuntu22.04_amd64.deb

# Set up environment variables
ENV DISPLAY=:99
ENV CHIMERAX_HEADLESS=1

# Create working directory
WORKDIR /app

# Copy application files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create snapshot directory
RUN mkdir -p snapshots && chmod 777 snapshots

# Expose API port
EXPOSE 9876

# Set up entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
```

#### Task 2.2: Docker Compose Setup
- Create Docker Compose configuration
- Set up volumes for persistent data
- Configure networking between containers

```yaml
# Example docker-compose.yml
version: '3.8'

services:
  hashi-backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "9876:9876"
    volumes:
      - ./snapshots:/app/snapshots
    environment:
      - NODE_ENV=production
      - CHIMERAX_PATH=/usr/bin/chimerax
      - OSMESA_AVAILABLE=true
  
  hashi-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - hashi-backend
    environment:
      - BACKEND_URL=http://hashi-backend:9876
```

#### Task 2.3: Environment Variable Management
- Implement `.env` file handling
- Create environment configuration documentation
- Support different configuration profiles

### Phase 3: Days 6-7 - Integration & Testing

#### Task 3.1: Backend Integration
- Work with Dev 1 to integrate backend into container
- Verify ChimeraX operation inside container
- Address platform-specific issues

#### Task 3.2: Frontend Integration
- Set up production build process for frontend
- Configure frontend to work with containerized backend
- Implement cross-origin support

#### Task 3.3: Testing in Container
- Create testing framework for containerized application
- Support Dev 4 in implementing container-based tests
- Verify all functionality in container environment

### Phase 4: Days 8-9 - CI/CD & Refinement

#### Task 4.1: Continuous Integration Setup
- Implement GitHub Actions workflow
- Set up automated testing
- Configure build validation

```yaml
# Example GitHub Actions workflow
name: Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 16
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build frontend
      run: npm run build
    
    - name: Run tests
      run: npm test
    
    - name: Build and test Docker image
      run: |
        docker build -t hashi:test .
        docker run --rm hashi:test npm test
```

#### Task 4.2: Deployment Pipeline
- Create deployment automation
- Set up staging environment
- Implement rollback mechanisms

#### Task 4.3: Documentation & Monitoring
- Document deployment procedures
- Set up health checks and monitoring
- Create operational runbooks

### Phase 5: Day 10 - Final Review & Launch

#### Task 5.1: Production Readiness Review
- Verify all components work in production environment
- Conduct security review
- Perform load testing

#### Task 5.2: Deployment Support
- Support final deployment to production
- Verify all systems are operational
- Document production environment

## Integration Points

Refer to [INTEGRATION_POINTS.md](./INTEGRATION_POINTS.md) for details on working with other developers.

Key integration points for your role:
- IP2: Docker Environment ↔ Backend (with Dev 1)
- IP5: CI/CD Pipeline ↔ All Components (with all devs)

## Communication

- Document your progress daily in [COORDINATION.md](./COORDINATION.md)
- Report blocking issues in [BLOCKING_ISSUES.md](./BLOCKING_ISSUES.md)
- Coordinate with other developers as needed

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ChimeraX Installation Guide](https://www.rbvi.ucsf.edu/chimerax/docs/user/installation.html)
- [OSMesa Documentation](https://www.mesa3d.org/osmesa.html)