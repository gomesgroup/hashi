import { User, UserRole } from './auth';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      user?: User;
      role?: UserRole;
      token?: string;
    }
  }
}