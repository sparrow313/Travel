# TypeScript Types - Visual Guide

## 📦 What We Created

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend/Client                       │
│  Sends JSON with Mapbox place data                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Express Request Handler                     │
│  req: Request<{}, {}, MapboxRequestBody>                │
│                                                          │
│  TypeScript knows:                                       │
│  • req.body.suggestions exists                          │
│  • It's an array of MapboxSuggestion                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              placesController.ts                         │
│  1. Validates data                                       │
│  2. Extracts coordinates                                 │
│  3. Maps to Prisma schema                               │
│  4. Saves to database                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                     │
│  Place table + GooglePlaceCache table                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Type Definitions Breakdown

### Level 1: Basic Building Blocks

```typescript
// Simple coordinate object
interface MapboxCoordinates {
  latitude: number;   // ← Must be a number
  longitude: number;  // ← Must be a number
}
```

**Usage:**
```typescript
const coords: MapboxCoordinates = {
  latitude: 13.7563,
  longitude: 100.5018,
}; // ✅ Valid

const badCoords: MapboxCoordinates = {
  latitude: "13.7563",  // ❌ Error: string is not number
  longitude: 100.5018,
}; 
```

---

### Level 2: Nested Objects

```typescript
interface MapboxContext {
  country?: {           // ← Optional (?)
    name: string;
    country_code: string;
  };
  place?: {
    name: string;
  };
}
```

**Usage:**
```typescript
// Valid - all properties optional
const context1: MapboxContext = {};

// Valid - with country
const context2: MapboxContext = {
  country: {
    name: "Thailand",
    country_code: "TH",
  },
};

// Valid - with both
const context3: MapboxContext = {
  country: { name: "Thailand", country_code: "TH" },
  place: { name: "Bangkok" },
};
```

---

### Level 3: Main Data Structure

```typescript
interface MapboxSuggestion {
  // Required fields (no ?)
  name: string;
  mapbox_id: string;
  
  // Optional fields (with ?)
  coordinates?: MapboxCoordinates;
  context?: MapboxContext;
  poi_category_ids?: string[];
  
  // Alternative coordinate format
  geometry?: {
    type: string;
    coordinates: [number, number];
  };
}
```

**What this means:**
- `name` and `mapbox_id` MUST be present
- Everything else is optional
- If `coordinates` exists, it must match `MapboxCoordinates` shape

---

### Level 4: Request Body

```typescript
interface MapboxRequestBody {
  suggestions: MapboxSuggestion[];  // Array of suggestions
}
```

**Valid request:**
```json
{
  "suggestions": [
    {
      "name": "Buddy's Bar",
      "mapbox_id": "abc123",
      "coordinates": {
        "latitude": 13.7563,
        "longitude": 100.5018
      }
    }
  ]
}
```

---

## 🔍 How TypeScript Helps You

### 1. Autocomplete

When you type `suggestion.`, your editor shows:

```
suggestion.
  ├─ name              (string)
  ├─ mapbox_id         (string)
  ├─ coordinates?      (MapboxCoordinates | undefined)
  ├─ context?          (MapboxContext | undefined)
  ├─ poi_category_ids? (string[] | undefined)
  └─ geometry?         (object | undefined)
```

---

### 2. Error Prevention

```typescript
// ❌ TypeScript catches this error
const name = suggestion.namee;  // Typo! Property doesn't exist

// ✅ Correct
const name = suggestion.name;
```

---

### 3. Safe Property Access

```typescript
// ❌ Unsafe - might crash if coordinates is undefined
const lat = suggestion.coordinates.latitude;

// ✅ Safe - checks if coordinates exists first
if (suggestion.coordinates) {
  const lat = suggestion.coordinates.latitude;
}

// ✅ Also safe - returns undefined if coordinates doesn't exist
const lat = suggestion.coordinates?.latitude;
```

---

## 📊 Type Flow in Controller

```
Request Body (JSON)
    ↓
MapboxRequestBody type
    ↓
Extract: MapboxSuggestion
    ↓
Validate & Transform
    ↓
Prisma Create Input
    ↓
Database
```

### Step-by-Step Example

```typescript
// 1. Request comes in
const data: MapboxRequestBody = req.body;

// 2. Extract first suggestion
const suggestion: MapboxSuggestion = data.suggestions[0];
//    ↑ TypeScript knows all properties of suggestion

// 3. Safe access with optional chaining
const city = suggestion.context?.place?.name;
//           ↑ Returns undefined if context or place is missing

// 4. Type narrowing with if statement
if (suggestion.coordinates) {
  // Inside here, TypeScript knows coordinates exists
  const lat = suggestion.coordinates.latitude; // ✅ Safe
}

// 5. Map to database
const place = await prisma.place.create({
  data: {
    placeId: suggestion.mapbox_id,  // string → string ✅
    lat: latitude,                   // number → Float ✅
    lng: longitude,                  // number → Float ✅
  },
});
```

---

## 🎓 Key Concepts Summary

| Concept | Symbol | Example | Meaning |
|---------|--------|---------|---------|
| **Optional Property** | `?` | `name?: string` | Property may or may not exist |
| **Optional Chaining** | `?.` | `obj?.prop` | Access property only if obj exists |
| **Union Type** | `\|` | `string \| number` | Can be either type |
| **Array Type** | `[]` | `string[]` | Array of strings |
| **Type Assertion** | `as` | `value as any` | Tell TypeScript to trust you |
| **Interface** | `interface` | `interface User {}` | Define object shape |

---

## 🚀 Benefits You Get

### ✅ Compile-Time Safety
Errors caught before running code

### ✅ Better IDE Support
Autocomplete, go-to-definition, refactoring

### ✅ Self-Documenting Code
Types serve as inline documentation

### ✅ Easier Refactoring
Change a type, see all affected code

### ✅ Fewer Runtime Errors
Many bugs caught during development

---

## 💡 Pro Tips

### 1. Always Define Types for API Data
```typescript
// ❌ Bad - no type safety
const data = req.body;

// ✅ Good - full type safety
const data: MapboxRequestBody = req.body;
```

### 2. Use Optional Chaining
```typescript
// ❌ Risky
const city = data.suggestions[0].context.place.name;

// ✅ Safe
const city = data.suggestions[0]?.context?.place?.name;
```

### 3. Validate at Runtime
```typescript
// Types only exist at compile time!
// Always validate actual data:
if (!data.suggestions || data.suggestions.length === 0) {
  return res.status(400).json({ error: "No suggestions" });
}
```

### 4. Keep Types in Separate Files
```
types/
  ├─ mapbox.ts      ← Mapbox-related types
  ├─ user.ts        ← User-related types
  └─ common.ts      ← Shared types
```

---

## 📚 Further Learning

1. **Read the tutorial**: `TYPESCRIPT_TYPES_TUTORIAL.md`
2. **Understand the controller**: `CONTROLLER_EXPLANATION.md`
3. **Practice**: Try adding more fields to the types
4. **Experiment**: See what errors TypeScript catches

