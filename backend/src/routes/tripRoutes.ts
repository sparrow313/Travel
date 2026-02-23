import { Router, RequestHandler } from "express";
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
} from "../controllers/tripController.js";
import { isAuthenticated } from "../helper/helper.js";

const router = Router();

// All trip routes require authentication
router.use(isAuthenticated);

// Create a new trip
router.post("/", createTrip as unknown as RequestHandler);

// Get all trips for the authenticated user
router.get("/", getUserTrips as unknown as RequestHandler);

// Get a single trip by ID with all its places
router.get("/:id", getTripById as unknown as RequestHandler);

// Update a trip
router.patch("/:id", updateTrip as unknown as RequestHandler);

// Delete a trip
router.delete("/:id", deleteTrip as unknown as RequestHandler);

export default router;

