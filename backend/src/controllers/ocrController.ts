import { Request, Response } from "express";
import { extractDocumentFromImage, extractDocumentFromText } from "../utils/groq.js";

/**
 * POST /ocr/extract-image — Accepts an image file upload, sends it to Groq Vision (Llama 4 Scout),
 * and returns structured document fields as JSON.
 *
 * Body: multipart/form-data with "image" file field + optional "documentTypeHint" text field
 * Returns: { success: true, extracted: { title, subtitle, date, endDate, referenceNumber, notes, type } }
 *
 * NOTE: PASSPORT and VISA types are blocked from AI extraction for privacy reasons.
 */
export const extractFromImage = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const documentTypeHint = req.body.documentTypeHint as string | undefined;

    // Block AI extraction for sensitive document types
    const SENSITIVE_TYPES = ["PASSPORT", "VISA"];
    if (documentTypeHint && SENSITIVE_TYPES.includes(documentTypeHint.toUpperCase())) {
      return res.status(403).json({
        success: false,
        message: "Passport and visa documents cannot be processed by AI for privacy reasons. Please save the image directly.",
      });
    }

    const file = req.file;
    console.log("[OCR Extract Image] Received file:", file ? `${file.originalname} (${file.size} bytes, ${file.mimetype})` : "none");

    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
      });
    }

    // Max 4MB for base64 (Groq's limit for base64 encoded images)
    if (file.size > 4 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image too large. Maximum 4MB for AI processing.",
      });
    }

    console.log("[OCR Extract Image] Type hint:", documentTypeHint);

    // Convert buffer to base64 and send to Groq Vision
    const base64 = file.buffer.toString("base64");
    console.log("[OCR Extract Image] Base64 length:", base64.length);

    const extracted = await extractDocumentFromImage(
      { base64, mimeType: file.mimetype },
      documentTypeHint,
    );

    console.log("[OCR Extract Image] Success:", extracted.title);
    res.status(200).json({ success: true, extracted });
  } catch (error) {
    console.error("[OCR Extract Image] Failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract document fields from image",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /ocr/extract-text — Takes raw OCR text and returns structured document fields via Groq AI.
 *
 * Body: { ocrText: string, documentTypeHint?: string }
 * Returns: { success: true, extracted: { title, subtitle, date, endDate, referenceNumber, notes, type } }
 *
 * NOTE: PASSPORT and VISA types are blocked from AI extraction for privacy reasons.
 */
export const extractFromText = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { ocrText, documentTypeHint } = req.body;

    // Block AI extraction for sensitive document types
    const SENSITIVE_TYPES = ["PASSPORT", "VISA"];
    if (documentTypeHint && SENSITIVE_TYPES.includes(documentTypeHint.toUpperCase())) {
      return res.status(403).json({
        success: false,
        message: "Passport and visa documents cannot be processed by AI for privacy reasons. Please save the image directly.",
      });
    }

    if (!ocrText || typeof ocrText !== "string" || !ocrText.trim()) {
      return res.status(400).json({
        success: false,
        message: "ocrText is required and must be a non-empty string",
      });
    }

    if (ocrText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "ocrText exceeds maximum length of 5000 characters",
      });
    }

    const extracted = await extractDocumentFromText(ocrText.trim(), documentTypeHint);

    res.status(200).json({ success: true, extracted });
  } catch (error) {
    console.error("[OCR Extract Text] Failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract document fields",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
