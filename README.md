# Hashi - ChimeraX Web Integration

## Overview
Hashi is a web application that integrates with UCSF ChimeraX to provide molecular visualization and analysis capabilities through a browser interface. The name "Hashi" (橋) means "bridge" in Japanese, representing the connection between ChimeraX's powerful molecular visualization capabilities and the web.

The project follows a three-tier architecture:

1. **React Frontend** - User interface with WebGL visualization and fallback mechanisms
2. **Node.js Backend** - API endpoints and ChimeraX process management
3. **ChimeraX Engine** - Headless processes for molecular operations

Hashi enables users to:
- Visualize molecular structures from various file formats (PDB, SDF, MOL, CIF, XYZ) with robust fallback mechanisms
- Run ChimeraX commands via a web interface
- Manage user sessions with up to 10 concurrent ChimeraX instances
- Generate high-quality snapshots and movies for visualization
- Configure camera, lighting, and style settings for molecular rendering
- Interact with molecular structures remotely
- Save and manage molecular structures, sessions, and projects in a database
- Organize structures with tags and metadata
- Track version history of molecular structures and sessions

## Quick Start with Docker

The fastest way to get Hashi running is with Docker:

```bash
# Clone the repository
git clone https://github.com/gomesgroup/hashi.git
cd hashi

# Configure environment (minimum required)
cp .env.example .env
# Edit .env to set CHIMERAX_PATH to your ChimeraX installation

# Start containers
docker-compose up -d

# Access the application
open http://localhost:3000
```

## Project Structure
```
/hashi
  /src
    /client            # React frontend 
      /components      # Reusable UI components
        /MolecularViewer.tsx    # Three.js based 3D renderer
        /StructureRenderer.tsx  # Multi-mode renderer with fallbacks
        /StructurePlaceholder.tsx # Placeholder component
        /EnhancedViewerControls.tsx # Controls with fallback support
      /contexts        # React contexts for state management
      /hooks           # Custom React hooks
        /useChimeraX.ts         # ChimeraX interaction hook
        /useStructure.ts        # Structure data handling
      /pages           # Top-level page components
        /StructureViewer.tsx    # Structure viewing page with fallbacks
      /services        # API client services
        /chimeraxService.ts     # ChimeraX API client
        /structureService.ts    # Structure data service
      /styles          # Global styles
      /types           # TypeScript type definitions
      /utils           # Utility functions
      /App.tsx         # Main application component
      /index.html      # HTML entry point
      /main.tsx        # Application entry point
    /server            # Node.js backend
      /controllers     # Route controllers
      /middlewares     # Express middlewares
      /services        # Business logic
      /utils           # Utility functions
      /models          # Data models
      /routes          # API route definitions
      /config          # Configuration
      /types           # TypeScript types
      /validation      # Input validation schemas
    /fileHandling      # File handling system
    /shared            # Shared code between client and server
  /tests               # Test files
  /docs                # Documentation
  /.github             # GitHub workflows
  /monitoring          # Monitoring configuration (Prometheus, Grafana, ELK)
  /scripts             # Deployment and utility scripts
```

## Installation

### Docker Deployment (Recommended)

1. Clone the repository
   ```bash
   git clone https://github.com/gomesgroup/hashi.git
   cd hashi
   ```

2. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Validate configuration
   ```bash
   npm install
   node scripts/validate-env.js
   ```

4. Start containers
   ```bash
   docker-compose up -d
   ```

5. Access Hashi at `http://localhost:3000`

### Manual Installation

1. Clone the repository
   ```bash
   git clone https://github.com/gomesgroup/hashi.git
   cd hashi
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Build the application
   ```bash
   npm run build
   ```

5. Start the server
   ```bash
   npm start
   ```

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/gomesgroup/hashi.git
   cd hashi
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   # Make sure to set CHIMERAX_PATH to your ChimeraX installation
   ```

4. Start development servers
   ```bash
   npm run dev
   ```

5. Test ChimeraX connectivity
   ```bash
   # Run the simplified development server for testing ChimeraX integration
   node dev-server.js
   
   # In another terminal, test the ChimeraX connection
   curl http://localhost:4000/api/chimerax/status
   
   # Start ChimeraX process
   curl -X POST http://localhost:4000/api/chimerax/start
   
   # Send a command to ChimeraX
   curl -X POST -H "Content-Type: application/json" \
     -d '{"command": "open 1abc"}' \
     http://localhost:4000/api/chimerax/command
   ```

## Production Deployment

For production deployment, we recommend using Docker with appropriate security configurations:

