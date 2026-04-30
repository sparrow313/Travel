import { Router } from "express";
import multer from "multer";
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentImage,
} from "../controllers/documentController";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
});

router.get("/", getDocuments);
router.post("/", upload.single("image"), createDocument);
router.patch("/:id", upload.single("image"), updateDocument);
router.delete("/:id", deleteDocument);
router.post("/:id/upload-image", upload.single("image"), uploadDocumentImage);

export default router;
