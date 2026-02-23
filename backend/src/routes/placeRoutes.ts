import { Router } from "express";
import {
  getAllPlaces,
  addPlaceFromGoogleMapsToDb,
  getSavedPlaces,
  updatePlaceStatus,
} from "../controllers/placesController.js";

const router = Router();

// Note: Authentication is applied at the app level in index.ts
// All routes under /places are protected
router.get("/get-all-place", getAllPlaces);
router.get("/getplace", getSavedPlaces);
router.post("/addplace", addPlaceFromGoogleMapsToDb);
router.patch("/update-status", updatePlaceStatus);

export default router;
