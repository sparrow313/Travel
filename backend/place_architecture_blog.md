# From "store the whole Google place" to a compliant, trip-aware place architecture

When I first built the saved-places flow for my travel app backend, the architecture was simple: accept a Google Place payload from the frontend, save it in the database, and reuse that stored data later for rendering, reviews, and nearby search.

That first version was practical, but after reviewing Google Maps and Places caching rules, it became clear that the design was too optimistic. The backend needed a structural rethink.

This post explains what the architecture used to be, what it is now, why the change mattered, and what tradeoffs came with the refactor.

## The original architecture

The initial design treated a place almost like a fully owned local entity.

- `Place` stored the permanent Google identity.
- `Place` also stored `lat` and `lng` directly.
- `GooglePlaceCache` stored extra Google-derived fields.
- `UserSavedPlace` linked a user to a place and a trip.
- Controller responses could read directly from stored Google fields.

In practice, the data model looked roughly like this:

- `Place`: `placeId`, `lat`, `lng`
- `GooglePlaceCache`: `formattedAddress`, `addressJson`, `types`, `plusCode`, `viewport`
- `UserSavedPlace`: `userId`, `placeId`, `tripId`, status, notes, and timestamps

This meant the database was acting as both a place reference layer and a long-lived snapshot of Google place content.

## Why the original design became a problem

The major issue was compliance. After reviewing Google Places caching guidance, the safer interpretation was:

- `placeId` can be stored permanently.
- `lat/lng` can be cached only temporarily, up to 30 days.
- Other Google place details should not be stored long-term.

That immediately exposed several problems.

### 1. Coordinates were treated as permanent

`Place.lat` and `Place.lng` made location data feel like a permanent property of the entity, even though it should now be considered temporary cache.

### 2. The cache held too much Google-owned content

Fields like formatted address, raw JSON payloads, plus codes, and viewports were useful for convenience, but risky from a storage-policy perspective.

### 3. Read paths depended on removed Google data

Some controller logic, especially in review-related responses, depended on cached Google JSON for values such as place names.

### 4. A user could save a place only once total

The old schema used a uniqueness rule that effectively meant a user could not save the same place into more than one trip.

That was too restrictive for a real trip-planning product. A restaurant could legitimately appear in a food trip, a city itinerary, and a long regional trip at the same time.

## The architecture now

The new design separates three different concerns clearly:

- permanent identity
- temporary cache
- app-owned user data

That separation became the foundation of the new backend structure.

## `Place` is now a permanent identity anchor

`Place` now has a much narrower responsibility. It permanently represents the Google place only through `placeId`.

It no longer stores permanent coordinates or rich Google place details.

This makes the data model more honest:

- the app knows which place it refers to
- but it does not pretend to own the provider's full content forever

## `GooglePlaceCache` is now coordinates-only

The old rich cache was reduced to a temporary coordinates cache. It now stores:

- `placeId`
- `lat`
- `lng`
- `fetchedAt`

This cache exists for operational needs such as nearby search, but it is explicitly refreshable and time-bound.

That design is much easier to reason about because it matches the current policy direction:

- permanent identity lives in `Place`
- temporary location data lives in `GooglePlaceCache`

## `UserSavedPlace` became the real trip-aware ownership model

`UserSavedPlace` was already the join layer between user, place, and trip, but one important rule had to change.

Originally the schema effectively allowed only one saved record per user and place. That meant a user could save a place only once, regardless of how many trips they had.

Now the uniqueness rule is trip-scoped instead.

That means:

- same user + same place + different trip = allowed
- same user + same place + same trip = blocked as duplicate

This makes the model much closer to how a real travel product works.

## What the old save flow looked like

The original save flow was roughly:

1. receive a Google place payload
2. check whether `Place` already exists
3. create `Place` with `placeId`, `lat`, and `lng`
4. create a nested rich Google cache record
5. create `UserSavedPlace`
6. reject duplicates using a user-and-place uniqueness rule

That made the database behave like a long-lived storage layer for provider content.

## What the save flow does now

The new flow is much more intentional.

### Step 1: ensure the permanent place anchor exists

The backend upserts `Place` using only `placeId`.

### Step 2: refresh the temporary coordinates cache

