# Multi-stage build for Hashi - ChimeraX Web Integration

# ===== STAGE 1: Build Stage =====
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ===== STAGE 2: Production Stage =====
FROM ubuntu:22.04 AS production

# Set up a non-root user for better security
RUN groupadd -r hashi && useradd -r -g hashi hashi

# Set the working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    CHIMERAX_PATH=/usr/bin/chimerax \
    DISPLAY=:99 \
    MESA_GL_VERSION_OVERRIDE=3.3 \
    LIBGL_ALWAYS_SOFTWARE=1 \
    PYTHONIOENCODING=utf-8

# Install Node.js and required dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    wget \
    xvfb \
    mesa-utils \
    libosmesa6-dev \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    libglu1-mesa \
    libxrender1 \
    libfontconfig1 \
    libxkbcommon-x11-0 \
    libxi6 \
    libxext6 \
    libsm6 \
    libice6 \
    xauth \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install ChimeraX
RUN wget -q https://www.rbvi.ucsf.edu/chimerax/download/1.5/ubuntu-22.04/chimerax_1.5ubuntu22.04_amd64.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends ./chimerax_1.5ubuntu22.04_amd64.deb \
    && rm chimerax_1.5ubuntu22.04_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify ChimeraX installation and OSMesa
RUN mkdir -p /app/test \
    && echo "from chimerax.core.commands import run\ntry:\n  run(session, 'help')\n  print('ChimeraX commands available')\nexcept Exception as e:\n  print(f'Error: {e}')\n  import sys\n  sys.exit(1)" > /app/test/test-chimerax.py \
    && chimerax --nogui --silent --script /app/test/test-chimerax.py \
    && rm -rf /app/test

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create necessary directories with appropriate permissions
RUN mkdir -p /app/logs /app/snapshots /app/storage /app/storage/uploads \
    && chown -R hashi:hashi /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node /app/dist/scripts/healthcheck.js || exit 1

# Expose ports
EXPOSE 3000 3001

# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Default command
CMD ["node", "dist/server/index.js"]