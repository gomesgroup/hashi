import { Router } from 'express';
import authController from '../controllers/authController';
import { validateRequest } from '../middlewares/validation';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { authRateLimitMiddleware } from '../middlewares/security';
import { UserRole } from '../types/auth';
import * as authValidation from '../validation/authValidation';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// Registration
router.post(
  '/register',
  authRateLimitMiddleware,
  validateRequest(authValidation.userRegistrationSchema),
  authController.register
);

// Login
router.post(
  '/login',
  authRateLimitMiddleware,
  validateRequest(authValidation.userLoginSchema),
  authController.login
);

// Refresh token
router.post(
  '/refresh-token',
  validateRequest(authValidation.refreshTokenSchema),
  authController.refreshToken
);

// Password reset request
router.post(
  '/reset-password',
  authRateLimitMiddleware,
  validateRequest(authValidation.passwordResetRequestSchema),
  authController.initiatePasswordReset
);

// Password reset with token
router.post(
  '/reset-password/:token',
  authRateLimitMiddleware,
  validateRequest(authValidation.passwordResetWithTokenSchema),
  authController.resetPassword
);

// Email verification
router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

/**
 * Protected routes (authentication required)
 */

// Logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

// Get user profile
router.get(
  '/profile',
  authMiddleware,
  authController.getProfile
);

// Update user profile
router.put(
  '/profile',
  authMiddleware,
  validateRequest(authValidation.profileUpdateSchema),
  authController.updateProfile
);

// Update user preferences
router.put(
  '/preferences',
  authMiddleware,
  validateRequest(authValidation.preferencesUpdateSchema),
  authController.updatePreferences
);

// Update password
router.put(
  '/password',
  authMiddleware,
  validateRequest(authValidation.passwordUpdateSchema),
  authController.updatePassword
);

/**
 * Admin routes
 */

// Get all users (admin only)
router.get(
  '/users',
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  authController.getAllUsers
);

export default router;