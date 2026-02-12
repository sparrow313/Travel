import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not Found",
      });
    }

    const profile = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        profile: true,
      },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        isAdmin: profile.isAdmin,
        profile: profile.profile,
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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create profile with user ID
    const profile = await prisma.profile.create({
      data: {
        id: user.id, // Must match user ID due to schema
        bio,
        currentlyVisiting,
      },
    });

    res.status(201).json({
      success: true,
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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build update data object with only provided fields
    const updateData: { bio?: string; currentlyVisiting?: string | null } = {};
    if (bio !== undefined) updateData.bio = bio;
    if (currentlyVisiting !== undefined)
      updateData.currentlyVisiting = currentlyVisiting;

    const updatedProfile = await prisma.profile.update({
      where: {
        id: user.id,
      },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
