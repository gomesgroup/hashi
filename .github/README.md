# Hashi - ChimeraX Web Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Hashi is a web application that integrates with UCSF ChimeraX for molecular visualization and editing. It provides a React frontend with WebGL visualization, a Node.js backend for managing ChimeraX processes, and a powerful API for molecular operations.

## Architecture

- **React Frontend**: User interface with WebGL molecular visualization
- **Node.js Backend**: API endpoints and ChimeraX process management
- **ChimeraX Engine**: Headless processes for molecular operations

## Features

- ChimeraX process management (spawn, monitor, terminate)
- Session management for user interactions
- File handling system for molecular structures
- ChimeraX command execution API
- Structure retrieval, conversion, and modification
- Snapshot and rendering capabilities
- WebSocket support for real-time updates
- Authentication and authorization
- Persistent storage for user projects
- Advanced visualization with Three.js/React Three Fiber

## Quick Start

The fastest way to get Hashi running is with Docker:

```bash
# Clone the repository
git clone https://github.com/gomesgroup/hashi.git
cd hashi

# Start the application
docker-compose up -d

# Access Hashi at http://localhost:3000
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Documentation

- [API Documentation](docs/api_documentation.md)
- [User Guide](docs/user_guide/getting_started.md)
- [Administrator Guide](docs/admin_guide/installation.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [UCSF ChimeraX](https://www.cgl.ucsf.edu/chimerax/) for the molecular visualization engine
- The Gomes Group for project sponsorship and guidance