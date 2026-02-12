import { Request, Response } from "express";
import { User } from "../models/users.js";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET || "YOUR_SECRET",
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
      process.env.JWT_SECRET || process.env.JWT_SECRET_ACCESS,
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