The backend upserts `GooglePlaceCache` with `lat`, `lng`, and a fresh `fetchedAt` timestamp.

### Step 3: create a trip-specific saved record

The backend creates `UserSavedPlace` with:

- `userId`
- `placeId`
- `tripId`
- app-owned fields such as `status`, `userNotes`, and `visitedAt`

### Step 4: block duplicates only inside the same trip

The duplicate check is now trip-aware, so the same place can be saved into multiple trips for the same user without conflict.

## Read behavior changed too

Saved-place reads can still include related `Place` and `cache` records, but the cache is now only about temporary coordinates.

Read paths no longer assume that the database permanently contains Google names, addresses, or rich details.

That content must now be:

- fetched on demand later
- rendered through Google map UI where appropriate
- or replaced by app-owned fallback values

## Review responses needed a fallback label

One subtle breakage appeared in the review controller. Previously it derived a place name from cached Google JSON. Once that JSON was removed from the schema, that logic no longer made sense.

The fix was to replace that dependency with a compliant fallback label such as `Saved place`.

This is a good example of how an architecture change ripples into API response design. Once you stop storing third-party content long-term, every read path that depended on that content has to be reconsidered.

## Nearby search changed the most technically

The old nearby search calculated distance using coordinates stored directly on `Place`.

The new nearby search joins against `GooglePlaceCache` instead and only uses coordinates whose `fetchedAt` value is still within the freshness window.

So the feature now means:

- find the user's saved places
- join them to temporary coordinates
- ignore stale coordinate cache entries
- calculate distance only from fresh cache rows

This is a major architectural improvement because it cleanly separates durable identity from temporary operational location data.

## The new mental model

The backend now has a much clearer ownership model.

### Permanent

Things the app can safely own forever:

- `placeId`
- user notes
- status
- visited timestamps
- trip association
- reviews written by users
- internal relation and audit timestamps

### Temporary

Things that are useful but refreshable:

- coordinates (`lat/lng`)
- other short-lived operational cache data if added later

### Not stored permanently

Things the backend should not rely on as durable Google content:

- place names from Google
- formatted addresses
- raw Google JSON blobs
- other rich Google response fields

## Why this architecture is better

There are several benefits.

### 1. It matches the policy direction better

The schema now reflects storage constraints explicitly instead of hiding them inside a generic cache table.

### 2. It separates identity from display data

`placeId` is the stable anchor. Display data can be refreshed separately.

### 3. It fits the product better

Users can now save the same place into multiple trips, which is essential for real trip planning.

### 4. It reduces coupling

Controllers can no longer casually depend on stored third-party payloads.

### 5. It clarifies data ownership

The app owns user behavior, trip organization, notes, and reviews. Google owns Google place content.

That boundary matters and the schema now makes it visible.

## The tradeoffs

This refactor improved correctness, but it also introduced tradeoffs.

- More on-demand hydration work for place names and details
- Nearby search depends on fresh coordinate cache
- Some endpoints must now be more explicit because `place_id` alone is no longer enough in all user flows

For example, once the same place can exist in multiple trips, updating a saved place by place alone becomes ambiguous. The API now needs trip context too.

## Before vs now

### Before

- `Place` stored permanent `lat/lng`
- `GooglePlaceCache` stored rich Google-derived content
- read paths could depend on stored Google data
- one user could save one place only once total
- nearby search used coordinates stored permanently on `Place`

### Now

- `Place` stores only permanent `placeId`
- `GooglePlaceCache` stores only temporary `lat/lng` and `fetchedAt`
- controller logic no longer depends on old cached Google fields
- the same user can save the same place into multiple trips
- nearby search uses only fresh temporary coordinates

## Final thoughts

This change was more than a schema cleanup. It was a shift in architecture philosophy.

The old version treated Google place data as something to ingest and retain. The new version treats that data as partly referenceable, partly refreshable, and not fully ownable.

That shift pushed the backend toward a better domain model:

- `Place` = permanent identity reference
- `GooglePlaceCache` = temporary operational coordinates cache
- `UserSavedPlace` = user-trip ownership record

The result is a backend that is more policy-aware, more explicit, and more aligned with how a travel planning product actually behaves in production.