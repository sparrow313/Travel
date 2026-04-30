import { Router } from "express";
import {
  getInstagramSaves,
  createInstagramSave,
  deleteInstagramSave,
} from "../controllers/instagramController";

const router = Router();

router.get("/", getInstagramSaves);
router.post("/", createInstagramSave);
router.delete("/:id", deleteInstagramSave);

export default router;
