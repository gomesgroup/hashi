# Project Dependencies

This document lists all dependencies required for the project, with installation instructions for both macOS (development) and Linux (production).

## Core Dependencies

| Dependency | Version | Required By | Notes |
|------------|---------|-------------|-------|
| Node.js | ≥16.x | All components | Runtime for JavaScript |
| npm | ≥8.x | All components | Package manager |
| ChimeraX | ≥1.4 | Backend | Molecular visualization tool |
| OSMesa | ≥21.x | ChimeraX rendering | Off-screen rendering library |
| Docker | ≥20.10 | Deployment | Container platform |
| Docker Compose | ≥2.x | Deployment | Multi-container orchestration |

## Installation Instructions

### macOS (Development)

#### Node.js and npm
```bash
# Using Homebrew
brew install node

# Verify installation
node --version
npm --version
```

#### ChimeraX
1. Download ChimeraX from [https://www.rbvi.ucsf.edu/chimerax/download.html](https://www.rbvi.ucsf.edu/chimerax/download.html)
2. Install the application by dragging to Applications folder
3. Verify installation: `/Applications/ChimeraX.app/Contents/MacOS/ChimeraX --version`

#### OSMesa
```bash
# Using Homebrew
brew install mesa

# Verify installation
ls -la /usr/local/lib/libOSMesa*
```

#### Docker & Docker Compose
```bash
# Using Homebrew
brew install --cask docker

# Start Docker Desktop application
open -a Docker

# Verify installation
docker --version
docker-compose --version
```

### Linux (Production)

#### Node.js and npm
```bash
# Using apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using yum (CentOS/RHEL)
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### ChimeraX
```bash
# Download ChimeraX Linux installer
wget https://www.rbvi.ucsf.edu/chimerax/download/1.5/ubuntu-22.04/chimerax_1.5ubuntu22.04_amd64.deb

# Install
sudo apt install ./chimerax_1.5ubuntu22.04_amd64.deb

# Verify installation
chimerax --version
```

#### OSMesa
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libosmesa6-dev

# CentOS/RHEL
sudo yum install -y mesa-libOSMesa-devel

# Verify installation
ls -la /usr/lib*/libOSMesa*
```

#### Docker & Docker Compose
```bash
# Docker installation
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installation
sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Project-Specific Dependencies

### Node.js Packages

Install project dependencies:
```bash
# From project root
npm install
```

Key dependencies include:
- Express (API server)
- Axios (HTTP client)
- Three.js (3D rendering)
- React (UI framework)
- Jest (Testing)

See `package.json` for complete list and versions.

## Development Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| Visual Studio Code | IDE | `brew install --cask visual-studio-code` or download from [code.visualstudio.com](https://code.visualstudio.com/) |
| Postman | API testing | `brew install --cask postman` or download from [postman.com](https://www.postman.com/downloads/) |
| Git | Version control | Preinstalled on macOS or `brew install git` |

## Verification Script

A script to verify all dependencies are correctly installed is available at `/scripts/verify-dependencies.sh`.

Run it with:
```bash
bash scripts/verify-dependencies.sh
```