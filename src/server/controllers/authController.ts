import { Request, Response } from 'express';
import authService from '../services/authService';
import logger from '../utils/logger';
import { 
  LoginCredentials, 
  RegisterUserDTO, 
  PasswordUpdateRequest, 
  ResetPasswordWithTokenRequest, 
  UserProfile,
  UserPreferences
} from '../types/auth';

/**
 * Authentication and user management controller
 */
class AuthController {
  /**
   * Registers a new user
   * @route POST /api/auth/register
   */
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const userData = req.body as RegisterUserDTO;
      const user = await authService.register(userData);
      
      return res.status(201).json({
        status: 'success',
        data: user,
        message: 'User registered successfully'
      });
    } catch (error) {
      logger.error('Error in user registration:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Email already registered') {
          return res.status(409).json({
            status: 'error',
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address is already registered'
          });
        }
      }
      
      return res.status(500).json({
        status: 'error',
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user'
      });
    }
  }

  /**
   * Authenticates a user and returns tokens
   * @route POST /api/auth/login
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const credentials = req.body as LoginCredentials;
      const tokenResponse = await authService.login(credentials);
      
      return res.status(200).json({
        status: 'success',
        data: tokenResponse,
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Error in user login:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Invalid email or password') {
          return res.status(401).json({
            status: 'error',
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          });
        } else if (error.message.includes('Account is locked')) {
          return res.status(403).json({
            status: 'error',
            code: 'ACCOUNT_LOCKED',
            message: 'Account is locked. Please reset your password.'
          });
        }
      }
      
      return res.status(500).json({
        status: 'error',
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      });
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @route POST /api/auth/refresh-token
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          code: 'MISSING_TOKEN',
          message: 'Refresh token is required'
        });
      }
      
      const tokenResponse = await authService.refreshToken(refreshToken);
      
      return res.status(200).json({
        status: 'success',
        data: tokenResponse,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      logger.error('Error refreshing token:', error);
      
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
  }

  /**
   * Logs out a user by invalidating their refresh token
   * @route POST /api/auth/logout
   */
  public async logout(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const success = await authService.logout(userId);
      
      if (success) {
        return res.status(200).json({
          status: 'success',
          message: 'Logged out successfully'
        });
      } else {
        return res.status(400).json({
          status: 'error',
          code: 'LOGOUT_FAILED',
          message: 'Logout failed'
        });
      }
    } catch (error) {
      logger.error('Error logging out:', error);
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Initiates a password reset for a user
   * @route POST /api/auth/reset-password
   */
  public async initiatePasswordReset(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;
      
      // Always return success even if email doesn't exist (security best practice)
      await authService.initiatePasswordReset(email);
      
      return res.status(200).json({
        status: 'success',
        message: 'Password reset instructions sent to email if it exists'
      });
    } catch (error) {
      logger.error('Error initiating password reset:', error);
      
      // Still return success (security best practice)
      return res.status(200).json({
        status: 'success',
        message: 'Password reset instructions sent to email if it exists'
      });
    }
  }

  /**
   * Resets a user's password using a reset token
   * @route POST /api/auth/reset-password/:token
   */
  public async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const resetData: ResetPasswordWithTokenRequest = {
        token: req.params.token,
        newPassword: req.body.newPassword
      };
      
      const success = await authService.resetPassword(resetData);
      
      if (success) {
        return res.status(200).json({
          status: 'success',
          message: 'Password reset successfully'
        });
      } else {
        return res.status(400).json({
          status: 'error',
          code: 'PASSWORD_RESET_FAILED',
          message: 'Password reset failed'
        });
      }
    } catch (error) {
      logger.error('Error resetting password:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_RESET_TOKEN',
            message: 'Invalid or expired reset token'
          });
        } else if (error.message.includes('Password')) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_PASSWORD',
            message: error.message
          });
        }
      }
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Updates a user's password
   * @route PUT /api/auth/password
   */
  public async updatePassword(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const passwords = req.body as PasswordUpdateRequest;
      
      const success = await authService.updatePassword(userId, passwords);
      
      if (success) {
        return res.status(200).json({
          status: 'success',
          message: 'Password updated successfully'
        });
      } else {
        return res.status(400).json({
          status: 'error',
          code: 'PASSWORD_UPDATE_FAILED',
          message: 'Password update failed'
        });
      }
    } catch (error) {
      logger.error('Error updating password:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Current password is incorrect') {
          return res.status(400).json({
            status: 'error',
            code: 'INCORRECT_PASSWORD',
            message: 'Current password is incorrect'
          });
        } else if (error.message.includes('Password')) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_PASSWORD',
            message: error.message
          });
        }
      }
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verifies a user's email
   * @route GET /api/auth/verify-email/:token
   */
  public async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.params;
      
      const success = await authService.verifyEmail(token);
      
      if (success) {
        return res.status(200).json({
          status: 'success',
          message: 'Email verified successfully'
        });
      } else {
        return res.status(400).json({
          status: 'error',
          code: 'EMAIL_VERIFICATION_FAILED',
          message: 'Email verification failed'
        });
      }
    } catch (error) {
      logger.error('Error verifying email:', error);
      
      if (error instanceof Error && error.message === 'Invalid verification token') {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'Invalid verification token'
        });
      }
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Gets the current user's profile
   * @route GET /api/auth/profile
   */
  public async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const user = await authService.getUserById(userId);
      
      return res.status(200).json({
        status: 'success',
        data: user,
        message: 'User profile retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Updates the current user's profile
   * @route PUT /api/auth/profile
   */
  public async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const profileData = req.body as Partial<UserProfile>;
      
      const updatedUser = await authService.updateProfile(userId, profileData);
      
      return res.status(200).json({
        status: 'success',
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Updates the current user's preferences
   * @route PUT /api/auth/preferences
   */
  public async updatePreferences(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const preferencesData = req.body as Partial<UserPreferences>;
      
      const updatedUser = await authService.updatePreferences(userId, preferencesData);
      
      return res.status(200).json({
        status: 'success',
        data: updatedUser,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Gets all users (admin only)
   * @route GET /api/auth/users
   */
  public async getAllUsers(req: Request, res: Response): Promise<Response> {
    try {
      const users = await authService.getAllUsers();
      
      return res.status(200).json({
        status: 'success',
        data: users,
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting all users:', error);
      
      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }
}

export default new AuthController();