import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { RefreshTokenPayload } from "../types/jwt.js";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, username, isAdmin } = req.body;

    const isEmailAlreadyExist = await prisma.user.findUnique({
      where: { email: email },
    });

    if (isEmailAlreadyExist) {
      res.status(409).json({
        message: "Email already in use",
      });
      return;
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: email,
        username: username,
        password: hashedPassword,
        isAdmin: isAdmin ?? false,
      },
    });

    if (!process.env.JWT_SECRET_ACCESS) {
      throw new Error("JWT_SECRET_ACCESS not defined");
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET_ACCESS,
      {
        expiresIn: "1d",
      },
    );

    const refreshToken = jwt.sign({ email: email }, "refreshSecret", {
      expiresIn: "10d",
    });

    // Verify user was created by checking if we got back an ID
    if (!user || !user.id) {
      throw new Error("User creation failed - no user ID returned");
    }

    res.status(201).json({
      message: "User registered successfully",
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
    console.error("Error registering user:", error);
    res.status(500).json({
      message: "Failed to register user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT token for authenticated user

    if (!process.env.JWT_SECRET_ACCESS) {
      throw new Error("JWT_SECRET_ACCESS not defined");
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET_ACCESS,
      {
        expiresIn: "1d",
      },
    );

    if (!process.env.JWT_SECRET_REFRESH) {
      throw new Error("JWT_SECRET_REFRESH is not defined");
    }

    const refreshToken = jwt.sign(
      { email: email },
      process.env.JWT_SECRET_REFRESH,
      {
        expiresIn: "10d",
      },
    );

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Error logging in", error);
    res.status(500).json({
      message: "Failed to login user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Validate refresh token is provided
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify JWT_SECRET_REFRESH is configured
    if (!process.env.JWT_SECRET_REFRESH) {
      throw new Error("JWT_SECRET_REFRESH is not defined");
    }

    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET_REFRESH,
    ) as RefreshTokenPayload;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify JWT_SECRET_ACCESS is configured
    if (!process.env.JWT_SECRET_ACCESS) {
      throw new Error("JWT_SECRET_ACCESS not defined");
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET_ACCESS,
      {
        expiresIn: "1d",
      },
    );

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    // Handle JWT specific errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired. Please login again",
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Failed to refresh access token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
