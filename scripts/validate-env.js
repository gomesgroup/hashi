#!/usr/bin/env node

/**
 * Environment Configuration Validation Script
 * 
 * This script validates the environment variables required for the Hashi application.
 * It ensures all required variables are present and have valid values.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

// Load environment variables from .env file
dotenv.config();

// Define environment variable schema
const envSchema = Joi.object({
  // Server Configuration
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  CORS_ORIGIN: Joi.string().required(),
  
  // ChimeraX Configuration
  CHIMERAX_PATH: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  CHIMERAX_BASE_PORT: Joi.number().port().default(6100),
  MAX_CHIMERAX_INSTANCES: Joi.number().integer().min(1).max(100).default(10),
  
  // Authentication Configuration
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('hashi-api'),
  JWT_AUDIENCE: Joi.string().default('hashi-client'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
  ALLOWED_ORIGINS: Joi.string(),
  
  // Database Configuration
  DB_TYPE: Joi.string().valid('sqlite', 'postgres').default('sqlite'),
  DB_HOST: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  DB_PORT: Joi.number().port().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.number().required(),
    otherwise: Joi.number().allow(null),
  }),
  DB_USERNAME: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  DB_PASSWORD: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  DB_DATABASE: Joi.string().when('DB_TYPE', {
    is: 'postgres',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_ENTITIES_PATH: Joi.string().allow(''),
  DB_MIGRATIONS_PATH: Joi.string().allow(''),
  DB_MIGRATIONS_RUN: Joi.boolean().default(true),
  
  // Security Configuration
  RATE_LIMIT_WINDOW: Joi.number().integer().min(1).max(60).default(15),
  RATE_LIMIT_MAX: Joi.number().integer().min(10).max(1000).default(100),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(8).max(20).default(8),
  PASSWORD_MAX_LENGTH: Joi.number().integer().min(32).max(256).default(128),
  PASSWORD_REQUIRES_SPECIAL_CHAR: Joi.boolean().default(true),
  PASSWORD_REQUIRES_NUMBER: Joi.boolean().default(true),
  PASSWORD_REQUIRES_UPPERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRES_LOWERCASE: Joi.boolean().default(true),
  
  // Storage Configuration
  STORAGE_BASE_PATH: Joi.string().default('./storage'),
  STORAGE_MAX_SIZE_PER_USER: Joi.number().integer().min(100).max(10240).default(1024),
  STORAGE_ALLOWED_FILE_TYPES: Joi.string().default('pdb,xyz,mol,mol2,sdf,cif'),
  STORAGE_MAX_VERSIONS_PER_STRUCTURE: Joi.number().integer().min(1).max(100).default(10),
  
  // Rendering Configuration
  SNAPSHOT_DIR: Joi.string().default('./snapshots'),
  MAX_CONCURRENT_RENDERING_JOBS: Joi.number().integer().min(1).max(20).default(5),
  DEFAULT_IMAGE_WIDTH: Joi.number().integer().min(100).max(3840).default(800),
  DEFAULT_IMAGE_HEIGHT: Joi.number().integer().min(100).max(2160).default(600),
  MAX_IMAGE_WIDTH: Joi.number().integer().min(800).max(7680).default(3840),
  MAX_IMAGE_HEIGHT: Joi.number().integer().min(600).max(4320).default(2160),
  
  // WebSocket Configuration
  WEBSOCKET_PORT: Joi.number().port().default(3001),
  WEBSOCKET_PATH: Joi.string().default('/ws'),
  WEBSOCKET_HEARTBEAT_INTERVAL: Joi.number().integer().min(5000).max(300000).default(30000),
  WEBSOCKET_HEARTBEAT_TIMEOUT: Joi.number().integer().min(1000).max(60000).default(10000),
  WEBSOCKET_MAX_CONNECTIONS: Joi.number().integer().min(10).max(1000).default(100),
  WEBSOCKET_MESSAGE_QUEUE_SIZE: Joi.number().integer().min(10).max(1000).default(50),
  WEBSOCKET_MESSAGE_RETRY_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),
  WEBSOCKET_MESSAGE_EXPIRY_TIME: Joi.number().integer().min(10000).max(300000).default(60000),
  
  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'text').default('json'),
  LOG_CORRELATION_HEADER: Joi.string().default('x-correlation-id'),
  
  // Monitoring Configuration
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9091),
  METRICS_PATH: Joi.string().default('/metrics'),
  METRICS_PREFIX: Joi.string().default('hashi_'),
}).unknown();

// Validate environment variables
const { error, value } = envSchema.validate(process.env);

if (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Environment configuration validation failed:');
  
  error.details.forEach((detail) => {
    console.error(`  - ${detail.message}`);
  });
  
  process.exit(1);
}

// Check directory permissions for critical paths
const checkDirectoryPermissions = (dirPath, label) => {
  const resolvedPath = path.resolve(dirPath);
  
  try {
    // Check if directory exists, if not try to create it
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
      console.log(`Created ${label} directory: ${resolvedPath}`);
    }
    
    // Check if directory is writable
    fs.accessSync(resolvedPath, fs.constants.W_OK);
  } catch (err) {
    console.error(`\x1b[31m%s\x1b[0m`, `Error with ${label} directory (${resolvedPath}):`);
    console.error(`  - ${err.message}`);
    return false;
  }
  
  return true;
};

// Check critical directories
let dirChecksPass = true;
dirChecksPass = checkDirectoryPermissions(process.env.STORAGE_BASE_PATH || './storage', 'storage') && dirChecksPass;
dirChecksPass = checkDirectoryPermissions(process.env.SNAPSHOT_DIR || './snapshots', 'snapshots') && dirChecksPass;
dirChecksPass = checkDirectoryPermissions('./logs', 'logs') && dirChecksPass;

// If ChimeraX is configured, check the path exists
if (process.env.CHIMERAX_PATH) {
  try {
    fs.accessSync(process.env.CHIMERAX_PATH, fs.constants.X_OK);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'ChimeraX path validation failed:');
    console.error(`  - Cannot access ChimeraX executable at ${process.env.CHIMERAX_PATH}`);
    console.error(`  - ${err.message}`);
    dirChecksPass = false;
  }
}

// Extra validation for production environment
if (process.env.NODE_ENV === 'production') {
  console.log('\x1b[33m%s\x1b[0m', 'Production environment detected, performing additional checks:');
  
  // Check for secure HTTPS configuration
  if (!process.env.HTTPS_KEY_PATH || !process.env.HTTPS_CERT_PATH) {
    console.warn('  - HTTPS keys not configured. For production, HTTPS is strongly recommended.');
  }
  
  // Check for random JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    console.warn('  - JWT_SECRET may not be strong enough. Consider using a longer random string.');
  }
  
  // Check database configuration for production
  if (process.env.DB_TYPE === 'sqlite') {
    console.warn('  - Using SQLite in production is not recommended. Consider using PostgreSQL.');
  }
  
  // Check rate limiting in production
  if (process.env.RATE_LIMIT_MAX > 200) {
    console.warn('  - RATE_LIMIT_MAX is set high for production. Consider lower values for security.');
  }
}

// If all validation passes
if (!error && dirChecksPass) {
  console.log('\x1b[32m%s\x1b[0m', 'Environment configuration validated successfully!');
  process.exit(0);
} else {
  console.error('\x1b[31m%s\x1b[0m', 'Configuration validation failed. Please fix the issues above.');
  process.exit(1);
}