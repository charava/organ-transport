# Organ Transport

Organ transport multi-factor error detection (temp and shock) / data collection system and transport monitoring dashboard.

Treehacks 2026 - Ananya, Ashley, Charlotte, Leah

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

Set your serial port and start the bridge:

**Windows:**
```bash
set SERIAL_PORT=COM3
npm start
```

**macOS:**
```bash
SERIAL_PORT=/dev/cu.usbserial-1420 npm start
```

**Linux:**
```bash
SERIAL_PORT=/dev/ttyUSB0 npm start
```

Find your port: `ls /dev/cu.*` (Mac) or Device Manager → Ports (Windows).

### 4. Microcontroller output format

Send one JSON object per line over Serial (e.g. `Serial.println()`):

```json
{"temp":4.2,"shock":0,"deviceId":"DEV-001"}
```

- `temp` — temperature in °C
- `shock` — g-force (0 if no event)
- `deviceId` — optional

### 5. Test without hardware

With the bridge running:

```bash
cd server
npm run mock
```

Or use curl:
```bash
curl -X POST http://localhost:4000/api/readings -H "Content-Type: application/json" -d '{"temp":4.5,"shock":0}'
```