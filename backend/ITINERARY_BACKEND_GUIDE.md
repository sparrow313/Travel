# Backend Integration Guide - Itinerary Feature

## Database Schema Updates

### 1. Update Trip Model

Add new fields to the `Trip` model in `prisma/schema.prisma`:

```prisma
model Trip {
  id          String   @id @default(cuid())
  userId      Int
  name        String
  city        String?
  Country     String?
  startDate   DateTime?  // NEW
  endDate     DateTime?  // NEW
  hasItinerary Boolean  @default(false)  // NEW
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  savedPlaces UserSavedPlace[]
  
  @@index([userId])
}
```

### 2. Update UserSavedPlace Model

Add day assignment field:

```prisma
model UserSavedPlace {
  id         String   @id @default(cuid())
  userId     Int
  placeId    String
  tripId     String
  status     SavedPlaceStatus @default(WISHLIST)
  userNotes  String?
  visitedAt  DateTime?
  dayNumber  Int?     // NEW - which day in the itinerary (1, 2, 3, etc.)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user       User     @relation(fields: [userId], references: [id])
  place      Place    @relation(fields: [placeId], references: [placeId])
  trip       Trip     @relation(fields: [tripId], references: [id])
  
  @@unique([userId, placeId, tripId])
  @@index([userId])
  @@index([tripId])
  @@index([placeId])
}
```

### 3. Migration Command

```bash
npx prisma migrate dev --name add_itinerary_fields
```

## API Endpoints

### 1. Create Trip (Enhanced)

**Endpoint:** `POST /api/trips`

**Request Body:**
```typescript
{
  name: string;
  city?: string;
  country?: string;
  startDate?: string;  // ISO date string
  endDate?: string;    // ISO date string
  hasItinerary?: boolean;
}
```

**Validation:**
- If `hasItinerary` is true, `startDate` and `endDate` are required
- `endDate` must be after `startDate`
- Maximum trip duration: 30 days (configurable)

**Controller Implementation:**
```typescript
// backend/src/controllers/tripController.ts

export const createTrip = async (req: Request, res: Response) => {
  try {
    const { name, city, country, startDate, endDate, hasItinerary } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: "Trip name is required" });
    }

    if (hasItinerary) {
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: "Start and end dates are required for itinerary trips" 
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      if (end <= start) {
        return res.status(400).json({ 
          error: "End date must be after start date" 
        });
      }

      // Check max duration (30 days)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        return res.status(400).json({ 
          error: "Trip duration cannot exceed 30 days" 
        });
      }
    }

    // Create trip
    const trip = await prisma.trip.create({
      data: {
        userId,
        name: name.trim(),
        city: city?.trim() || null,
        Country: country?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        hasItinerary: hasItinerary || false,
      },
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

    res.status(201).json(trip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};
```

### 2. Update Trip

**Endpoint:** `PATCH /api/trips/:tripId`

**Request Body:**
```typescript
{
  name?: string;
  city?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  hasItinerary?: boolean;
}
```

**Controller Implementation:**
```typescript
export const updateTrip = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Validate dates if provided
    if (updates.startDate || updates.endDate) {
      const start = new Date(updates.startDate || trip.startDate!);
      const end = new Date(updates.endDate || trip.endDate!);

      if (end <= start) {
        return res.status(400).json({ 
          error: "End date must be after start date" 
        });
      }
    }

    // If disabling itinerary, clear all dayNumber assignments
    if (updates.hasItinerary === false && trip.hasItinerary) {
      await prisma.userSavedPlace.updateMany({
        where: { tripId },
        data: { dayNumber: null },
      });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.city !== undefined && { city: updates.city?.trim() || null }),
        ...(updates.country !== undefined && { Country: updates.country?.trim() || null }),
        ...(updates.startDate && { startDate: new Date(updates.startDate) }),
        ...(updates.endDate && { endDate: new Date(updates.endDate) }),
        ...(updates.hasItinerary !== undefined && { hasItinerary: updates.hasItinerary }),
      },
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

    res.json(updatedTrip);
  } catch (error) {
    console.error("Error updating trip:", error);
    res.status(500).json({ error: "Failed to update trip" });
  }
};
```

### 3. Assign Place to Day

**Endpoint:** `PATCH /api/saved-places/:savedPlaceId/day`

**Request Body:**
```typescript
{
  dayNumber: number | null;  // null to unassign
}
```

**Controller Implementation:**
```typescript
export const assignPlaceToDay = async (req: Request, res: Response) => {
  try {
    const { savedPlaceId } = req.params;
    const { dayNumber } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const savedPlace = await prisma.userSavedPlace.findFirst({
      where: { id: savedPlaceId, userId },
      include: { trip: true },
    });

    if (!savedPlace) {
      return res.status(404).json({ error: "Saved place not found" });
    }

    // Validate trip has itinerary
    if (!savedPlace.trip.hasItinerary) {
      return res.status(400).json({ 
        error: "Trip does not have itinerary enabled" 
      });
    }

    // Validate day number
    if (dayNumber !== null) {
      const start = savedPlace.trip.startDate!;
      const end = savedPlace.trip.endDate!;
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (dayNumber < 1 || dayNumber > totalDays) {
        return res.status(400).json({ 
          error: `Day number must be between 1 and ${totalDays}` 
        });
      }
    }

    const updated = await prisma.userSavedPlace.update({
      where: { id: savedPlaceId },
      data: { dayNumber },
      include: {
        place: {
          include: {
            cache: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error assigning place to day:", error);
    res.status(500).json({ error: "Failed to assign place to day" });
  }
};
```

