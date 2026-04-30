import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

const client = new OAuth2Client();

/**
 * POST /auth/google
 * Receives a Google ID token, verifies it, finds or creates the user,
 * and returns JWT access + refresh tokens (same format as login/register).
 */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    const webClientId = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      throw new Error("GOOGLE_WEB_CLIENT_ID not defined");
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: webClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user with Google info (no password needed)
      user = await prisma.user.create({
        data: {
          email,
          username: name || email.split("@")[0],
          password: "", // No password for Google users
        },
      });
    }

    // Upsert profile with Google profile image
    if (picture) {
      console.log("[GoogleAuth] Saving profile image:", picture);
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: { profileImageUrl: picture },
        create: {
          userId: user.id,
          bio: "",
          profileImageUrl: picture,
        },
      });
    } else {
      console.log("[GoogleAuth] No picture in Google payload");
    }

    // Generate JWT tokens (same as regular login)
    if (!process.env.JWT_SECRET_ACCESS) {
      throw new Error("JWT_SECRET_ACCESS not defined");
    }
    if (!process.env.JWT_SECRET_REFRESH) {
      throw new Error("JWT_SECRET_REFRESH not defined");
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET_ACCESS,
      { expiresIn: "1d" },
    );

    const refreshToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET_REFRESH,
      { expiresIn: "14d" },
    );

    res.status(200).json({
      message: "Google login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("[GoogleAuth] Error:", error);
    res.status(500).json({
      message: "Google authentication failed",
    });
  }
};
