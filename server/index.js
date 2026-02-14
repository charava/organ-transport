/**
 * OrganTrail Bridge Server
 *
 * - Reads temperature, shock, humidity, GPS from serial port (COM port)
 * - Broadcasts to all connected dashboard clients via WebSocket
 * - Also accepts POST /api/readings for testing without hardware
 *
 * Usage:
 *   Set SERIAL_PORT in server/.env (e.g. /dev/cu.usbserial-10 on macOS)
 *   Or: SERIAL_PORT=COM3 node index.js (Windows)
 */

require('dotenv').config();

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const PORT = process.env.PORT || 4000;
const SERIAL_PATH = process.env.SERIAL_PORT;
const SERIAL_BAUD = parseInt(process.env.SERIAL_BAUD || '9600', 10);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const payload = {
    ...data,
    at: data.at || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
  const ts = payload.receivedAt ? new Date(payload.receivedAt).toLocaleTimeString() : '';
  const parts = [];
  if (payload.temp != null) parts.push(`${payload.temp}°C`);
  if (payload.humidity != null) parts.push(`${payload.humidity}%`);
  parts.push(`shock=${payload.shock}g`);
  if (payload.lat != null && payload.lng != null) parts.push(`GPS ${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)}`);
  console.log('[broadcast]', parts.join(', ') + (ts ? ` @ ${ts}` : ''));
}

// POST /api/readings — for testing without hardware (curl, mock script)
app.post('/api/readings', (req, res) => {
  const reading = req.body;
  if (!reading || typeof reading.temp === 'undefined') {
    return res.status(400).json({ error: 'Expected { temp, shock?, deviceId?, lat?, lng? }' });
  }
  const payload = {
    temp: Number(reading.temp),
    shock: Number(reading.shock ?? 0),
    humidity: reading.humidity != null ? Number(reading.humidity) : undefined,
    deviceId: reading.deviceId || 'DEV-001',
  };
  if (reading.lat != null && reading.lng != null) {
    payload.lat = Number(reading.lat);
    payload.lng = Number(reading.lng);
  }
  broadcast(payload);
  res.json({ ok: true });
});

// GET /api/directions — proxy to Google Directions API (avoids CORS)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
app.get('/api/directions', async (req, res) => {
  if (!GOOGLE_API_KEY) {
    return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY not set in server/.env' });
  }
  const { origin, destination } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Expected origin and destination query params' });
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status !== 'OK') {
      return res.status(400).json({ error: data.error_message || data.status });
    }
    const route = data.routes?.[0];
    if (!route) {
      return res.status(404).json({ error: 'No route found' });
    }
    const leg = route.legs?.[0];
    res.json({
      polyline: route.overview_polyline?.points,
      distance: leg?.distance?.text,
      duration: leg?.duration?.text,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ports — list available serial ports
app.get('/api/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serial port connection
let serialPort = null; 


if (SERIAL_PATH) {
  try {
    serialPort = new SerialPort({
      path: SERIAL_PATH,
      baudRate: SERIAL_BAUD,
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    function parseLine(trimmed) {
      // Try JSON first
      try {
        const r = JSON.parse(trimmed);
        const out = {
          temp: Number(r.temp ?? r.temperature ?? 0),
          shock: Number(r.shock ?? r.gForce ?? 0),
          humidity: r.humidity != null ? Number(r.humidity) : undefined,
          deviceId: r.deviceId || 'DEV-001',
        };
        if (r.lat != null && r.lng != null) {
          out.lat = Number(r.lat);
          out.lng = Number(r.lng);
        }
        return out;
      } catch (_) {}

      // Parse text format: "Shock: 0 | Temp: 21.50C | Humidity: 45.40%" or with GPS "| Lat: 37.77 | Lng: -122.42"
      const match = trimmed.match(/Shock:\s*([\d.-]+)\s*\|?\s*Temp:\s*([\d.]+)C?\s*\|?\s*Humidity:\s*([\d.]+)%?(?:\s*\|?\s*Lat:\s*([\d.-]+)\s*\|?\s*Lng:\s*([\d.-]+))?/i);
      if (match) {
        const out = {
          temp: Number(match[2]),
          shock: Number(match[1]),
          humidity: Number(match[3]),
          deviceId: 'DEV-001',
        };
        if (match[4] != null && match[5] != null) {
          out.lat = Number(match[4]);
          out.lng = Number(match[5]);
        }
        return out;
      }
      return null;
    }

    parser.on('data', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const reading = parseLine(trimmed);
      if (reading) {
        broadcast(reading);
      } else {
        console.warn('[serial] Unrecognized format:', trimmed);
      }
    });

    serialPort.on('error', (err) => console.error('[serial] Error:', err.message));
    serialPort.on('open', () => console.log('[serial] Opened', SERIAL_PATH));
  } catch (err) {
    console.error('[serial] Failed to open:', err.message);
  }
} else {
  console.log('[serial] SERIAL_PORT not set — use POST /api/readings for testing');
}

server.listen(PORT, () => {
  console.log(`Bridge server: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  if (SERIAL_PATH) console.log(`Serial: ${SERIAL_PATH} @ ${SERIAL_BAUD} baud`);
});
