import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { GooglePlaceRequestBody, GooglePlace } from "../types/googleMaps.js";
import { Status } from "../../generated/prisma/enums.js";

/**
 * Combined endpoint: Create/Find place from Google Maps AND save to user's saved places
 *
 * This function:
 * 1. Receives Google Places API data from the request body
 * 2. Creates the place if it doesn't exist (or finds existing)
 * 3. Saves the place to the user's saved places with status
 */
export const addPlaceFromGoogleMapsToDb = async (
  req: Request<
    {},
    {},
    GooglePlaceRequestBody & {
      status?: Status;
      userNotes?: string;
      trip_id?: string;
    }
  >,
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

    const data = req.body;

    // Validate that we have place data
    if (!data.place) {
      return res.status(400).json({
        success: false,
        message: "Place data is required in request body",
      });
    }

    const place: GooglePlace = data.place;

    // Validate required fields
    if (!place.place_id) {
      return res.status(400).json({
        success: false,
        message: "Google Place ID is required",
      });
    }

    if (!place.geometry?.location) {
      return res.status(400).json({
        success: false,
        message: "Place coordinates (geometry.location) are required",
      });
    }

    // Extract coordinates
    const latitude = place.geometry.location.lat;
    const longitude = place.geometry.location.lng;

    // Extract optional status and userNotes from request body
    const status = data.status || Status.WISHLIST;
    const userNotes = data.userNotes;

    // Get or create trip
    let tripId = data.trip_id;

    if (!tripId) {
      // Auto-create or find default trip for the user
      let defaultTrip = await prisma.trip.findFirst({
        where: {
          userId: user.id,
          name: "My Trip",
        },
      });

      if (!defaultTrip) {
        defaultTrip = await prisma.trip.create({
          data: {
            userId: user.id,
            name: "My Trip",
          },
        });
      }

      tripId = defaultTrip.id;
    } else {
      // Validate that the provided trip exists and belongs to the user
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (trip.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to add places to this trip",
        });
      }
    }

    // Check if place already exists
    let existingPlace = await prisma.place.findUnique({
      where: { placeId: place.place_id },
      include: { cache: true },
    });

    // If place doesn't exist, create it
    if (!existingPlace) {
      existingPlace = await prisma.place.create({
        data: {
          placeId: place.place_id,
          lat: latitude,
          lng: longitude,
          cache: {
            create: {
              formattedAddress: place.formatted_address,
              addressJson: place as any,
              types: place.types ? (place.types as any) : undefined,
              plusCode: place.plus_code ? (place.plus_code as any) : undefined,
              viewport: place.geometry?.viewport
                ? (place.geometry.viewport as any)
                : undefined,
            },
          },
        },
        include: {
          cache: true,
        },
      });
    }

    // Check if user has already saved this place
    const existingSavedPlace = await prisma.userSavedPlace.findUnique({
      where: {
        userId_placeId: {
          userId: user.id,
          placeId: place.place_id,
        },
      },
    });

    if (existingSavedPlace) {
      return res.status(400).json({
        success: false,
        message: "You have already saved this place",
        data: existingSavedPlace,
      });
    }

    // Save the place to user's saved places
    const savedPlace = await prisma.userSavedPlace.create({
      data: {
        userId: user.id,
        placeId: place.place_id,
        tripId: tripId,
        status: status,
        userNotes: userNotes,

        // Set visitedAt if status is VISITED
        visitedAt: status === Status.VISITED ? new Date() : null,
      },
      include: {
        place: {
          include: {
            cache: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Place created and saved successfully",
      data: savedPlace,
    });
  } catch (error) {
    console.error("Error adding place and saving:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add and save place",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getSavedPlaces = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const savedPlaces = await prisma.userSavedPlace.findMany({
      where: {
        userId: user.id,
      },
      include: {
        place: {
          include: {
            cache: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: savedPlaces,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved places",
    });
  }
};

export const getAllPlaces = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const savedPlaces = await prisma.place.findMany({
      include: { cache: true },
    });

    return res.status(200).json({
      success: true,
      data: savedPlaces,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved places",
    });
  }
};

export const updatePlaceStatus = async (
  req: Request<{ place_id: string; status?: Status; userNotes?: string }>,
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

    const { place_id, status, userNotes } = req.body;

    // Build update data
    const updateData: {
      status?: Status;
      userNotes?: string;
      visitedAt?: Date | null;
    } = {};

    if (status !== undefined) {
      updateData.status = status;
      // Automatically set visitedAt when status changes to VISITED
      if (status === Status.VISITED) {
        updateData.visitedAt = new Date();
      } else {
        // Clear visitedAt if status changes away from VISITED
        updateData.visitedAt = null;
      }
    }

    if (userNotes !== undefined) {
      updateData.userNotes = userNotes;
    }

    const updatedPlace = await prisma.userSavedPlace.update({
      where: {
        userId_placeId: {
          userId: user.id,
          placeId: place_id,
        },
      },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Place status updated successfully",
      data: updatedPlace,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update place status",
    });
  }
};
