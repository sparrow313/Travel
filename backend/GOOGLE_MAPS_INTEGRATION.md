# Google Maps Integration Guide

## 🗺️ Overview

Your backend now uses **Google Maps Places API** to save location data with full TypeScript type safety.

---

## 📁 File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── placesController.ts       ← Google Maps controller
│   ├── types/
│   │   └── googleMaps.ts             ← Google Maps type definitions
│   └── routes/
│       └── placeRoutes.ts            ← Routes
└── prisma/
    └── schema.prisma                 ← Database schema
```

---

## 🎯 How It Works

### 1. Frontend sends Google Place data

```typescript
POST /api/places/addplace

Body:
{
  "place": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Buddy's Bar and Grill",
    "formatted_address": "2255 Sukhumvit Rd, Bangkok, 10260, Thailand",
    "geometry": {
      "location": {
        "lat": 13.7563,
        "lng": 100.5018
      }
    },
    "types": ["bar", "restaurant", "food"],
    "rating": 4.5,
    "user_ratings_total": 1234
  }
}
```

### 2. Backend validates and saves

The controller:
- ✅ Validates the place data
- ✅ Checks if place already exists (by `place_id`)
- ✅ Saves to `Place` table (id, placeId, lat, lng)
- ✅ Saves rich data to `GooglePlaceCache` table
- ✅ Returns the created place

---

## 📊 Database Schema

### Place Table (Core Data)
```prisma
model Place {
  id      String @id @default(cuid())
  placeId String @unique              // Google Place ID
  lat     Float                        // Latitude
  lng     Float                        // Longitude
  
  cache GooglePlaceCache?
  saves UserSavedPlace[]
}
```

### GooglePlaceCache Table (Rich Data)
```prisma
model GooglePlaceCache {
  id String @id @default(cuid())
  
  placeId          String  @unique
  formattedAddress String?
  addressJson      Json?    // All Google Places data
  types            Json?    // Place types
  plusCode         String?
  viewport         Json?
  
  fetchedAt DateTime @default(now())
  place     Place    @relation(...)
}
```

**Why separate tables?**
- `Place`: Permanent data (place_id, coordinates)
- `GooglePlaceCache`: Temporary cache (30-day rule compliance)

---

## 🔐 Google Maps API Compliance

### The 30-Day Rule

According to Google's Terms of Service:
- ✅ **Can store**: `place_id` indefinitely
- ⚠️ **Can cache**: Coordinates, address, etc. for **30 days max**
- ❌ **Cannot store**: Permanently without refreshing

### Implementation Strategy

1. **Store `place_id` forever** in `Place.placeId`
2. **Cache rich data** in `GooglePlaceCache` with `fetchedAt` timestamp
3. **Set up cron job** to delete cache older than 30 days
4. **Re-fetch on demand** using `place_id` when cache is stale

---

## 🎨 TypeScript Types Explained

### GooglePlace Interface

```typescript
interface GooglePlace {
  place_id: string;              // Required - unique ID
  name: string;                  // Required - place name
  geometry: GoogleMapsGeometry;  // Required - coordinates
  
  // Optional rich data
  formatted_address?: string;
  types?: string[];
  rating?: number;
  opening_hours?: GoogleOpeningHours;
  photos?: GooglePlacePhoto[];
  // ... and more
}
```

### Request Body Type

```typescript
interface GooglePlaceRequestBody {
  place: GooglePlace;
}
```

### Usage in Controller

```typescript
export const getPlaceFromGoogleMaps = async (
  req: Request<{}, {}, GooglePlaceRequestBody>, // ← Typed!
  res: Response,
) => {
  const place: GooglePlace = req.body.place;
  // TypeScript knows all properties!
}
```

---

## 🧪 Testing the Endpoint

### Using Postman/Thunder Client

**Endpoint:** `POST http://localhost:3000/api/places/addplace`

**Headers:**
```
Content-Type: application/json
```

**Body (Minimal):**
```json
{
  "place": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Test Restaurant",
    "geometry": {
      "location": {
        "lat": 13.7563,
        "lng": 100.5018
      }
    }
  }
}
```

**Body (Full Example):**
```json
{
  "place": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Buddy's Bar and Grill",
    "formatted_address": "2255 Sukhumvit Rd, Bangkok, 10260, Thailand",
    "geometry": {
      "location": {
        "lat": 13.7563,
        "lng": 100.5018
      },
      "viewport": {
        "northeast": { "lat": 13.7576, "lng": 100.5031 },
        "southwest": { "lat": 13.7550, "lng": 100.5005 }
      }
    },
    "types": ["bar", "restaurant", "food", "point_of_interest"],
    "rating": 4.5,
    "user_ratings_total": 1234,
    "price_level": 2,
    "formatted_phone_number": "+66 2 123 4567",
    "website": "https://example.com",
    "opening_hours": {
      "open_now": true,
      "weekday_text": [
        "Monday: 11:00 AM – 11:00 PM",
        "Tuesday: 11:00 AM – 11:00 PM"
      ]
    }
  }
}
```

---

## ✅ Success Response

```json
{
  "success": true,
  "message": "Place created successfully from Google Maps",
  "data": {
    "id": "clx123abc",
    "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "lat": 13.7563,
    "lng": 100.5018,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "cache": {
      "id": "clx456def",
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "formattedAddress": "2255 Sukhumvit Rd, Bangkok, 10260, Thailand",
      "addressJson": { /* full place data */ },
      "types": ["bar", "restaurant"],
      "fetchedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## ❌ Error Responses

### Missing place data
```json
{
  "success": false,
  "message": "Place data is required in request body"
}
```

### Missing place_id
```json
{
  "success": false,
  "message": "Google Place ID is required"
}
```

### Place already exists
```json
{
  "success": true,
  "message": "Place already exists",
  "data": { /* existing place */ }
}
```

---

## 🚀 Next Steps

1. **Test the endpoint** with real Google Places data
2. **Implement cron job** for 30-day cache cleanup
3. **Add place refresh endpoint** to update stale cache
4. **Add user authentication** to protect endpoints
5. **Implement place search** using Google Places API

