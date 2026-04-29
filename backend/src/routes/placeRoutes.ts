import { RequestHandler, Router } from "express";
import {
  getAllPlaces,
  addPlaceFromGoogleMapsToDb,
  getSavedPlaces,
  updatePlaceStatus,
  getNearbyPlaces,
  savePlace,
} from "../controllers/placesController.js";

const router = Router();

// Note: Authentication is applied at the app level in index.ts
// All routes under /places are protected
router.get("/get-all-place", getAllPlaces as unknown as RequestHandler);
router.get("/getplace", getSavedPlaces);
router.post("/addplace", addPlaceFromGoogleMapsToDb);
router.post("/save", savePlace);
router.patch("/update-status", updatePlaceStatus);
router.get("/nearby", getNearbyPlaces as unknown as RequestHandler);

export default router;
