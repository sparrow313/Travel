# 📍 Proximity Search Feature

## Overview

The proximity search feature allows users to find their saved wishlist places within a specified radius of their current location. This uses the **Haversine formula** to calculate distances between coordinates.

---

## 🎯 Endpoint

```
GET /places/nearby
```

**Authentication:** Required (JWT token)

---

## 📥 Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | ✅ Yes | - | User's current latitude (-90 to 90) |
| `lng` | number | ✅ Yes | - | User's current longitude (-180 to 180) |
| `radius` | number | ❌ No | 2000 | Search radius in meters |
| `status` | string | ❌ No | - | Filter by status: `WISHLIST`, `VISITED`, or `SKIPPED` |

---

## 📤 Response Format

```json
{
  "success": true,
  "message": "Found 3 place(s) within 2km",
  "data": {
    "userLocation": {
      "lat": 37.7749,
      "lng": -122.4194
    },
    "radius": {
      "meters": 2000,
      "kilometers": 2
    },
    "count": 3,
    "places": [
      {
        "id": "clx123abc",
        "userId": 5,
        "placeId": "ChIJabc123",
        "tripId": "trip_001",
        "status": "WISHLIST",
        "userNotes": "Want to try their pizza",
        "visitedAt": null,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "lat": 37.7758,
        "lng": -122.4180,
        "distanceKm": 0.12,
        "distanceMeters": 120,
        "place": {
          "id": "place_123",
          "placeId": "ChIJabc123",
          "lat": 37.7758,
          "lng": -122.4180,
          "cache": {
            "formattedAddress": "123 Main St, San Francisco, CA",
            "types": ["restaurant", "food"],
            ...
          }
        }
      }
    ]
  }
}
```

---

## 🧪 cURL Examples

### 1. Basic Usage - Find places within 2km (default)

```bash
curl -X GET "http://localhost:5000/places/nearby?lat=37.7749&lng=-122.4194" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Custom Radius - Find places within 5km

```bash
curl -X GET "http://localhost:5000/places/nearby?lat=37.7749&lng=-122.4194&radius=5000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Filter by Status - Only WISHLIST places within 2km

```bash
curl -X GET "http://localhost:5000/places/nearby?lat=37.7749&lng=-122.4194&status=WISHLIST" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Filter by Status - Only VISITED places within 1km

```bash
curl -X GET "http://localhost:5000/places/nearby?lat=37.7749&lng=-122.4194&radius=1000&status=VISITED" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 How It Works

### 1. Frontend Gets User Location

```javascript
// Browser Geolocation API
navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  // Call backend API
  fetch(`/places/nearby?lat=${lat}&lng=${lng}&radius=2000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
});
```

### 2. Backend Calculates Distances

Uses the **Haversine formula** to calculate the great-circle distance between two points on Earth:

```
distance = 6371 * acos(
  cos(radians(userLat)) * cos(radians(placeLat)) *
  cos(radians(placeLng) - radians(userLng)) +
  sin(radians(userLat)) * sin(radians(placeLat))
)
```

Where `6371` is Earth's radius in kilometers.

### 3. Returns Sorted Results

Places are returned sorted by distance (closest first).

---

## ⚠️ Error Responses

### Missing Parameters
```json
{
  "success": false,
  "message": "Latitude (lat) and longitude (lng) are required query parameters"
}
```

### Invalid Coordinates
```json
{
  "success": false,
  "message": "Latitude must be between -90 and 90"
}
```

### Invalid Radius
```json
{
  "success": false,
  "message": "Radius must be greater than 0"
}
```

---

## 🚀 Use Cases

1. **"Show me wishlist places near me"**
   - User opens app → Gets current location → Shows nearby places

2. **"What have I visited in this area?"**
   - Filter by `status=VISITED` to see past visits

3. **"Any places to skip nearby?"**
   - Filter by `status=SKIPPED` to avoid certain places

4. **"Expand search radius"**
   - Increase `radius` parameter to find more places

---

## 📊 Performance Notes

- **No PostGIS required** - Uses standard PostgreSQL math functions
- **Accuracy:** Good for distances up to ~1000km
- **Performance:** Suitable for datasets with thousands of places
- **Optimization:** For millions of places, consider upgrading to PostGIS with spatial indexes

---

## 🔐 Security

- ✅ Requires authentication (JWT token)
- ✅ Only returns places saved by the authenticated user
- ✅ User location is NOT stored in database
- ✅ Validates all input parameters

