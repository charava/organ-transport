/**
 * Transport config — placeholder for Google Maps API + hospitals dataset
 *
 * To integrate:
 * - Use Google Maps Places API to find nearby hospitals
 * - Use Google Maps Directions API for route from current position → destination
 * - Replace NEARBY_HOSPITALS with API results
 */

export const DEFAULT_DESTINATION = {
  name: 'Memorial Hospital',
  address: '123 Medical Center Dr',
  lat: 37.7849,
  lng: -122.4094,
};

// Redirect suggestions now use hospitals.csv via getNearestHospitalsAsync()
