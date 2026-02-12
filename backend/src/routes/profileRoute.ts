import { Router } from "express";
import {
  createUserProfile,
  getUserProfile,
  updateProfile,
} from "../controllers/profileController";
const router = Router();

router.get("/", getUserProfile);
router.post("/createprofile", createUserProfile);
router.post("/updateprofile", updateProfile);

export default router;
