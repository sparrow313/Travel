/**
 * TypeScript types for Google Maps/Places API responses
 * These types help ensure type safety when working with Google Maps data
 */

/**
 * Google Maps Geometry - Location coordinates
 */
export interface GoogleMapsGeometry {
  location: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: {
      lat: number;
      lng: number;
    };
    southwest: {
      lat: number;
      lng: number;
    };
  };
}

/**
 * Address component from Google Places
 * Contains structured address information
 */
export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Plus Code (Open Location Code) from Google
 */
export interface GooglePlusCode {
  compound_code?: string;
  global_code: string;
}

/**
 * Opening hours from Google Places
 */
export interface GoogleOpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: {
      day: number;
      time: string;
    };
    close?: {
      day: number;
      time: string;
    };
  }>;
  weekday_text?: string[];
}

/**
 * Photo reference from Google Places
 */
export interface GooglePlacePhoto {
  height: number;
  width: number;
  photo_reference: string;
  html_attributions: string[];
}

/**
 * A single place from Google Places API
 * This represents one location result from Google
 */
export interface GooglePlace {
  place_id: string; // Unique Google Place ID (store this!)
  name: string;
  trip_id?: string;
  formatted_address?: string;
  geometry: GoogleMapsGeometry;

  // Optional fields
  address_components?: GoogleAddressComponent[];
  types?: string[]; // e.g., ["restaurant", "food", "point_of_interest"]
  plus_code?: GooglePlusCode;

  // Rich data (from Place Details API)
  formatted_phone_number?: string;
  international_phone_number?: string;
  opening_hours?: GoogleOpeningHours;
  photos?: GooglePlacePhoto[];
  rating?: number; // 1.0 to 5.0
  user_ratings_total?: number;
  price_level?: number; // 0 to 4
  website?: string;
  url?: string; // Google Maps URL
  vicinity?: string; // Simplified address
  business_status?: string; // "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY"
}

/**
 * The complete request body structure
 * This is what your API endpoint receives from the frontend
 */
export interface GooglePlaceRequestBody {
  place: GooglePlace;
}

/**
 * Alternative: If frontend sends just place_id for lookup
 */
export interface GooglePlaceIdRequestBody {
  place_id: string;
}
