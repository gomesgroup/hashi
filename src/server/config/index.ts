import dotenv from 'dotenv';
import { AppConfig } from '../types';
import crypto from 'crypto';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Generate a random string for JWT_SECRET if not provided in .env
const generateSecretKey = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Parse comma-separated CORS origins
const parseAllowedOrigins = (origins: string): string[] => {
  return origins ? origins.split(',').map(origin => origin.trim()) : [];
};

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  chimerax: {
    chimeraXPath: process.env.CHIMERAX_PATH || '',
    basePort: parseInt(process.env.CHIMERAX_BASE_PORT || '6100', 10),
    maxInstances: parseInt(process.env.MAX_CHIMERAX_INSTANCES || '10', 10),
  },
  rendering: {
    snapshotDir: process.env.SNAPSHOT_DIR || './snapshots',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_RENDERING_JOBS || '5', 10),
    defaultImageWidth: parseInt(process.env.DEFAULT_IMAGE_WIDTH || '800', 10),
    defaultImageHeight: parseInt(process.env.DEFAULT_IMAGE_HEIGHT || '600', 10),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '3840', 10), // 4K width
    maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '2160', 10), // 4K height
  },
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
    path: process.env.WEBSOCKET_PATH || '/ws',
    heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
    heartbeatTimeout: parseInt(process.env.WEBSOCKET_HEARTBEAT_TIMEOUT || '10000', 10), // 10 seconds
    maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '100', 10),
    messageQueueSize: parseInt(process.env.WEBSOCKET_MESSAGE_QUEUE_SIZE || '50', 10),
    messageRetryAttempts: parseInt(process.env.WEBSOCKET_MESSAGE_RETRY_ATTEMPTS || '3', 10),
    messageExpiryTime: parseInt(process.env.WEBSOCKET_MESSAGE_EXPIRY_TIME || '60000', 10), // 60 seconds
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || generateSecretKey(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    jwtIssuer: process.env.JWT_ISSUER || 'hashi-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'hashi-client',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3001'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // 15 minutes in ms
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
    passwordRequiresSpecialChar: process.env.PASSWORD_REQUIRES_SPECIAL_CHAR !== 'false',
    passwordRequiresNumber: process.env.PASSWORD_REQUIRES_NUMBER !== 'false',
    passwordRequiresUppercase: process.env.PASSWORD_REQUIRES_UPPERCASE !== 'false',
    passwordRequiresLowercase: process.env.PASSWORD_REQUIRES_LOWERCASE !== 'false',
  },
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'hashi',
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || isDevelopment,
    logging: process.env.DB_LOGGING === 'true' || isDevelopment,
    entities: [
      process.env.DB_ENTITIES_PATH || 
      path.join(__dirname, '..', 'database', 'entities', '*.{js,ts}')
    ],
    migrations: [
      process.env.DB_MIGRATIONS_PATH || 
      path.join(__dirname, '..', 'database', 'migrations', '*.{js,ts}')
    ],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true' || false,
  },
  storage: {
    basePath: process.env.STORAGE_BASE_PATH || './storage',
    maxSizePerUser: parseInt(process.env.STORAGE_MAX_SIZE_PER_USER || '1024', 10), // 1GB in MB
    allowedFileTypes: (process.env.STORAGE_ALLOWED_FILE_TYPES || 'pdb,xyz,mol,mol2,sdf,cif').split(','),
    maxVersionsPerStructure: parseInt(process.env.STORAGE_MAX_VERSIONS_PER_STRUCTURE || '10', 10),
  },
};

export default config;
