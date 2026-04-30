import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAccessToken,
  logoutUser,
  deleteAccount,
} from "../controllers/userController";
import { googleAuth } from "../controllers/googleAuthController";
import { isAuthenticated } from "../helper/helper";
const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/google", googleAuth);
router.post("/refreshtoken", getAccessToken);
router.post("/logout", isAuthenticated, logoutUser);
router.delete("/account", isAuthenticated, deleteAccount);

export default router;
