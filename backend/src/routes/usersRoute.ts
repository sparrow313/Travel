import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAccessToken,
} from "../controllers/userController";
const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refreshtoken", getAccessToken);

export default router;
