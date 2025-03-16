/**
 * Authentication and Authorization Types
 */

export enum UserRole {
  ADMIN = 'admin',
  RESEARCHER = 'researcher',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  LOCKED = 'locked'
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  organization?: string;
  department?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  moleculeDisplayMode?: 'ribbon' | 'stick' | 'ball-and-stick' | 'surface';
  colorScheme?: 'default' | 'rainbow' | 'element' | 'chain' | 'residue';
  notifications?: boolean;
  defaultWorkspace?: string;
  showWelcomeScreen?: boolean;
}

export interface UserActivityLog {
  timestamp: Date;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfile;
  preferences?: UserPreferences;
  activityLog?: UserActivityLog[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  failedLoginAttempts?: number;
  emailVerified?: boolean;
  resetToken?: string;
  resetTokenExpires?: Date;
  refreshToken?: string;
}

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfile;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  emailVerified?: boolean;
}

export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface JWTPayload {
  sub: string; // subject (user ID)
  email: string;
  role: UserRole;
  iss?: string; // issuer
  aud?: string; // audience
  iat?: number; // issued at
  exp?: number; // expiration time
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PermissionDefinition {
  action: string;
  subject: string;
  conditions?: any;
}

export type RolePermissions = Record<UserRole, PermissionDefinition[]>;

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  organization?: string;
  department?: string;
  bio?: string;
}

export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark' | 'system';
  moleculeDisplayMode?: 'ribbon' | 'stick' | 'ball-and-stick' | 'surface';
  colorScheme?: 'default' | 'rainbow' | 'element' | 'chain' | 'residue';
  notifications?: boolean;
  defaultWorkspace?: string;
  showWelcomeScreen?: boolean;
}