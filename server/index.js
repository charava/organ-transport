/**
 * Organ Transport Bridge Server
 *
 * - Reads temperature + shock data from serial port (COM port)
 * - Broadcasts to all connected dashboard clients via WebSocket
 * - Also accepts POST /api/readings for testing without hardware
 *
 * Usage:
 *   SERIAL_PORT=COM3 node index.js     (Windows)
 *   SERIAL_PORT=/dev/cu.usbserial-1420 node index.js  (macOS)
 *   node index.js                       (no serial, use POST for testing)
 */

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
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
  console.log('[broadcast]', data);
}

// POST /api/readings — for testing without hardware (curl, mock script)
app.post('/api/readings', (req, res) => {
  const reading = req.body;
  if (!reading || typeof reading.temp === 'undefined') {
    return res.status(400).json({ error: 'Expected { temp, shock?, deviceId? }' });
  }
  const payload = {
    temp: Number(reading.temp),
    shock: Number(reading.shock ?? 0),
    deviceId: reading.deviceId || 'DEV-001',
    at: new Date().toISOString(),
  };
  broadcast(payload);
  res.json({ ok: true });
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

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on('data', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const reading = JSON.parse(trimmed);
        const payload = {
          temp: Number(reading.temp ?? reading.temperature ?? 0),
          shock: Number(reading.shock ?? reading.gForce ?? 0),
          deviceId: reading.deviceId || 'DEV-001',
          at: new Date().toISOString(),
        };
        broadcast(payload);
      } catch (err) {
        console.warn('[serial] Invalid JSON:', trimmed);
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
