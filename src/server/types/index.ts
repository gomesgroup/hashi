export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  logLevel: string;
}

export interface ChimeraXConfig {
  chimeraXPath: string;
  basePort: number;
  maxInstances: number;
}

export interface RenderingConfig {
  snapshotDir: string;
  maxConcurrentJobs: number;
  defaultImageWidth: number;
  defaultImageHeight: number;
  maxImageWidth: number;
  maxImageHeight: number;
}

export interface WebSocketConfig {
  port: number;
  path: string;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  maxConnections: number;
  messageQueueSize: number;
  messageRetryAttempts: number;
  messageExpiryTime: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtIssuer: string;
  jwtAudience: string;
  bcryptSaltRounds: number;
  allowedOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordRequiresSpecialChar: boolean;
  passwordRequiresNumber: boolean;
  passwordRequiresUppercase: boolean;
  passwordRequiresLowercase: boolean;
}

export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  entities: string[];
  migrations: string[];
  migrationsRun: boolean;
}

export interface StorageConfig {
  basePath: string;
  maxSizePerUser: number; // in MB
  allowedFileTypes: string[];
  maxVersionsPerStructure: number;
}

export interface AppConfig {
  server: ServerConfig;
  chimerax: ChimeraXConfig;
  rendering: RenderingConfig;
  websocket: WebSocketConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
}
