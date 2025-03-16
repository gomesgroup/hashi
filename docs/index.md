# Hashi Documentation

Welcome to the Hashi documentation. Hashi is a web application that integrates with UCSF ChimeraX for molecular visualization and analysis.

## Core Components

- [ChimeraX Process Management](./chimerax-process-manager.md): Manages the lifecycle of ChimeraX processes
- [Session Management](./api_documentation.md): Tracks user sessions and their associated ChimeraX processes
- [File Handling System](./file_handling.md): Manages molecular structure files
- [Structure Retrieval API](./structure_retrieval_api.md): Retrieves molecular structure data
- [Structure Modification API](./structure_modification_api.md): Modifies molecular structures
- [Snapshot Rendering API](./snapshot_rendering_api.md): Generates high-quality renderings
- [Persistent Storage System](./persistent_storage.md): Stores structures, sessions, and metadata
- [WebSocket Support](./websocket_support.md): Real-time communication for updates and notifications
- [React Frontend](./task9_completion.md): User interface with WebGL visualization
- [Command API](./task5_completion.md): Provides a high-level API for ChimeraX operations
- [Deployment & Docker](./deployment_documentation.md): Container-based deployment and operation

## System Architecture

Hashi follows a three-tier architecture:

1. **React Frontend**: User interface with WebGL visualization
2. **Node.js Backend**: API endpoints, WebSocket server, and ChimeraX process management
3. **ChimeraX Engine**: Headless processes for molecular operations

The backend is built with Express.js and TypeScript, providing both RESTful API and WebSocket connections for the frontend to interact with. This dual communication approach enables efficient real-time updates for long-running operations and structure changes.

## Getting Started

### For Users
- [User Guide](./user_guide/getting_started.md): Learn how to use Hashi
- [Structure Visualization](./user_guide/structure_visualization.md): Visualize molecular structures
- [File Management](./user_guide/file_management.md): Upload and manage files

### For Administrators
- [Installation Guide](./admin_guide/installation.md): Install and configure Hashi
- [Configuration Options](./admin_guide/configuration.md): Configure Hashi
- [Deployment Documentation](./deployment_documentation.md): Deploy Hashi in production

### For Developers
- [API Reference](./api_guide/overview.md): Comprehensive API documentation
- [Development Guide](./dev_guide/architecture.md): Extend and modify Hashi
- [Contributing Guide](../CONTRIBUTING.md): Contribute to Hashi

## API Reference

The API reference is available in the [API Guide](./api_guide/overview.md) section, with detailed documentation for specific modules:

- [Session API](./api_documentation.md)
- [File Handling API](./file_handling.md)
- [Command API](./task5_completion.md)
- [Structure Retrieval API](./structure_retrieval_api.md)
- [Structure Modification API](./structure_modification_api.md)
- [Snapshot Rendering API](./snapshot_rendering_api.md)
- [Persistent Storage API](./persistent_storage.md)
- [Authentication API](./authentication_api.md)
- [WebSocket API](./websocket_support.md)
- [Testing Suite](./task15_completion.md)

## Frontend Documentation

The React frontend is documented in the following sections:

- [React Frontend Implementation](./task9_completion.md)

The frontend provides:
- WebGL-based molecular visualization using React Three Fiber and Three.js
- Session management with automatic persistence and timeout handling
- Drag-and-drop file upload interface with format validation
- Structure browsing and visualization controls (representation styles, color schemes)
- Responsive design for desktop and mobile devices

## Deployment & Operations

Hashi can be deployed in various environments:

- [Docker Deployment](./admin_guide/installation.md): Docker-based deployment
- [Monitoring & Observability](./admin_guide/monitoring.md): Monitor Hashi in production
- [Security Hardening](./admin_guide/security.md): Secure your Hashi installation
- [Backup & Recovery](./admin_guide/backup_recovery.md): Protect your data

## Module Documentation

Each module has its own documentation:

- [ChimeraX Process Management](./chimerax-process-manager.md)
- [WebSocket Support](./websocket_support.md)
- [Persistent Storage System](./persistent_storage.md)
- [Project Structure](./project_structure.md)
- [Implementation Details](./implementation_details.md)

## Completed Tasks

- [Task 1: Project Setup](./task1_completion.md)
- [Task 3: Session Management API](./task3_completion.md)
- [Task 4: File Handling System](./task4_completion.md)
- [Task 5: ChimeraX Command API](./task5_completion.md)
- [Task 6: Structure Retrieval API](./task6_completion.md)
- [Task 7: Structure Modification API](./task7_completion.md)
- [Task 8: Snapshot Rendering API](./task8_completion.md)
- [Task 9: Basic React Frontend](./task9_completion.md)
- [Task 11: WebSocket Support](./task11_completion.md)
- [Task 12: Authentication & Authorization](./task12_completion.md)
- [Task 13: Persistent Storage System](./task13_completion.md)
- [Task 15: Comprehensive Testing Suite](./task15_completion.md)
- [Task 16: Deployment & Documentation](./task16_completion.md)

## Contributing

For information on how to contribute to Hashi, see the [Contributing Guide](../CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.