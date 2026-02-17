import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface DecodedToken extends JwtPayload {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
}

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = req.get("authorization");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not Found",
      });
    }

    token = token.split(" ")[1];

    if (!process.env.JWT_SECRET_ACCESS) {
      throw new Error("JWT_SECRET_ACCESS not defined");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_ACCESS,
    ) as DecodedToken;

    // Store only safe, non-sensitive data from the token
    // Never store password or make unnecessary DB calls here
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      isAdmin: decoded.isAdmin,
    };

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
