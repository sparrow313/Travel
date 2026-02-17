import { JwtPayload } from "jsonwebtoken";

/**
 * Payload structure for access tokens
 * Contains full user information needed for authentication
 */
export interface AccessTokenPayload extends JwtPayload {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
}

/**
 * Payload structure for refresh tokens
 * Contains minimal information needed to refresh access token
 */
export interface RefreshTokenPayload extends JwtPayload {
  email: string;
}