1. Use a reverse proxy (Nginx/Apache) with SSL termination
2. Configure environment variables for production:
   - Set `NODE_ENV=production`
   - Use a PostgreSQL database
   - Configure a strong JWT secret
   - Set up appropriate rate limits

## Available Scripts
- `npm run dev` - Start both backend and frontend development servers with hot reloading
- `npm run dev:server` - Start only the backend development server
- `npm run dev:client` - Start only the frontend development server
- `npm run build` - Build both backend and frontend for production
- `npm run build:server` - Build only the backend for production
- `npm run build:client` - Build only the frontend for production
- `npm start` - Run the production build
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run format` - Format code using Prettier

## Monitoring & Observability

Hashi comes with a complete monitoring stack:

1. Start monitoring services:
   ```bash
   docker-compose --profile monitoring up -d
   ```

2. Access monitoring dashboards:
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3002 (default: admin/admin)
   - Kibana: http://localhost:5601

## Documentation

### User Documentation
- [Getting Started](docs/user_guide/getting_started.md)
- [Structure Visualization](docs/user_guide/structure_visualization.md)
- [Rendering Fallback Mechanisms](docs/user_guide/rendering_fallbacks.md)
- [File Management](docs/user_guide/file_management.md)

### Administrator Documentation
- [Installation Guide](docs/admin_guide/installation.md)
- [Configuration Options](docs/admin_guide/configuration.md)
- [Security Hardening](docs/admin_guide/security.md)
- [Backup & Recovery](docs/admin_guide/backup_recovery.md)

### API Documentation
- [API Overview](docs/api_guide/overview.md)
- [Authentication](docs/api_guide/authentication.md)
- [Sessions API](docs/api_guide/sessions.md)
- [Structures API](docs/api_guide/structures.md)
- [Error Handling System](docs/error_handling.md)
- [Authentication API](docs/authentication_api.md)
- [Structure Modification API](docs/structure_modification_api.md)
- [Structure Retrieval API](docs/structure_retrieval_api.md)
- [Security Implementation](docs/security_implementation.md)

### Development Documentation
- [Architecture Overview](docs/dev_guide/architecture.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Testing Guide](docs/dev_guide/testing.md)
- [ChimeraX Integration](docs/mvp/CHIMERAX_INTEGRATION_DOCS.md)

## Rendering Fallback Mechanisms

Hashi implements a robust three-tiered fallback mechanism for molecular visualization:

1. **ChimeraX Server Rendering** (Primary): Uses ChimeraX's powerful rendering capabilities with OSMesa for offscreen rendering
2. **Three.js WebGL Rendering** (First Fallback): Provides client-side 3D visualization using Three.js when ChimeraX rendering is unavailable
3. **Static Image Fallback** (Second Fallback): Sources pre-rendered images from RCSB PDB and other molecular databases when neither interactive option is available

This approach ensures users have access to molecular visualizations regardless of server configuration or client device capabilities. The system automatically detects the best available rendering method and transitions seamlessly between them.

## Testing
The project has a comprehensive testing suite including unit tests, integration tests, end-to-end tests, performance tests, and security tests. All tests are fully integrated with CI/CD.

### Test Commands
```bash
# Run all tests with Jest
npm test

# Run specific test types
npm run test:backend     # Run backend unit and integration tests
npm run test:client      # Run React component tests
npm run test:security    # Run security-focused tests
npm run test:e2e         # Run Playwright end-to-end tests
npm run test:perf        # Run K6 performance tests

# Run all test types in sequence
npm run test:all

# Generate test coverage report
npm run test:coverage

# Run OSMesa-specific tests
npm test -- -t "OSMesa"
```

### Testing OSMesa and ChimeraX
The project includes specialized tests for ChimeraX integration and OSMesa rendering:

1. **Dependency Verification**: Run `./scripts/verify-dependencies.sh` to check if ChimeraX and OSMesa are properly installed and configured.

2. **Mock Environment Testing**: Use the `ChimeraXMockUtil` to simulate different environments:
   ```typescript
   import ChimeraXMockUtil, { ChimeraXEnvironment } from './tests/mocks/chimeraxMock';
   
   // Test with OSMesa available
   ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
   
   // Test without OSMesa
   ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
   
   // Test without ChimeraX
   ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_CHIMERAX);
   ```

3. **Fallback Testing**: Test visualization fallback mechanisms for scenarios where OSMesa rendering is unavailable.

For detailed information on testing OSMesa integration, see:
- [OSMesa Testing Strategy](/docs/testing/OSMesa_TESTING_STRATEGY.md)
- [Debugging OSMesa](/docs/testing/DEBUGGING_OSMESA.md)

## Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- UCSF ChimeraX team for their powerful molecular visualization software
- Gomes Group for the project vision and support