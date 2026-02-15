# OrganTrail — Project Overview

**Treehacks 2026** — Ananya, Ashley, Charlotte, Leah

---

## What It Does

OrganTrail is an **on-ground organ transport monitoring dashboard** for road-based transplant logistics. It tracks temperature, shock, humidity, and GPS for transport vehicles (ambulances, transport vans) moving organs between donor and recipient facilities.

The system provides:
- **Real-time monitoring** of sensor data from a microcontroller via serial port
- **Multi-factor error detection** when readings go outside safe ranges
- **GPS tracking** with live position and path history on a map
- **Route visualization** with driving directions from Google Maps
- **Redirect triaging** — when a critical error occurs, suggests nearest hospitals for emergency diversion

---

## How We Built It

### Architecture

**Two-part system:**

1. **Bridge server** (Node.js, port 4000) — reads data from hardware, broadcasts to dashboard
2. **Dashboard** (React, port 3000) — displays data, maps, alerts, and controls

### Data Flow

```
Microcontroller → Serial (COM port) → Bridge Server → WebSocket → Dashboard
                     OR
POST /api/readings (testing) → Bridge Server → WebSocket → Dashboard
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Create React App |
| Maps | Leaflet, react-leaflet |

| Backend | Node.js, Express |
| WebSocket | ws |
| Serial | serialport, @serialport/parser-readline |
| Directions | Google Directions API (proxied via server) |

---

## Features

### 1. Temperature Monitoring
- **Organ-specific safe ranges** (in `mockTransportData.js`):
  - **Heart**: 4–8°C (avoid too-cold exposure)
  - **Kidney/Liver/Lung/Pancreas**: 0–4°C (SCS / static cold storage)
- Live gauge display with safe range indicator
- Critical alerts when temperature goes outside range
- Device ID and last reading timestamp

### 2. Humidity Monitoring
- Relative humidity % display
- Bar visualization
- Updates when readings arrive

### 3. Shock Sensing
- **Thresholds**: ≥1.5g = warning, ≥2.5g = critical
- Recent shock events list with g-force and timestamp
- Alerts generated for warning/critical events

### 4. GPS Location & Map
- **MapPanel**: OpenStreetMap tiles via Leaflet
- Live position marker when connected (single device)
- Path taken (blue polyline) from GPS history
- Synthetic location when no GPS from device (SF Bay Area drift)
- Map center follows live device

### 5. Active Transports Table
- 10 mock transports (Heart, Liver, Kidney, Lung, Pancreas)
- Columns: Transport ID, Organ, Device, Destination, Temperature, Humidity, Shock, Location, Status, Last reading
- **Live** vs **Synthetic** status badge
- DEV-001 is the live device when connected

### 6. View Route Modal
- **Route snapshot**: Captures location, path, destination when opened — no live updates while modal is open (prevents flicker from sensor)
- **Path taken**: Blue polyline from GPS history
- **Route to destination**: Orange polyline from Google Directions API (driving mode)
- **Fallback**: Dashed straight line if API fails or key missing
- **Open in Google Maps**: Link to open full route in Google Maps
- **Memoized**: Uses `React.memo` to avoid re-renders from parent sensor updates

### 7. Redirect Triage
- **Trigger**: Critical temperature alert
- **Action**: Overlay modal with nearest hospitals
- **Data**: `hospitals.json` from `hospitals.csv` (run `npm run process-hospitals`)
- **Sorting**: Haversine distance from current location
- **Actions**: Select hospital (updates destination) or Reject

### 8. Redirect Banner
- When user confirms redirect: banner shows "Redirected — Transport now heading to [Hospital]"
- "Redirected" badge on live transport row

### 9. Hardware Integration
- **Serial input**: JSON or text format
- **JSON**: `{"temp":4.2,"shock":0,"humidity":45.4,"lat":37.77,"lng":-122.42,"deviceId":"DEV-001"}`
- **Text**: `Shock: 0 | Temp: 21.50C | Humidity: 45.40% | Lat: 37.77 | Lng: -122.42`
- **Config**: `SERIAL_PORT` in `server/.env`

### 10. API Routes (Bridge Server)
- `POST /api/readings` — test without hardware
- `GET /api/directions` — proxy to Google Directions API (avoids CORS)
- `GET /api/ports` — list available serial ports

### 11. Data Processing Scripts
- `npm run process-hospitals` — CSV → `public/hospitals.json` for redirect suggestions

### 12. Security
- `.env` in `.gitignore` — API keys not committed
- `server/.env.example` — template for required vars

---

## Next Steps

1. **Synthetic organ shipments**: If `synthetic_organ_shipments_1000.csv` exists, add `process-organ-shipments` script to generate `public/synthetic-organ-transports.json` (ambulance/ground only) and use `useTransports` hook to load it; show all transports on map
2. **Multi-device support**: Map multiple devices (DEV-001, DEV-002, etc.) with distinct markers
3. **Historical data**: Persist readings to DB for replay and analytics
4. **Alerts persistence**: Store alerts, allow acknowledgment and history
5. **Production deployment**: Vercel for frontend; deploy bridge server separately (e.g. Railway, Render)
6. **Vercel env vars**: Add `GOOGLE_MAPS_API_KEY` and any API URLs in Vercel dashboard
7. **Authentication**: Add auth for operators/transport coordinators
8. **Restore production temp range**: Change `TEMP_SAFE_RANGE` back to `{ min: 2, max: 6 }` when demo ends

---

## Limitations

1. **Single live device**: Only DEV-001 receives live data; other transports use mock data
2. **Bridge server required**: Directions API and WebSocket need backend; frontend alone cannot fetch directions (CORS)
3. **Google API key**: Required for real road routes; fallback is straight dashed line
4. **Hospitals data**: Redirect triage needs `hospitals.json`; run `process-hospitals` after adding/updating `hospitals.csv`
5. **Ground transport only**: Designed for ambulances/vans; no flight/helicopter support
6. **No persistence**: No database; all state is in-memory; refresh loses data
7. **Leaflet + React 19**: Occasional `_leaflet_events` errors on unmount; mitigated with `animate: false` and `React.memo`
8. **Map markers**: Main map shows single live device only; other transports not on map
9. **Temperature range**: Configurable in `mockTransportData.js`; production standard is 2–6°C
