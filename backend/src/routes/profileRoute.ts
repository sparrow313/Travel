import { Router } from "express";
import {
  createUserProfile,
  getUserProfile,
  updateProfile,
} from "../controllers/profileController";

const router = Router();

// Note: Authentication is applied at the app level in index.ts
// All routes under /profile are protected
router.get("/", getUserProfile);
router.post("/createprofile", createUserProfile);
router.patch("/updateprofile", updateProfile);

export default router;
