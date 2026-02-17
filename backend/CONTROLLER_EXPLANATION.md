# Places Controller - Complete Explanation

## What We Built

A TypeScript controller that receives **Google Maps/Places API** data and saves it to your database with proper type safety.

---

## File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── placesController.ts    ← Main controller
│   └── types/
│       └── googleMaps.ts           ← Type definitions
└── prisma/
    └── schema.prisma               ← Database schema
```

---

## How Types Work in This Controller

### 1. **Request Body Type** (`GooglePlaceRequestBody`)

```typescript
export const getPlaceFromGoogleMaps = async (
  req: Request<{}, {}, GooglePlaceRequestBody>, // ← Typed request body
  res: Response,
) => {
```

**What this does:**

- Tells TypeScript that `req.body` has the shape of `GooglePlaceRequestBody`
- Provides autocomplete when you type `req.body.`
- Catches errors if you try to access properties that don't exist

**The generic parameters:**

- `Request<Params, ResBody, ReqBody, Query>`
- We only care about `ReqBody`, so we use `{}` for the others

---

### 2. **Extracting Typed Data**

```typescript
const data: GooglePlaceRequestBody = req.body;
const place: GooglePlace = data.place;
```

**Why we do this:**

- `data` is now typed as `GooglePlaceRequestBody`
- `place` is typed as `GooglePlace`
- TypeScript knows all available properties

---

### 3. **Type Validation at Runtime**

```typescript
// Validate that we have place data
if (!data.place) {
  return res.status(400).json({
    success: false,
    message: "Place data is required in request body",
  });
}
```

**Important:** TypeScript types only exist at compile time. You still need runtime validation!

---

### 4. **Optional Chaining with Types**

```typescript
// Extract coordinates safely
if (!place.geometry?.location) {
  // ↑ The ? means "only access if geometry exists"
  return res.status(400).json({
    success: false,
    message: "Place coordinates are required",
  });
}

const latitude = place.geometry.location.lat;
const longitude = place.geometry.location.lng;
```

**The `?.` operator:**

- Returns `undefined` if the property doesn't exist
- Prevents "Cannot read property of undefined" errors
- Works because we defined `geometry?` as optional in our type

---

## Database Schema Mapping

### Your Prisma Schema

```prisma
model Place {
  id      String @id @default(cuid())
  placeId String @unique
  lat     Float
  lng     Float

  cache GooglePlaceCache?
  saves UserSavedPlace[]
}

model GooglePlaceCache {
  id String @id @default(cuid())

  placeId          String  @unique
  formattedAddress String?
  addressJson      Json?
  types            Json?

  place Place @relation(fields: [placeId], references: [placeId])
}
```

### How We Map Google Places Data to Database

```typescript
const place = await prisma.place.create({
  data: {
    placeId: place.place_id, // Google Place ID → placeId
    lat: latitude, // Extracted → lat
    lng: longitude, // Extracted → lng

    cache: {
      // Nested create
      create: {
        formattedAddress: place.formatted_address,
        addressJson: {
          /* all Google Places data */
        },
        types: place.types,
        plusCode: place.plus_code?.global_code,
        viewport: place.geometry.viewport,
      },
    },
  },
});
```

---

## Key TypeScript Concepts Used

### 1. **Interface Definition**

```typescript
export interface GooglePlace {
  place_id: string; // Required - Google Place ID
  name: string; // Required
  geometry: {
    // Required object
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address?: string; // Optional
  types?: string[]; // Optional array
}
```

### 2. **Type Narrowing**

```typescript
if (suggestion.coordinates) {
  // TypeScript knows coordinates exists here
  latitude = suggestion.coordinates.latitude; ✅
}
// TypeScript knows coordinates might not exist here
latitude = suggestion.coordinates.latitude; ❌ Error!
```

### 3. **Union Types**

```typescript
let value: string | undefined;
value = "hello"; // ✅
value = undefined; // ✅
value = 123; // ❌ Error!
```

### 4. **Type Assertions (as any)**

```typescript
addressJson: suggestion.context
  ? ({
      name: suggestion.name,
      context: suggestion.context,
    } as any)  // ← Tell TypeScript to trust us
  : undefined,
```

**When to use `as any`:**

- When working with JSON fields in Prisma
- When you know the type is correct but TypeScript can't infer it
- Use sparingly! It bypasses type checking

---

## Flow of the Controller

```
1. Request comes in with Mapbox data
   ↓
2. TypeScript validates the shape (compile time)
   ↓
3. Runtime validation (check if data exists)
   ↓
4. Extract and transform data
   ↓
5. Check if place already exists
   ↓
6. Create place with nested cache data
   ↓
7. Return success response
```

---

## Error Handling

### Three Types of Responses

**1. Validation Error (400)**

```typescript
return res.status(400).json({
  success: false,
  message: "No suggestions provided",
});
```

**2. Success (201 or 200)**

```typescript
return res.status(201).json({
  success: true,
  message: "Place created successfully",
  data: place,
});
```

**3. Server Error (500)**

```typescript
return res.status(500).json({
  success: false,
  message: "Failed to create place",
  error: error instanceof Error ? error.message : "Unknown error",
});
```

---

## Testing the Controller

### Example Request Body

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
        "southwest": { "lat": 13.755, "lng": 100.5005 }
      }
    },
    "types": ["bar", "restaurant", "food", "point_of_interest"],
    "rating": 4.5,
    "user_ratings_total": 1234,
    "price_level": 2,
    "formatted_phone_number": "+66 2 123 4567",
    "website": "https://buddysbar.com",
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

## Next Steps

1. **Test the endpoint** with Postman or your frontend
2. **Add more validation** if needed
3. **Consider adding** a function to handle multiple suggestions
4. **Add authentication** to protect the endpoint
5. **Write unit tests** for the controller
