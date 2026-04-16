# Wanderlog’s Map Integration

Wanderlog relies heavily on **Google Maps** as part of its interface.  The app description even says every added place is “immediately pinned on your Google Maps-based travel map”【70†L125-L132】.  In practice, Wanderlog uses the Google Maps SDK (on web/mobile) to display your itinerary.  When you view the map, Google Maps itself shows place labels and information on the map layer – so Wanderlog doesn’t have to store those names.  In other words, the **place names and markers are rendered by Google Maps**, not by Wanderlog’s own database.  This means that, as long as the map is visible, the place names come directly from Google’s servers.  

# Offline Storage vs. Place Data

Wanderlog also advertises that your trip “plans are automatically stored offline”【70†L134-L138】.  Typically this means the itinerary (place IDs and coordinates) is saved on the device so you can view the map routes without an internet connection.  Google’s policy does allow storing *place_id* and *latitude/longitude* for up to 30 days【53†L342-L344】【55†L295-L299】.  It **does not** allow permanently saving names, addresses, or other details from Google Places【55†L267-L269】.  In Wanderlog’s case, “offline plans” probably refers only to the fact that *which places are in your trip* (their IDs) are saved locally.  The actual **names and details** of those places are not meant to be saved beyond a session.  Instead, when you come back online, the app will fetch or re-display those details via Google.  

# Displaying Place Details

Whenever you view a place in Wanderlog (on the map or in a list), Wanderlog needs to show details like the name, address, and opening hours.  Under Google’s rules, these details cannot be kept in Wanderlog’s database.  So Wanderlog must obtain them either from Google at that moment, or rely on Google’s map UI.  There are a few likely approaches:
- **On-Map Labels:** If you’re looking at the map, Google Maps will label each marker with the place’s name (and often a small snippet or rating).  That labeling is handled by Google’s SDK and isn’t a stored field in Wanderlog’s code.  
- **Info Windows or Popups:** Tapping a map pin could open a Google Maps info window (which pulls data from Google).  
- **On-Demand API Calls:** If Wanderlog shows places in a textual list or detailed view, the app may call the Google Places API or Places SDK for the required fields (name, address, etc.) each time you view that place.  This means **fetching the data when needed**, rather than caching it long-term.  

This strategy aligns with Google’s Places policy, which allows *only* place_id and lat/lng to be cached【53†L342-L344】【55†L267-L269】.  Everything else must be retrieved fresh.  Indeed, one user review notes that adding many points can make the app **“a bit slow”** and suspects it’s due to Google API calls【74†L194-L200】.  This suggests Wanderlog is performing Google lookups (or letting the map redraw) for those place names, which can impact performance.  

# Caching Rules and Wanderlog

By Google’s terms, Wanderlog **cannot legally store place names or other details offline indefinitely**【55†L267-L269】.  The only data it’s allowed to keep without refreshing is the place_id (which uniquely identifies a Google place) and its coordinates【53†L342-L344】【55†L295-L299】.  Wanderlog’s “offline mode” likely only persists those IDs and coords – not the human-readable text.  When you reopen a trip, the app would need to re-fetch any names or new details from Google.  This makes the UI slower if not managed carefully.  

**Community Insight:** Others have noted that travel-planning apps face this exact dilemma.  Google’s newer ToS explicitly forbid caching most place details【55†L267-L269】, so a startup like Wanderlog either (a) violates the rules by caching names, or (b) must query Google’s API on demand.  In practice, Wanderlog appears to accept the slower load times (as reviewers mention【74†L194-L200】) and rely on Google’s map and API to supply place details each time.  

# Recommendations

To handle this in your app (like Wanderlog):  

- **Use Google Maps SDK:** Let Google Maps display the markers and labels. Since this is *on a Google map*, it complies with policy and automatically shows place names without you storing them.  
- **Fetch Details on Demand:** When showing a place’s details (e.g. in a place card), fetch the needed fields via the Places API or SDK call (with fields like name, address, rating). Do this when the user actually views that place.  
- **Cache Only IDs/Coords:** Store only the place_id and latitude/longitude (these are allowed to be cached up to 30 days【53†L342-L344】).  Do not persist the name or address in your database.  
- **Performance Mitigation:** Because fetching each time can slow down the UI, consider loading details in the background or when the map is idle.  You could also store results in a short-term memory cache (not permanent storage) so that switching tabs/pages in the same session doesn’t re-fetch immediately (just as long as the app is running).  
- **Follow Attribution Rules:** Ensure you always show Google’s attribution (logo, etc.) when displaying map data or place data, as required by Google’s documentation【55†L267-L269】.  

By using Google Maps for display and only retrieving place details when needed, Wanderlog is able to show the names and info for each place without illegally storing that data. It does so at the cost of extra API calls (and occasional UI lag), but stays within Google’s caching rules【53†L342-L344】【55†L267-L269】. 

**Sources:** Wanderlog’s app descriptions【70†L125-L132】【70†L168-L170】 and user reviews【74†L194-L200】; Google Maps Platform policies on Places caching【55†L267-L269】【53†L342-L344】. These confirm that place names must come from Google’s map/API each time, not from persistent storage.