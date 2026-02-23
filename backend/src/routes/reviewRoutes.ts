import { Router, RequestHandler } from "express";
import {
  createOrUpdateReview,
  getReviewsForPlace,
  getReviewsForSavedPlaces,
  deleteReview,
} from "../controllers/reviewController.js";
import { isAuthenticated } from "../helper/helper.js";

const router = Router();

// Get reviews for all saved places (requires authentication)
router.get("/my-saved-places", isAuthenticated, getReviewsForSavedPlaces);

// Get all reviews for a specific place (public)
router.get("/:placeId", getReviewsForPlace as unknown as RequestHandler);

// Create or update a review for a place (requires authentication)
router.post(
  "/:placeId",
  isAuthenticated,
  createOrUpdateReview as unknown as RequestHandler,
);

// Delete a review (requires authentication)
router.delete(
  "/:placeId",
  isAuthenticated,
  deleteReview as unknown as RequestHandler,
);

export default router;
