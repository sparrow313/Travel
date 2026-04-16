# Google Maps Platform Terms on Caching Places Data

Google’s official documentation and terms make clear that **only very limited Places data may be cached**. The Places API policies state that you “must not pre-fetch, cache, or store Places API content beyond the allowed exceptions,” with the **place_id** being explicitly exempt【3†L267-L269】. In other words, by default you cannot store most of the Place Details response (name, address, phone, ratings, etc.) beyond the immediate use. The *only* exceptions are:  

- **Place IDs:** You can store a place’s `place_id` indefinitely【3†L293-L299】. (Place IDs uniquely identify a place and are exempt from caching rules.)  
- **Coordinates (lat/lng):** You may cache a place’s latitude and longitude for *up to 30 consecutive calendar days*【6†L342-L344】. After 30 days you must delete or refresh those cached coordinates.  

All **other fields in the Place Details response** (business name, address, phone number, opening hours, reviews, etc.) are considered Google Maps Content that **may not be stored** beyond these exceptions. The Google Maps Platform Terms explicitly forbid copying or saving “business names, addresses, or user reviews” outside the API【44†L332-L340】, and state that “Customer will not cache Google Maps Content except as expressly permitted under the Maps Service Specific Terms”【44†L341-L344】【3†L267-L269】. In practice, this means you *cannot* legally cache the full JSON response from Place Details for 30 days; only the place_id and lat/lng can be held for that period.

## Official Guidance and Restrictions

- Google’s **Places API Policy** says: “You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions”【3†L267-L269】. The only clear exception named is the place ID.  
- The **Service Specific Terms** confirm: “Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values”【6†L342-L344】. They also note you can cache place_id values per the Places API policies【6†L342-L344】.  
- By contrast, no policy permits storing names, addresses, phone numbers, ratings, reviews, or other details. In fact, the Terms explicitly prohibit copying/saving those fields. For example, section 3.2.3 of the Terms of Service warns that a customer will *not* “pre-fetch, index, store… Google Maps Content outside the services” or “copy and save business names, addresses, or user reviews”【44†L332-L340】.  

In summary, **only coordinates (for up to 30 days) and place_id (indefinitely)** can be cached. Every other piece of data from the Place Details API should be treated as dynamic and must be re-fetched when needed. 

## Display and Attribution Requirements

Even when caching is permitted, you must follow Google’s display rules. For example, if you show Places data **without** a Google Map, you are required to display the Google logo and proper attribution【3†L270-L276】. (If using a Google Map, attribution is already included.) This applies whether the data came from a recent API call or from a short-term cache. 

## Community and Clarifications

Experienced developers confirm these rules. The commonly cited guidance is that you may store the `place_id` indefinitely and cache lat/lng for 30 days【6†L342-L344】【3†L293-L299】. Any additional content (like names or ratings) beyond those fields must **not** be stored for that period. Attempting to cache full Place Details responses would violate the Terms (as many on StackOverflow and forums have pointed out, e.g. caching of Places API results is limited to lat/lng only【6†L342-L344】).

## Conclusion

**Can you cache the Place Details result for 30 days?** Not in full. You may cache the place’s latitude/longitude for up to 30 days【6†L342-L344】 and keep the `place_id` indefinitely【3†L293-L299】, but **all other data** from the API is Google-owned content that cannot be stored beyond what the terms explicitly allow【3†L267-L269】【44†L332-L340】. After 30 days you must delete or refresh the cached coordinates. For any other fields, you should re-query the Places API to ensure compliance and current data. 

**Sources:** Google’s Places API documentation and Maps Platform Terms of Service【3†L267-L269】【6†L342-L344】【44†L332-L340】. These make clear that place IDs and coordinates are the only cacheable fields (with 30-day limits on coordinates) and that all other place data is not allowed to be stored.