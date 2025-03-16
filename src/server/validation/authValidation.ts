import Joi from 'joi';
import config from '../config';

/**
 * Validation schemas for authentication and user management
 */

// User registration schema
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(config.auth.passwordMinLength)
    .max(config.auth.passwordMaxLength)
    .pattern(new RegExp('^(?=.*[a-z])'))
    .pattern(new RegExp('^(?=.*[A-Z])'))
    .pattern(new RegExp('^(?=.*[0-9])'))
    .pattern(new RegExp('^(?=.*[!@#$%^&*(),.?":{}|<>])'))
    .required()
    .messages({
      'string.min': `Password must be at least ${config.auth.passwordMinLength} characters`,
      'string.max': `Password must be less than ${config.auth.passwordMaxLength} characters`,
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50),
  organization: Joi.string().trim().max(100)
});

// User login schema
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Password update schema
export const passwordUpdateSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(config.auth.passwordMinLength)
    .max(config.auth.passwordMaxLength)
    .pattern(new RegExp('^(?=.*[a-z])'))
    .pattern(new RegExp('^(?=.*[A-Z])'))
    .pattern(new RegExp('^(?=.*[0-9])'))
    .pattern(new RegExp('^(?=.*[!@#$%^&*(),.?":{}|<>])'))
    .required()
    .messages({
      'string.min': `Password must be at least ${config.auth.passwordMinLength} characters`,
      'string.max': `Password must be less than ${config.auth.passwordMaxLength} characters`,
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

// Password reset request schema
export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

// Password reset with token schema
export const passwordResetWithTokenSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(config.auth.passwordMinLength)
    .max(config.auth.passwordMaxLength)
    .pattern(new RegExp('^(?=.*[a-z])'))
    .pattern(new RegExp('^(?=.*[A-Z])'))
    .pattern(new RegExp('^(?=.*[0-9])'))
    .pattern(new RegExp('^(?=.*[!@#$%^&*(),.?":{}|<>])'))
    .required()
    .messages({
      'string.min': `Password must be at least ${config.auth.passwordMinLength} characters`,
      'string.max': `Password must be less than ${config.auth.passwordMaxLength} characters`,
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

// Email verification schema
export const emailVerificationSchema = Joi.object({
  token: Joi.string().required()
});

// Refresh token schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// User profile update schema
export const profileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50),
  organization: Joi.string().trim().max(100),
  department: Joi.string().trim().max(100),
  bio: Joi.string().trim().max(500)
}).min(1);

// User preferences update schema
export const preferencesUpdateSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system'),
  moleculeDisplayMode: Joi.string().valid('ribbon', 'stick', 'ball-and-stick', 'surface'),
  colorScheme: Joi.string().valid('default', 'rainbow', 'element', 'chain', 'residue'),
  notifications: Joi.boolean(),
  defaultWorkspace: Joi.string().trim().max(50),
  showWelcomeScreen: Joi.boolean()
}).min(1);