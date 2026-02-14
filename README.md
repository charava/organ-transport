# Organ Ground Transport Monitoring

On-ground organ transport logistics — multi-factor error detection (temperature, shock, humidity) and GPS tracking for road-based transplant transport.

This system is designed for ground vehicles (ambulances, transport vans) moving organs between facilities. Since ground transport is a part of the transport process that is susceptible to causing organ damage, we want to build software that monitors transport, collects data for future transport optimization, and 

Treehacks 2026 - Ananya, Ashley, Charlotte, Leah

---

## Features

- **Temperature monitoring** — Safe range 2–6°C for cold storage
- **Shock sensing** — Impact/vibration detection (g-force)
- **Humidity monitoring** — Relative humidity %
- **GPS location & path** — Live position and route tracking on map
- **Destination & route** — Each device shows destination; click "View route" to see path on map
- **Redirect triaging** — On critical errors, suggests redirect to nearby hospital; operator can confirm or reject
- **Alerts** — Critical/warning when readings go out of range

*Redirect suggestions use `hospitals.csv` — run `npm run process-hospitals` to generate `public/hospitals.json` from the CSV.*

---

## Quick start

### 1. Dashboard (React)

```bash
npm install
npm start
```

Opens at http://localhost:3000

### 2. Bridge server (serial → WebSocket)

```bash
cd server
npm install
npm start
```

The bridge runs on port 4000. Without a serial port, it accepts POST requests for testing.

### 3. Connect hardware (COM port / serial)

Set your serial port in `server/.env` or as an env var:

**Windows:**
```bash
set SERIAL_PORT=COM3
npm start
```

**macOS:**
```bash
SERIAL_PORT=/dev/cu.usbserial-10 npm start
```

**Linux:**
```bash
SERIAL_PORT=/dev/ttyUSB0 npm start
```

Find your port: `ls /dev/cu.*` (Mac) or Device Manager → Ports (Windows).

### 4. Microcontroller output format

**Text format** (one line per reading):
```
Shock: 0 | Temp: 21.50C | Humidity: 45.40% | Lat: 37.7749 | Lng: -122.4194
```

**JSON format**:
```json
{"temp":4.2,"shock":0,"humidity":45.4,"lat":37.7749,"lng":-122.4194,"deviceId":"DEV-001"}
```

- `temp` — temperature in °C
- `shock` — g-force (0 if no event)
- `humidity` — relative humidity %
- `lat`, `lng` — GPS coordinates (optional)
- `deviceId` — optional

### 5. Hospitals data (for redirect suggestions)

Process `hospitals.csv` into JSON for the dashboard:

```bash
npm run process-hospitals
```

This creates `public/hospitals.json`. The redirect triage uses it to suggest nearest hospitals by location.

### 6. Test without hardware

With the bridge running:

```bash
cd server
npm run mock
```

Or use curl (with GPS):
```bash
curl -X POST http://localhost:4000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"temp":4.5,"shock":0,"humidity":48,"lat":37.7749,"lng":-122.4194}'
```
