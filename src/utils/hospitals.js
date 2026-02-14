/**
 * Load hospitals from hospitals.json and find nearest by location.
 * Run `node scripts/processHospitals.js` to generate from hospitals.csv
 */

let hospitalsCache = null;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function loadHospitals() {
  if (hospitalsCache) return hospitalsCache;
  const res = await fetch('/hospitals.json');
  if (!res.ok) throw new Error('Failed to load hospitals');
  hospitalsCache = await res.json();
  return hospitalsCache;
}

export function getNearestHospitals(lat, lng, limit = 5) {
  if (!hospitalsCache) return [];
  return hospitalsCache
    .map((h) => ({
      ...h,
      distance: haversineDistance(lat, lng, h.lat, h.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export async function getNearestHospitalsAsync(lat, lng, limit = 5) {
  await loadHospitals();
  return getNearestHospitals(lat, lng, limit);
}
