import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../config';
import userModel from '../models/userModel';
import logger from '../utils/logger';
import {
  User,
  UserRole,
  UserStatus,
  JWTPayload,
  TokenResponse,
  LoginCredentials,
  RegisterUserDTO,
  UserDTO,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ResetPasswordWithTokenRequest,
  UserProfile,
  UserPreferences
} from '../types/auth';

/**
 * Authentication service for user management and authentication
 */
class AuthService {
  /**
   * Registers a new user
   * @param userData User registration data
   * @returns Created user DTO (non-sensitive fields)
   * @throws Error if registration fails
   */
  public async register(userData: RegisterUserDTO): Promise<UserDTO> {
    try {
      // Check if email already exists
      const existingUser = userModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create new user
      const newUser = userModel.create({
        email: userData.email,
        password: hashedPassword,
        role: UserRole.VIEWER, // Default role for new users
        status: UserStatus.PENDING, // User starts as pending until email is verified
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          organization: userData.organization
        },
        preferences: {
          theme: 'system',
          notifications: true,
          showWelcomeScreen: true
        },
        emailVerified: false
      });

      // Return user DTO (without sensitive fields)
      return userModel.toDTO(newUser);
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticates a user and returns tokens
   * @param credentials User login credentials
   * @returns Token response with access and refresh tokens
   * @throws Error if authentication fails
   */
  public async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      // Find user by email
      const user = userModel.findByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.status === UserStatus.LOCKED) {
        throw new Error('Account is locked. Please reset your password.');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      if (!passwordMatch) {
        // Increment failed login attempts
        const updatedFailedAttempts = (user.failedLoginAttempts || 0) + 1;
        userModel.update(user.id, {
          failedLoginAttempts: updatedFailedAttempts
        });

        // Lock account after 5 failed attempts
        if (updatedFailedAttempts >= 5) {
          userModel.update(user.id, {
            status: UserStatus.LOCKED
          });
        }

        throw new Error('Invalid email or password');
      }

      // Clear failed login attempts on successful login
      userModel.update(user.id, {
        failedLoginAttempts: 0,
        lastLogin: new Date()
      });

      // Add activity log entry
      userModel.addActivityLog(user.id, {
        action: 'login',
        details: 'User logged in successfully'
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store refresh token in user record
      userModel.update(user.id, { refreshToken });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getAccessTokenExpirationSeconds(),
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('User authentication failed:', error);
      throw error;
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param refreshToken Refresh token
   * @returns New token response
   * @throws Error if refresh fails
   */
  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Find user by refresh token
      const user = userModel.findByRefreshToken(refreshToken);
      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // Generate a new access token
      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken();

      // Update refresh token in the user record
      userModel.update(user.id, { refreshToken: newRefreshToken });

      // Add activity log entry
      userModel.addActivityLog(user.id, {
        action: 'token_refresh',
        details: 'Token refreshed successfully'
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.getAccessTokenExpirationSeconds(),
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logs out a user by invalidating their refresh token
   * @param userId User ID
   * @returns True if logout was successful
   */
  public async logout(userId: string): Promise<boolean> {
    try {
      // Find user
      const user = userModel.findById(userId);
      if (!user) {
        return false;
      }

      // Clear refresh token
      userModel.update(userId, { refreshToken: undefined });

      // Add activity log entry
      userModel.addActivityLog(userId, {
        action: 'logout',
        details: 'User logged out'
      });

      return true;
    } catch (error) {
      logger.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Initiates a password reset for a user
   * @param email User email
   * @returns True if reset was initiated successfully
   */
  public async initiatePasswordReset(email: string): Promise<boolean> {
    try {
      // Find user by email
      const user = userModel.findByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return true;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      userModel.update(user.id, { resetToken, resetTokenExpires });

      // Add activity log entry
      userModel.addActivityLog(user.id, {
        action: 'password_reset_request',
        details: 'Password reset requested'
      });

      // In a real application, send an email with the reset token
      logger.info(`Password reset token for ${email}: ${resetToken}`);

      return true;
    } catch (error) {
      logger.error('Password reset initiation failed:', error);
      return false;
    }
  }

  /**
   * Resets a user's password using a reset token
   * @param resetData Reset token and new password
   * @returns True if reset was successful
   * @throws Error if reset fails
   */
  public async resetPassword(resetData: ResetPasswordWithTokenRequest): Promise<boolean> {
    try {
      // Find user by reset token
      const user = userModel.findByResetToken(resetData.token);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Check if token is expired
      if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        throw new Error('Reset token has expired');
      }

      // Validate new password
      await this.validatePassword(resetData.newPassword);

      // Hash new password
      const hashedPassword = await this.hashPassword(resetData.newPassword);

      // Update user with new password and clear reset token
      userModel.update(user.id, {
        password: hashedPassword,
        resetToken: undefined,
        resetTokenExpires: undefined,
        status: UserStatus.ACTIVE, // Unlock account if it was locked
        failedLoginAttempts: 0
      });

      // Add activity log entry
      userModel.addActivityLog(user.id, {
        action: 'password_reset',
        details: 'Password reset successful'
      });

      return true;
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Updates a user's password
   * @param userId User ID
   * @param passwords Current and new passwords
   * @returns True if update was successful
   * @throws Error if update fails
   */
  public async updatePassword(userId: string, passwords: PasswordUpdateRequest): Promise<boolean> {
    try {
      // Find user
      const user = userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(passwords.currentPassword, user.password);
      if (!passwordMatch) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      await this.validatePassword(passwords.newPassword);

      // Hash new password
      const hashedPassword = await this.hashPassword(passwords.newPassword);

      // Update user with new password
      userModel.update(userId, { password: hashedPassword });

      // Add activity log entry
      userModel.addActivityLog(userId, {
        action: 'password_update',
        details: 'Password updated successfully'
      });

      return true;
    } catch (error) {
      logger.error('Password update failed:', error);
      throw error;
    }
  }

  /**
   * Verifies an email verification token
   * @param token Email verification token
   * @returns True if verification was successful
   * @throws Error if verification fails
   */
  public async verifyEmail(token: string): Promise<boolean> {
    try {
      // Find user by token (using resetToken field for simplicity)
      const user = userModel.findByResetToken(token);
      if (!user) {
        throw new Error('Invalid verification token');
      }

      // Update user to verified status
      userModel.update(user.id, {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        resetToken: undefined,
        resetTokenExpires: undefined
      });

      // Add activity log entry
      userModel.addActivityLog(user.id, {
        action: 'email_verified',
        details: 'Email verified successfully'
      });

      return true;
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Updates a user's profile
   * @param userId User ID
   * @param profileData Profile data to update
   * @returns Updated user DTO
   * @throws Error if update fails
   */
  public async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserDTO> {
    try {
      // Update profile
      const user = userModel.updateProfile(userId, profileData);
      if (!user) {
        throw new Error('User not found');
      }

      // Add activity log entry
      userModel.addActivityLog(userId, {
        action: 'profile_update',
        details: 'Profile updated successfully'
      });

      return userModel.toDTO(user);
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Updates a user's preferences
   * @param userId User ID
   * @param preferencesData Preferences to update
   * @returns Updated user DTO
   * @throws Error if update fails
   */
  public async updatePreferences(userId: string, preferencesData: Partial<UserPreferences>): Promise<UserDTO> {
    try {
      // Update preferences
      const user = userModel.updatePreferences(userId, preferencesData);
      if (!user) {
        throw new Error('User not found');
      }

      // Add activity log entry
      userModel.addActivityLog(userId, {
        action: 'preferences_update',
        details: 'Preferences updated successfully'
      });

      return userModel.toDTO(user);
    } catch (error) {
      logger.error('Preferences update failed:', error);
      throw error;
    }
  }

  /**
   * Gets a user by ID
   * @param userId User ID
   * @returns User DTO
   * @throws Error if user not found
   */
  public async getUserById(userId: string): Promise<UserDTO> {
    const user = userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return userModel.toDTO(user);
  }

  /**
   * Gets all users (admin only)
   * @returns Array of UserDTOs
   */
  public async getAllUsers(): Promise<UserDTO[]> {
    return userModel.findAll();
  }

  /**
   * Gets a user by JWT token
   * @param token JWT token
   * @returns User or null if invalid token
   */
  public getUserFromToken(token: string): User | null {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      return userModel.findById(decoded.sub);
    } catch (error) {
      logger.error('Failed to get user from token:', error);
      return null;
    }
  }

  /**
   * Generates an access token for a user
   * @param user User to generate token for
   * @returns JWT access token
   */
  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iss: config.auth.jwtIssuer,
      aud: config.auth.jwtAudience
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn
    });
  }

  /**
   * Generates a refresh token
   * @returns Refresh token
   */
  private generateRefreshToken(): string {
    return uuidv4();
  }

  /**
   * Gets the access token expiration time in seconds
   * @returns Expiration time in seconds
   */
  private getAccessTokenExpirationSeconds(): number {
    // Parse expiresIn string (e.g., '1h', '30m') to seconds
    const expiresIn = config.auth.jwtExpiresIn;
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Hashes a password
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.auth.bcryptSaltRounds);
  }

  /**
   * Validates a password against security requirements
   * @param password Password to validate
   * @throws Error if password doesn't meet requirements
   */
  private async validatePassword(password: string): Promise<void> {
    if (password.length < config.auth.passwordMinLength) {
      throw new Error(`Password must be at least ${config.auth.passwordMinLength} characters long`);
    }

    if (password.length > config.auth.passwordMaxLength) {
      throw new Error(`Password must be less than ${config.auth.passwordMaxLength} characters long`);
    }

    if (config.auth.passwordRequiresUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (config.auth.passwordRequiresLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (config.auth.passwordRequiresNumber && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (config.auth.passwordRequiresSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }
}

export default new AuthService();