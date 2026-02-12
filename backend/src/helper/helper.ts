import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";

interface DecodedToken extends JwtPayload {
  email: string;
  id?: number;
  isAdmin?: boolean;
}

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = req.get("authorization");
    if (!token) {
      return res.status(404).json({
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

    const User = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    req.user = User;
    next();
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
