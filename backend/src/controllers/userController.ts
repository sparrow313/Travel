import { Request, Response } from "express";
import { User } from "../models/users.js";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const isEmailAlreadyExist = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (isEmailAlreadyExist) {
      res.status(400).json({
        status: 400,
        message: "Email Already in use",
      });
      return;
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        isAdmin: data.isAdmin ?? false,
      },
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

    if (!user) {
      res.status(404).json({
        message: "User does not exist. Please sign up",
      });
      return;
    }

    // Compare the plain text password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "Invalid credentials",
      });
      return;
    }

    // Generate JWT token for authenticated user
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || "YOUR_SECRET",
      {
        expiresIn: "1d",
      },
    );

    res.status(200).json({
      message: "Login successful",
      token,
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
