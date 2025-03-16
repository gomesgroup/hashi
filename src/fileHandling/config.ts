import path from 'path';
import os from 'os';

/**
 * File handling system configuration
 */
const config = {
  // Directory paths
  directories: {
    temp: process.env.HASHI_TEMP_DIR || path.join(os.tmpdir(), 'hashi', 'uploads'),
    session: process.env.HASHI_SESSION_DIR || path.join(os.tmpdir(), 'hashi', 'sessions'),
    persistent: process.env.HASHI_STORAGE_DIR || path.join(process.cwd(), 'storage', 'structures'),
  },

  // File limits
  limits: {
    fileSize: parseInt(process.env.HASHI_MAX_FILE_SIZE || '10485760', 10), // 10 MB
    fieldSize: parseInt(process.env.HASHI_MAX_FIELD_SIZE || '1048576', 10), // 1 MB
    files: parseInt(process.env.HASHI_MAX_FILES || '5', 10), // Max 5 files per upload
  },

  // Supported file extensions (lowercase)
  supportedExtensions: ['pdb', 'cif', 'mmcif', 'sdf', 'mol', 'mol2', 'xyz'],

  // Security settings
  security: {
    allowUnknownFormats: process.env.HASHI_ALLOW_UNKNOWN_FORMATS === 'true' || false,
    validateContent: process.env.HASHI_VALIDATE_CONTENT !== 'false', // Default to true
  },

  // ChimeraX integration
  chimerax: {
    executablePath: process.env.CHIMERAX_PATH || 'chimerax',
    conversionTimeout: parseInt(process.env.CHIMERAX_CONVERSION_TIMEOUT || '30000', 10), // 30 seconds
  },

  // Cleanup settings
  cleanup: {
    tempFileTTL: parseInt(process.env.HASHI_TEMP_FILE_TTL || '86400', 10), // 24 hours in seconds
    sessionFileTTL: parseInt(process.env.HASHI_SESSION_FILE_TTL || '604800', 10), // 7 days in seconds
    cleanupInterval: parseInt(process.env.HASHI_CLEANUP_INTERVAL || '3600', 10), // 1 hour in seconds
  },
};

export default config;