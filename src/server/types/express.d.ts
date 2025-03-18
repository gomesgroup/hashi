import { User } from '../database/entities/User';
import { UserRole } from './auth';

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      user?: User;
      role?: UserRole;
      token?: string;
    }
  }
}

export {};