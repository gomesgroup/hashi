import { User } from './src/server/database/entities/User';
import { UserRole } from './src/server/types/auth';

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

// This file is needed by TypeScript compiler, but doesn't export anything
export {};