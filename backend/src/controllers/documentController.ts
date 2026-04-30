import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { uploadToR2, deleteFromR2, getKeyFromUrl } from "../utils/r2.js";

// Valid document types matching the Prisma enum
const VALID_TYPES = [
  "PASSPORT", "VISA", "FLIGHT", "HOTEL", "INSURANCE",
  "TRAVEL_DOC", "TRANSPORT", "BUS", "OTHER",
] as const;

/**
 * GET /documents — list all documents for the authenticated user
 */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, documents });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /documents — create a new document (with optional image upload)
 */
export const createDocument = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { type, title, subtitle, date, endDate, referenceNumber, notes } = req.body;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    // Upload image to R2 if provided
    let imageUrl: string | null = null;
    if (req.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
        });
      }

      const ext = req.file.mimetype.split("/")[1];
      const key = `documents/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      imageUrl = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type,
        title: title.trim(),
        subtitle: subtitle?.trim() || "",
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        referenceNumber: referenceNumber?.trim() || null,
        notes: notes?.trim() || null,
        imageUrl,
      },
    });

    res.status(201).json({ success: true, message: "Document created", document });
  } catch (error) {
    console.error("[Document] Create failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create document",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PATCH /documents/:id — update a document
 */
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = req.params.id as string;
    const { type, title, subtitle, date, endDate, referenceNumber, notes } = req.body;

    // Verify ownership
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    // Build update data
    const updateData: any = {};
    if (type && VALID_TYPES.includes(type)) updateData.type = type;
    if (title !== undefined) updateData.title = title.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Handle image upload if new file provided
    if (req.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
        });
      }

      // Delete old image
      if (existing.imageUrl) {
        const oldKey = getKeyFromUrl(existing.imageUrl);
        if (oldKey) {
          try { await deleteFromR2(oldKey); } catch {}
        }
      }

      const ext = req.file.mimetype.split("/")[1];
      const key = `documents/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      updateData.imageUrl = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, message: "Document updated", document });
  } catch (error) {
    console.error("[Document] Update failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update document",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * DELETE /documents/:id — delete a document and its R2 image
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = req.params.id as string;

    // Verify ownership
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    // Delete image from R2
    if (existing.imageUrl) {
      const key = getKeyFromUrl(existing.imageUrl);
      if (key) {
        try { await deleteFromR2(key); } catch {}
      }
    }

    await prisma.document.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("[Document] Delete failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /documents/:id/upload-image — upload/replace image for an existing document
 */
export const uploadDocumentImage = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = req.params.id as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    // Verify ownership
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
      });
    }

    // Delete old image
    if (existing.imageUrl) {
      const oldKey = getKeyFromUrl(existing.imageUrl);
      if (oldKey) {
        try { await deleteFromR2(oldKey); } catch {}
      }
    }

    const ext = file.mimetype.split("/")[1];
    const key = `documents/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const imageUrl = await uploadToR2(file.buffer, key, file.mimetype);

    const document = await prisma.document.update({
      where: { id },
      data: { imageUrl },
    });

    res.status(200).json({ success: true, message: "Image uploaded", imageUrl: document.imageUrl });
  } catch (error) {
    console.error("[Document] Image upload failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload document image",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
