import { Router } from "express";
import { getPlaceFromGoogleMaps } from "../controllers/placesController.js";

const router = Router();

// POST endpoint to add a place from Google Maps
router.post("/addplace", getPlaceFromGoogleMaps);

export default router;
