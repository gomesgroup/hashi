#!/bin/bash
# Script to verify all dependencies for the Hashi project

set -e # Exit on first error

# Color coding for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hashi Dependency Verification ===${NC}"
echo
echo "This script will verify that all required dependencies are installed."
echo "Platform detected: $(uname -s)"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check with visual feedback
check_dependency() {
  local name=$1
  local command=$2
  local version_arg=${3:-"--version"}
  
  echo -n "Checking $name... "
  if command_exists "$command"; then
    version=$($command $version_arg 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} Found: $version"
    return 0
  else
    echo -e "${RED}✗${NC} Not found"
    return 1
  fi
}

# Function to check OSMesa
check_osmesa() {
  echo -n "Checking OSMesa libraries... "
  
  if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    if ls /usr/local/lib/libOSMesa* >/dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} Found in /usr/local/lib/"
      return 0
    fi
  else
    # Linux
    if ls /usr/lib*/libOSMesa* >/dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} Found in /usr/lib/"
      return 0
    fi
  fi
  
  echo -e "${RED}✗${NC} Not found"
  return 1
}

# Function to check ChimeraX
check_chimerax() {
  echo -n "Checking ChimeraX... "
  
  if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    if [ -f "/Applications/ChimeraX.app/Contents/MacOS/ChimeraX" ]; then
      version=$(/Applications/ChimeraX.app/Contents/MacOS/ChimeraX --version 2>&1 | head -n 1)
      echo -e "${GREEN}✓${NC} Found: $version"
      return 0
    fi
  else
    # Linux
    if command_exists "chimerax"; then
      version=$(chimerax --version 2>&1 | head -n 1)
      echo -e "${GREEN}✓${NC} Found: $version"
      return 0
    fi
  fi
  
  echo -e "${RED}✗${NC} Not found"
  return 1
}

echo -e "\n${GREEN}Checking core dependencies:${NC}"

# Check Node.js and npm
check_dependency "Node.js" "node" "-v"
check_dependency "npm" "npm" "-v"

# Check ChimeraX
check_chimerax

# Check OSMesa
check_osmesa

# Check Docker if present
check_dependency "Docker" "docker" "--version" || echo -e "${YELLOW}⚠️  Warning: Docker not found but may not be required for development${NC}"
check_dependency "Docker Compose" "docker-compose" "--version" || echo -e "${YELLOW}⚠️  Warning: Docker Compose not found but may not be required for development${NC}"

echo -e "\n${GREEN}Checking project setup:${NC}"

# Check if we're in the project root
if [ -f "package.json" ]; then
  echo -e "Project root detected: ${GREEN}✓${NC}"
  
  # Check if node_modules exists
  if [ -d "node_modules" ]; then
    echo -e "Node modules installed: ${GREEN}✓${NC}"
  else
    echo -e "Node modules not installed: ${RED}✗${NC}"
    echo -e "${YELLOW}⚠️  Run 'npm install' to install project dependencies${NC}"
  fi
  
  # Check for snapshots directory
  if [ -d "snapshots" ]; then
    echo -e "Snapshots directory exists: ${GREEN}✓${NC}"
  else
    echo -e "Snapshots directory not found: ${YELLOW}⚠️${NC}"
    echo -e "${YELLOW}⚠️  Creating snapshots directory...${NC}"
    mkdir -p snapshots
    echo -e "Snapshots directory created: ${GREEN}✓${NC}"
  fi
else
  echo -e "${RED}Error: Not in project root (package.json not found)${NC}"
  exit 1
fi

echo -e "\n${GREEN}Environment verification complete.${NC}"

# Count errors
MISSING=0
if ! command_exists "node"; then MISSING=$((MISSING+1)); fi
if ! command_exists "npm"; then MISSING=$((MISSING+1)); fi
if ! check_chimerax > /dev/null; then MISSING=$((MISSING+1)); fi
if ! check_osmesa > /dev/null; then MISSING=$((MISSING+1)); fi

if [ $MISSING -gt 0 ]; then
  echo -e "${YELLOW}Found $MISSING missing critical dependencies.${NC}"
  echo -e "${YELLOW}Please install missing dependencies before proceeding.${NC}"
  echo -e "See docs/dev-plans/DEPENDENCIES.md for installation instructions."
  exit 1
else
  echo -e "${GREEN}All critical dependencies are installed!${NC}"
  exit 0
fi