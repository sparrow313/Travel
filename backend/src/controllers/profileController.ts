import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not Found",
      });
    }

    // Only fetch the profile data from DB, user info is already in req.user
    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        profile: profile, // Can be null if profile doesn't exist yet
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch User profile",
      error: error instanceof Error ? error.message : "Unknown Error",
    });
  }
};

export const createUserProfile = async (req: Request, res: Response) => {
  try {
    const { bio, currentlyVisiting } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Profile already exists. Use update endpoint to modify it.",
        profile: existingProfile,
      });
    }

    // Create profile with user ID
    const profile = await prisma.profile.create({
      data: {
        userId: user.id, // Foreign key to User table
        bio,
        currentlyVisiting,
      },
    });

    res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { bio, currentlyVisiting } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Build update data with only provided fields (partial update)
    const updateData: { bio?: string; currentlyVisiting?: string | null } = {};
    if (bio !== undefined) updateData.bio = bio;
    if (currentlyVisiting !== undefined)
      updateData.currentlyVisiting = currentlyVisiting;

    // Validate that at least one field is provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    // Use upsert to create or update in one operation
    // This is more efficient than checking existence first
    const profile = await prisma.profile.upsert({
      where: {
        userId: user.id,
      },
      update: updateData, // Only updates provided fields
      create: {
        userId: user.id,
        bio: bio || "",
        currentlyVisiting: currentlyVisiting || null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
