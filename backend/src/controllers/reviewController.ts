import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

interface ReviewParams {
  placeId: string;
}
/**
 * Create or update a review for a place
 * POST /api/reviews/:placeId
 */
export const createOrUpdateReview = async (
  req: Request<ReviewParams>,
  res: Response,
) => {
  try {
    const { placeId } = req.params;
    const { rating, comment } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Validate rating (1-5)
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    // Check if place exists
    const place = await prisma.place.findUnique({
      where: { placeId },
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    // Create or update review (upsert)
    const review = await prisma.review.upsert({
      where: {
        userId_placeId: {
          userId: user.id,
          placeId: placeId,
        },
      },
      update: {
        rating,
        comment,
      },
      create: {
        userId: user.id,
        placeId: placeId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: review
        ? "Review updated successfully"
        : "Review created successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error creating/updating review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create/update review",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all reviews for a place
 * GET /api/reviews/:placeId
 */
export const getReviewsForPlace = async (
  req: Request<ReviewParams>,
  res: Response,
) => {
  try {
    const { placeId } = req.params;

    // Check if place exists
    const place = await prisma.place.findUnique({
      where: { placeId },
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    // Get all reviews for this place
    const reviews = await prisma.review.findMany({
      where: { placeId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate average rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        totalReviews: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get reviews for all places the user has saved
 * GET /api/reviews/my-saved-places
 */
export const getReviewsForSavedPlaces = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get all saved places for the user
    const savedPlaces = await prisma.userSavedPlace.findMany({
      where: { userId: user.id },
      include: {
        place: {
          include: {
            reviews: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
            cache: true,
          },
        },
      },
    });

    // Format the response
    const placesWithReviews = savedPlaces.map((savedPlace) => {
      const reviews = savedPlace.place.reviews;
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length
          : 0;

      return {
        placeId: savedPlace.place.placeId,
        placeName: savedPlace.place.cache?.addressJson
          ? (savedPlace.place.cache.addressJson as any).name
          : "Unknown Place",
        userNotes: savedPlace.userNotes,
        savedAt: savedPlace.createdAt,
        reviews: reviews,
        totalReviews: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    });

    return res.status(200).json({
      success: true,
      data: placesWithReviews,
    });
  } catch (error) {
    console.error("Error fetching reviews for saved places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews for saved places",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:placeId
 */
export const deleteReview = async (
  req: Request<ReviewParams>,
  res: Response,
) => {
  try {
    const { placeId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find the review
    const review = await prisma.review.findUnique({
      where: {
        userId_placeId: {
          userId: user.id,
          placeId: placeId,
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Delete the review
    await prisma.review.delete({
      where: {
        userId_placeId: {
          userId: user.id,
          placeId: placeId,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
