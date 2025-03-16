import { User, UserRole, UserStatus, UserProfile, UserPreferences, UserActivityLog, UserDTO } from '../types/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory user storage
 * In a production environment, this would be replaced with a database ORM
 */
class UserModel {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // Maps email to userId
  private refreshTokenIndex: Map<string, string> = new Map(); // Maps refreshToken to userId
  private resetTokenIndex: Map<string, string> = new Map(); // Maps resetToken to userId

  /**
   * Creates a new user
   * @param userData User data for creation
   * @returns Created user
   */
  public create(userData: Partial<User>): User {
    const id = userData.id || uuidv4();
    const now = new Date();

    // Default values
    const newUser: User = {
      id,
      email: userData.email || '',
      password: userData.password || '',
      role: userData.role || UserRole.VIEWER,
      status: userData.status || UserStatus.PENDING,
      profile: userData.profile || {},
      preferences: userData.preferences || {},
      activityLog: userData.activityLog || [],
      createdAt: userData.createdAt || now,
      updatedAt: userData.updatedAt || now,
      lastLogin: userData.lastLogin,
      failedLoginAttempts: userData.failedLoginAttempts || 0,
      emailVerified: userData.emailVerified || false,
      resetToken: userData.resetToken,
      resetTokenExpires: userData.resetTokenExpires,
      refreshToken: userData.refreshToken,
    };

    // Store the user
    this.users.set(id, newUser);
    this.emailIndex.set(newUser.email.toLowerCase(), id);

    // Index refresh token if provided
    if (newUser.refreshToken) {
      this.refreshTokenIndex.set(newUser.refreshToken, id);
    }

    // Index reset token if provided
    if (newUser.resetToken) {
      this.resetTokenIndex.set(newUser.resetToken, id);
    }

    return newUser;
  }

  /**
   * Gets a user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  public findById(id: string): User | null {
    return this.users.get(id) || null;
  }

  /**
   * Gets a user by email
   * @param email User email
   * @returns User or null if not found
   */
  public findByEmail(email: string): User | null {
    const id = this.emailIndex.get(email.toLowerCase());
    if (!id) return null;
    return this.users.get(id) || null;
  }

  /**
   * Gets a user by refresh token
   * @param refreshToken Refresh token
   * @returns User or null if not found
   */
  public findByRefreshToken(refreshToken: string): User | null {
    const id = this.refreshTokenIndex.get(refreshToken);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  /**
   * Gets a user by reset token
   * @param resetToken Password reset token
   * @returns User or null if not found
   */
  public findByResetToken(resetToken: string): User | null {
    const id = this.resetTokenIndex.get(resetToken);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  /**
   * Updates a user
   * @param id User ID
   * @param userData User data to update
   * @returns Updated user or null if user not found
   */
  public update(id: string, userData: Partial<User>): User | null {
    const existingUser = this.users.get(id);
    if (!existingUser) return null;

    const oldEmail = existingUser.email.toLowerCase();
    const oldRefreshToken = existingUser.refreshToken;
    const oldResetToken = existingUser.resetToken;

    // Create updated user
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };

    // Update user in storage
    this.users.set(id, updatedUser);

    // Update email index if email changed
    if (userData.email && userData.email.toLowerCase() !== oldEmail) {
      this.emailIndex.delete(oldEmail);
      this.emailIndex.set(updatedUser.email.toLowerCase(), id);
    }

    // Update refresh token index if it changed
    if (userData.refreshToken !== oldRefreshToken) {
      if (oldRefreshToken) {
        this.refreshTokenIndex.delete(oldRefreshToken);
      }
      if (updatedUser.refreshToken) {
        this.refreshTokenIndex.set(updatedUser.refreshToken, id);
      }
    }

    // Update reset token index if it changed
    if (userData.resetToken !== oldResetToken) {
      if (oldResetToken) {
        this.resetTokenIndex.delete(oldResetToken);
      }
      if (updatedUser.resetToken) {
        this.resetTokenIndex.set(updatedUser.resetToken, id);
      }
    }

    return updatedUser;
  }

  /**
   * Deletes a user
   * @param id User ID
   * @returns True if user was deleted, false if user not found
   */
  public delete(id: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    // Remove from indices
    this.emailIndex.delete(user.email.toLowerCase());
    if (user.refreshToken) {
      this.refreshTokenIndex.delete(user.refreshToken);
    }
    if (user.resetToken) {
      this.resetTokenIndex.delete(user.resetToken);
    }

    // Remove from users map
    this.users.delete(id);
    return true;
  }

  /**
   * Adds an activity log entry to a user
   * @param id User ID
   * @param log Activity log entry
   * @returns Updated user or null if user not found
   */
  public addActivityLog(id: string, log: Omit<UserActivityLog, 'timestamp'>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    const activityLog = user.activityLog || [];
    const newLog: UserActivityLog = {
      ...log,
      timestamp: new Date()
    };

    // Update user with new activity log
    return this.update(id, {
      activityLog: [...activityLog, newLog],
      updatedAt: new Date()
    });
  }

  /**
   * Updates a user's profile
   * @param id User ID
   * @param profile Profile data to update
   * @returns Updated user or null if user not found
   */
  public updateProfile(id: string, profile: Partial<UserProfile>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    return this.update(id, {
      profile: {
        ...user.profile,
        ...profile
      }
    });
  }

  /**
   * Updates a user's preferences
   * @param id User ID
   * @param preferences Preferences to update
   * @returns Updated user or null if user not found
   */
  public updatePreferences(id: string, preferences: Partial<UserPreferences>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    return this.update(id, {
      preferences: {
        ...user.preferences,
        ...preferences
      }
    });
  }

  /**
   * Converts a User to a UserDTO (removes sensitive fields)
   * @param user User to convert
   * @returns UserDTO
   */
  public toDTO(user: User): UserDTO {
    const { password, resetToken, resetTokenExpires, refreshToken, failedLoginAttempts, ...userData } = user;
    return userData as UserDTO;
  }

  /**
   * Gets all users (as DTOs)
   * @returns Array of UserDTOs
   */
  public findAll(): UserDTO[] {
    return Array.from(this.users.values()).map(user => this.toDTO(user));
  }
}

export default new UserModel();