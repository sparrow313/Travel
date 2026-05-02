import { Router } from "express";
import multer from "multer";
import { extractFromImage, extractFromText } from "../controllers/ocrController";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB (Groq base64 limit)
});

// Send image directly to Groq Vision (Llama 4 Scout) → get structured JSON
router.post("/extract-image", upload.single("image"), extractFromImage);

// Send OCR text to Groq (gpt-oss-20b) → get structured JSON (fallback)
router.post("/extract-text", extractFromText);

export default router;
