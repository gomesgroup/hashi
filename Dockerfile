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
FROM node:18-bullseye-slim AS production

# Set up a non-root user for better security
RUN groupadd -r hashi && useradd -r -g hashi hashi

# Set the working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Install ChimeraX dependencies (when using the actual ChimeraX binary)
# Adjust these based on ChimeraX's actual requirements
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libxrender1 \
    libfontconfig1 \
    libxkbcommon-x11-0 \
    libxi6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create necessary directories with appropriate permissions
RUN mkdir -p /app/logs /app/snapshots /app/storage /app/storage/uploads \
    && chown -R hashi:hashi /app

# Switch to non-root user
USER hashi

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node /app/dist/scripts/healthcheck.js || exit 1

# Expose ports
EXPOSE 3000 3001

# Command to run the application
CMD ["node", "dist/server/index.js"]