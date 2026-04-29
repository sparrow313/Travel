import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAccessToken,
  logoutUser,
} from "../controllers/userController";
import { isAuthenticated } from "../helper/helper";
const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refreshtoken", getAccessToken);
router.post("/logout", isAuthenticated, logoutUser);

export default router;
