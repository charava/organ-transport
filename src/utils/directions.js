/**
 * Fetch route from Google Directions API via server proxy.
 * Requires GOOGLE_MAPS_API_KEY in server/.env
 */

const API_BASE = process.env.REACT_APP_API_URL || '';

export async function fetchDirections(originLat, originLng, destLat, destLng) {
  const origin = `${originLat},${originLng}`;
  const dest = `${destLat},${destLng}`;
  const url = `${API_BASE}/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Directions failed: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

/**
 * Decode Google's encoded polyline to LatLng array
 */
export function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
