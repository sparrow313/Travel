import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { GooglePlaceRequestBody, GooglePlace } from "../types/googleMaps.js";

/**
 * Controller to create a place from Google Maps/Places data
 *
 * This function:
 * 1. Receives Google Places API data from the request body
 * 2. Extracts the place information
 * 3. Maps Google Places fields to our database schema
 * 4. Creates a new place in the database with cache data
 */
export const getPlaceFromGoogleMaps = async (
  req: Request<{}, {}, GooglePlaceRequestBody>, // Request with typed body
  res: Response,
) => {
  try {
    // Type the request body for better autocomplete and type safety
    const data: GooglePlaceRequestBody = req.body;

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

    // Check if place already exists
    const existingPlace = await prisma.place.findUnique({
      where: { placeId: place.place_id },
      include: { cache: true },
    });

    if (existingPlace) {
      return res.status(200).json({
        success: true,
        message: "Place already exists",
        data: existingPlace,
      });
    }

    // Create the place in database with Google Places data
    const newPlace = await prisma.place.create({
      data: {
        placeId: place.place_id, // Google Place ID as unique identifier
        lat: latitude,
        lng: longitude,

        // Create cache data with Google Places information
        cache: {
          create: {
            formattedAddress: place.formatted_address || undefined,
            addressJson: {
              name: place.name,
              formatted_address: place.formatted_address,
              address_components: place.address_components,
              vicinity: place.vicinity,
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
              price_level: place.price_level,
              opening_hours: place.opening_hours,
              website: place.website,
              url: place.url,
              phone: place.formatted_phone_number,
              international_phone: place.international_phone_number,
              business_status: place.business_status,
            } as any,
            types: place.types ? (place.types as any) : undefined,
            plusCode: place.plus_code?.global_code || undefined,
            viewport: place.geometry.viewport
              ? (place.geometry.viewport as any)
              : undefined,
          },
        },
      },
      include: {
        cache: true, // Include cache in response
      },
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Place created successfully from Google Maps",
      data: newPlace,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error creating place from Google Maps:", error);

    // Return error response
    return res.status(500).json({
      success: false,
      message: "Failed to create place",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Keep the old name as an alias for backward compatibility
export const getPlaceFromMapbox = getPlaceFromGoogleMaps;
