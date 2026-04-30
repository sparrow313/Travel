import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../utils/r2.js";

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not Found",
      });
    }

    // Fetch user with profile from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        isAdmin: dbUser.isAdmin,
        profile: dbUser.profile, // Can be null if profile doesn't exist yet
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
    const { bio, location, currentlyVisiting } = req.body;
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
        userId: user.id,
        bio: bio || "",
        location: location || null,
        currentlyVisiting: currentlyVisiting || null,
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
    const { username, bio, location, currentlyVisiting } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Update username on User model if provided
    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Username cannot be empty",
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { username: username.trim() },
      });
    }

    // Build update data for profile with only provided fields (partial update)
    const updateData: { bio?: string; location?: string | null; currentlyVisiting?: string | null } = {};
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location || null;
    if (currentlyVisiting !== undefined) updateData.currentlyVisiting = currentlyVisiting || null;

    // Only touch profile if there are profile fields to update
    let profile = null;
    if (Object.keys(updateData).length > 0) {
      // Use upsert to create or update in one operation
      profile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          bio: bio || "",
          location: location || null,
          currentlyVisiting: currentlyVisiting || null,
        },
      });
    } else if (username === undefined) {
      // Nothing to update at all
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    } else {
      // Only username was updated, fetch the existing profile
      profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });
    }

    // Fetch updated user for response
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, username: true, isAdmin: true },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
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

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
      });
    }

    // Delete old image from R2 if one exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile?.profileImageUrl) {
      const oldKey = getKeyFromUrl(existingProfile.profileImageUrl);
      if (oldKey) {
        try {
          await deleteFromR2(oldKey);
        } catch (err) {
          console.warn("[R2] Failed to delete old image:", err);
        }
      }
    }

    // Upload new image to R2
    const ext = file.mimetype.split("/")[1];
    const key = `profile-images/${user.id}-${Date.now()}.${ext}`;
    const imageUrl = await uploadToR2(file.buffer, key, file.mimetype);

    // Upsert profile with new image URL
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: { profileImageUrl: imageUrl },
      create: {
        userId: user.id,
        bio: "",
        profileImageUrl: imageUrl,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      profileImageUrl: profile.profileImageUrl,
    });
  } catch (error) {
    console.error("[ProfileImage] Upload failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile image",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
