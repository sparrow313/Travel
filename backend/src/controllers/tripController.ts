import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

/**
 * Create a new trip
 * POST /trips
 */
export const createTrip = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { name, city, Country } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Trip name is required",
      });
    }

    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        name: name.trim(),
        city: city?.trim() || null,
        Country: Country?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create trip",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all trips for the authenticated user
 * GET /trips
 */
export const getUserTrips = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const trips = await prisma.trip.findMany({
      where: {
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            savedPlaces: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
    });
  }
};

/**
 * Get a single trip by ID with all its places
 * GET /trips/:id
 */
export const getTripById = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        savedPlaces: {
          include: {
            place: {
              include: {
                cache: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check if the trip belongs to the user
    if (trip.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this trip",
      });
    }

    return res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
    });
  }
};

/**
 * Update a trip
 * PATCH /trips/:id
 */
export const updateTrip = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { id } = req.params;
    const { name, city, Country } = req.body;

    // Check if trip exists and belongs to user
    const existingTrip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (existingTrip.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this trip",
      });
    }

    // Build update data
    const updateData: {
      name?: string;
      city?: string | null;
      Country?: string | null;
    } = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Trip name cannot be empty",
        });
      }
      updateData.name = name.trim();
    }

    if (city !== undefined) {
      updateData.city = city?.trim() || null;
    }

    if (Country !== undefined) {
      updateData.Country = Country?.trim() || null;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("Error updating trip:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update trip",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete a trip
 * DELETE /trips/:id
 */
export const deleteTrip = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { id } = req.params;

    // Check if trip exists and belongs to user
    const existingTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            savedPlaces: true,
          },
        },
      },
    });

    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (existingTrip.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this trip",
      });
    }

    // Delete the trip (cascade will delete associated saved places)
    await prisma.trip.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
      data: {
        deletedPlacesCount: existingTrip._count.savedPlaces,
      },
    });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete trip",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
