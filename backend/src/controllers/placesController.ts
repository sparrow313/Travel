import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { GooglePlaceRequestBody, GooglePlace } from "../types/googleMaps.js";
import { Status } from "../../generated/prisma/enums.js";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

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

    const ensurePlaceAndRefreshCache = async (fetchedAt: Date) => {
      await prisma.place.upsert({
        where: { placeId: place.place_id },
        update: {},
        create: {
          placeId: place.place_id,
        },
      });

      await prisma.googlePlaceCache.upsert({
        where: { placeId: place.place_id },
        update: {
          lat: latitude,
          lng: longitude,
          fetchedAt,
        },
        create: {
          placeId: place.place_id,
          lat: latitude,
          lng: longitude,
          fetchedAt,
        },
      });
    };

    // Prevent duplicate saves of the same place within the same trip
    const existingSavedPlace = await prisma.userSavedPlace.findFirst({
      where: {
        userId: user.id,
        placeId: place.place_id,
        tripId: tripId,
      },
    });

    if (existingSavedPlace) {
      const existingCache = await prisma.googlePlaceCache.findUnique({
        where: { placeId: place.place_id },
      });

      const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_IN_MS);
      const isCacheFresh =
        existingCache !== null && existingCache.fetchedAt >= thirtyDaysAgo;

      if (!isCacheFresh) {
        await ensurePlaceAndRefreshCache(new Date());
      }

      return res.status(400).json({
        success: false,
        message: "You have already saved this place in this trip",
        data: existingSavedPlace,
      });
    }

    await ensurePlaceAndRefreshCache(new Date());

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
  req: Request<
    {},
    {},
    { place_id: string; trip_id: string; status?: Status; userNotes?: string }
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

    const { place_id, trip_id, status, userNotes } = req.body;

    if (!place_id || !trip_id) {
      return res.status(400).json({
        success: false,
        message: "place_id and trip_id are required",
      });
    }

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

    const savedPlace = await prisma.userSavedPlace.findFirst({
      where: {
        userId: user.id,
        placeId: place_id,
        tripId: trip_id,
      },
    });

    if (!savedPlace) {
      return res.status(404).json({
        success: false,
        message: "Saved place not found for this trip",
      });
    }

    const updatedPlace = await prisma.userSavedPlace.update({
      where: {
        id: savedPlace.id,
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

/**
 * Get nearby saved places within a specified radius
 *
 * Query parameters:
 * - lat: User's current latitude
 * - lng: User's current longitude
 * - radius: Search radius in meters (default: 2000)
 * - status: Optional filter by place status (WISHLIST, VISITED, SKIPPED)
 *
 * Returns user's saved places sorted by distance (closest first)
 */
export const getNearbyPlaces = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Extract and validate query parameters
    const { lat, lng, radius, status } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude (lat) and longitude (lng) are required query parameters",
      });
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const radiusMeters = radius ? parseFloat(radius as string) : 2000; // Default 2km
    const radiusKm = radiusMeters / 1000;

    // Validate coordinates
    if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusMeters)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude, longitude, or radius values",
      });
    }

    if (userLat < -90 || userLat > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (userLng < -180 || userLng > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    if (radiusMeters <= 0) {
      return res.status(400).json({
        success: false,
        message: "Radius must be greater than 0",
      });
    }

    const validStatuses = Object.values(Status);
    if (
      status !== undefined &&
      (typeof status !== "string" || !validStatuses.includes(status as Status))
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const statusFilter = status as Status | undefined;

    // Use Prisma's raw query with Haversine formula against the temporary
    // GooglePlaceCache coordinates. Only use coordinates refreshed within 30 days.
    let nearbyPlaces: any[];

    if (statusFilter) {
      // Query with status filter
      nearbyPlaces = await prisma.$queryRaw<any[]>`
        SELECT
          usp.id,
          usp."userId",
          usp."placeId",
          usp."tripId",
          usp.status,
          usp."userNotes",
          usp."visitedAt",
          usp."createdAt",
          usp."updatedAt",
          gpc.lat,
          gpc.lng,
          (
            6371 * acos(
              cos(radians(${userLat})) * cos(radians(gpc.lat)) *
              cos(radians(gpc.lng) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(gpc.lat))
            )
          ) AS "distanceKm"
        FROM "UserSavedPlace" usp
        JOIN "GooglePlaceCache" gpc ON usp."placeId" = gpc."placeId"
        WHERE usp."userId" = ${user.id}
          AND usp.status = ${statusFilter}::"Status"
          AND gpc."fetchedAt" >= NOW() - INTERVAL '30 days'
          AND (
            6371 * acos(
              cos(radians(${userLat})) * cos(radians(gpc.lat)) *
              cos(radians(gpc.lng) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(gpc.lat))
            )
          ) <= ${radiusKm}
        ORDER BY "distanceKm" ASC
      `;
    } else {
      // Query without status filter
      nearbyPlaces = await prisma.$queryRaw<any[]>`
        SELECT
          usp.id,
          usp."userId",
          usp."placeId",
          usp."tripId",
          usp.status,
          usp."userNotes",
          usp."visitedAt",
          usp."createdAt",
          usp."updatedAt",
          gpc.lat,
          gpc.lng,
          (
            6371 * acos(
              cos(radians(${userLat})) * cos(radians(gpc.lat)) *
              cos(radians(gpc.lng) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(gpc.lat))
            )
          ) AS "distanceKm"
        FROM "UserSavedPlace" usp
        JOIN "GooglePlaceCache" gpc ON usp."placeId" = gpc."placeId"
        WHERE usp."userId" = ${user.id}
          AND gpc."fetchedAt" >= NOW() - INTERVAL '30 days'
          AND (
            6371 * acos(
              cos(radians(${userLat})) * cos(radians(gpc.lat)) *
              cos(radians(gpc.lng) - radians(${userLng})) +
              sin(radians(${userLat})) * sin(radians(gpc.lat))
            )
          ) <= ${radiusKm}
        ORDER BY "distanceKm" ASC
      `;
    }

    // Fetch additional place details (cache data) for each nearby place
    const placesWithDetails = await Promise.all(
      nearbyPlaces.map(async (savedPlace) => {
        const placeDetails = await prisma.place.findUnique({
          where: { placeId: savedPlace.placeId },
          include: {
            cache: true,
          },
        });

        return {
          ...savedPlace,
          distanceKm: Number(savedPlace.distanceKm.toFixed(2)), // Round to 2 decimal places
          distanceMeters: Math.round(Number(savedPlace.distanceKm) * 1000),
          place: placeDetails,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: `Found ${placesWithDetails.length} place(s) within ${radiusKm}km`,
      data: {
        userLocation: {
          lat: userLat,
          lng: userLng,
        },
        radius: {
          meters: radiusMeters,
          kilometers: radiusKm,
        },
        count: placesWithDetails.length,
        places: placesWithDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby places",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