### 4. Reorder Places in Day

**Endpoint:** `PATCH /api/trips/:tripId/itinerary/reorder`

**Request Body:**
```typescript
{
  dayNumber: number;
  placeIds: string[];  // ordered array of savedPlace IDs
}
```

**Implementation Note:**
This requires adding an `orderIndex` field to `UserSavedPlace` model:

```prisma
model UserSavedPlace {
  // ... existing fields
  dayNumber  Int?
  orderIndex Int?  // NEW - order within the day
}
```

**Controller Implementation:**
```typescript
export const reorderDayPlaces = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { dayNumber, placeIds } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (!trip.hasItinerary) {
      return res.status(400).json({ 
        error: "Trip does not have itinerary enabled" 
      });
    }

    // Update order indices in a transaction
    await prisma.$transaction(
      placeIds.map((placeId, index) =>
        prisma.userSavedPlace.updateMany({
          where: {
            id: placeId,
            tripId,
            userId,
            dayNumber,
          },
          data: {
            orderIndex: index,
          },
        })
      )
    );

    // Return updated trip
    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        savedPlaces: {
          include: {
            place: {
              include: {
                cache: true,
              },
            },
          },
          orderBy: [
            { dayNumber: 'asc' },
            { orderIndex: 'asc' },
          ],
        },
      },
    });

    res.json(updatedTrip);
  } catch (error) {
    console.error("Error reordering places:", error);
    res.status(500).json({ error: "Failed to reorder places" });
  }
};
```

## Route Registration

Add routes to `backend/src/routes/tripRoutes.ts`:

```typescript
import express from "express";
import { authenticate } from "../middleware/auth";
import {
  createTrip,
  updateTrip,
  assignPlaceToDay,
  reorderDayPlaces,
} from "../controllers/tripController";

const router = express.Router();

router.post("/", authenticate, createTrip);
router.patch("/:tripId", authenticate, updateTrip);
router.patch("/:tripId/itinerary/reorder", authenticate, reorderDayPlaces);

export default router;
```

Add routes to `backend/src/routes/savedPlaceRoutes.ts`:

```typescript
router.patch("/:savedPlaceId/day", authenticate, assignPlaceToDay);
```

## Response Types

### Trip Response
```typescript
{
  id: string;
  userId: number;
  name: string;
  city: string | null;
  Country: string | null;
  startDate: string | null;  // ISO string
  endDate: string | null;    // ISO string
  hasItinerary: boolean;
  createdAt: string;
  updatedAt: string;
  savedPlaces: SavedPlace[];
}
```

### SavedPlace Response
```typescript
{
  id: string;
  userId: number;
  placeId: string;
  tripId: string;
  status: "WISHLIST" | "VISITED" | "SKIPPED";
  userNotes: string | null;
  visitedAt: string | null;
  dayNumber: number | null;
  orderIndex: number | null;
  createdAt: string;
  updatedAt: string;
  place: {
    id: string;
    placeId: string;
    cache: {
      lat: number;
      lng: number;
      fetchedAt: string;
    } | null;
  };
}
```

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "End date must be after start date"
}
```

**404 Not Found:**
```json
{
  "error": "Trip not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create trip"
}
```

## Testing

### Test Cases

1. **Create trip without itinerary**
   - Dates optional
   - hasItinerary defaults to false

2. **Create trip with itinerary**
   - Dates required
   - Validates date range
   - Validates max duration

3. **Update trip to enable itinerary**
   - Requires dates
   - Existing places remain unassigned

4. **Update trip to disable itinerary**
   - Clears all dayNumber assignments
   - Preserves places

5. **Assign place to day**
   - Validates trip has itinerary
   - Validates day number in range
   - Allows null to unassign

6. **Reorder places**
   - Updates orderIndex for all places
   - Maintains day assignment
   - Transaction ensures consistency

## Performance Considerations

1. **Indexing:**
   - Add index on `dayNumber` for faster queries
   - Add composite index on `(tripId, dayNumber, orderIndex)`

2. **Query Optimization:**
   - Use `include` to fetch related data in single query
   - Order by `dayNumber` and `orderIndex` at database level

3. **Caching:**
   - Cache trip data with itinerary
   - Invalidate on place assignment changes

## Security

1. **Authorization:**
   - Always verify userId matches authenticated user
   - Check trip ownership before modifications

2. **Validation:**
   - Sanitize all string inputs
   - Validate date formats
   - Enforce business rules (max duration, valid day numbers)

3. **Rate Limiting:**
   - Limit trip creation (e.g., 10 per hour)
   - Limit reorder operations (e.g., 30 per minute)
