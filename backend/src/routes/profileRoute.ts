import { Router } from "express";
import multer from "multer";
import {
  createUserProfile,
  getUserProfile,
  updateProfile,
  uploadProfileImage,
} from "../controllers/profileController";

const router = Router();

// Multer config: store in memory buffer for direct R2 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Note: Authentication is applied at the app level in index.ts
// All routes under /profile are protected
router.get("/", getUserProfile);
router.post("/createprofile", createUserProfile);
router.patch("/updateprofile", updateProfile);
router.post("/upload-image", upload.single("image"), uploadProfileImage);

export default router;
