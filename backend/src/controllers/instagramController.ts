import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

/**
 * GET /instagram-saves — list all saved Instagram places for the user
 */
export const getInstagramSaves = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const saves = await prisma.instagramSave.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, saves });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Instagram saves",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /instagram-saves — create a new Instagram save
 */
export const createInstagramSave = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { instagramUrl, placeName, address, notes, sourceHandle } = req.body;

    if (!instagramUrl || !instagramUrl.trim()) {
      return res.status(400).json({ success: false, message: "Instagram URL is required" });
    }

    if (!placeName || !placeName.trim()) {
      return res.status(400).json({ success: false, message: "Place name is required" });
    }

    const save = await prisma.instagramSave.create({
      data: {
        userId: user.id,
        instagramUrl: instagramUrl.trim(),
        placeName: placeName.trim(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        sourceHandle: sourceHandle?.trim() || null,
      },
    });

    res.status(201).json({ success: true, message: "Saved successfully", save });
  } catch (error) {
    console.error("[InstagramSave] Create failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * DELETE /instagram-saves/:id — delete a saved Instagram place
 */
export const deleteInstagramSave = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = req.params.id as string;

    const existing = await prisma.instagramSave.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await prisma.instagramSave.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("[InstagramSave] Delete failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
