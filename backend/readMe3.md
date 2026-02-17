# 🗺️ Google Maps Cost & Compliance Strategy

## 🛡️ Data Storage & Compliance (The "30-Day Rule")

### The 30-Day Cache

Legally allowed to store **Latitude and Longitude** for up to **30 consecutive days** only to improve performance.

### Permanent Anchor (Place IDs)

Store the **Google Place ID** in your database indefinitely. It is your permanent key to refresh data.

### The Rolling Delete

Use a **Cron Job** (with `node-cron` and Prisma) to daily nullify `lat`, `lng`, and `openingHours` where `updatedAt < NOW() - 30 days`.

### Hydration Logic

When coordinates are missing in DB, use the Place ID to fetch fresh data from Google and reset the 30-day timer.

---

## 📱 React Native: Keeping it Free

### Use `react-native-maps`

This library uses the **Native Google Maps SDK** (Android/iOS) rather than the Web/JS version.

### Avoid "Map ID"

Do **not** use a `mapId` in your `<MapView />` component. Standard native maps are unlimited and **$0**.

### No "Cloud Styling"

Use **local JSON styling** if you want to change map colours. Cloud-based styling (via Google Console) triggers "Dynamic Maps" billing ($2.10/1k after 70k loads).

### Marker Optimization

Render markers from your **PostgreSQL data**. Do not call the Google Places API every time a user moves the map; only call it when they specifically search or add a new place.

---

## 💰 Billing & Cost Optimization (India-Based)

### Native SDK Advantage

Mobile Native Dynamic Maps (Android/iOS) are **$0** with unlimited usage globally.

### India Pricing Cap

India-registered accounts get **70,000 free monthly requests** for Geocoding and Place Details (Essentials).

### Field Masking

Always request specific fields (e.g., `fields: ['geometry', 'name', 'place_id']`). Requesting "Atmosphere" data (reviews/photos) is expensive.

### Free Embeds

If you only need a non-interactive map for a "Trip Summary" page, use the **Maps Embed API**—it is completely free and unlimited.

---

## 🚀 Performance & Architecture

### PostgreSQL as a Shield

Serve data to users from your DB first. Only hit Google if data is missing or older than 30 days.

### Single-User Refresh

If User A refreshes a location in Bangkok, that fresh data is available for User B for the next 30 days for free.

### Haversine for "Nearby"

Calculate "What's near me" in your Node.js/Prisma backend using the **Haversine formula**. Do not use Google's "Distance Matrix API" or "Places Nearby" for this, as they are billed per request.

---

## 🔧 Code Snippets for Reference

### Prisma Cleanup (Cron Job)

```javascript
await prisma.place.updateMany({
  where: { updatedAt: { lt: thirtyDaysAgo } },
  data: { latitude: null, longitude: null, openingHours: null },
});
```

### React Native Map (Free Config)

```javascript
import MapView from 'react-native-maps';

// Standard native map - No Map ID = $0 / Unlimited
<MapView
  style={{ flex: 1 }}
  initialRegion={...}
/>
```
