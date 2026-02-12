// Safe user object without sensitive data like password
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
