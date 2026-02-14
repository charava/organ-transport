/**
 * Sends mock readings to the bridge for testing without hardware.
 * Run: npm run mock
 * (Start the bridge first: npm start)
 */

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:4000';

async function send(payload) {
  const res = await fetch(`${BRIDGE_URL}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function run() {
  console.log('Sending mock readings to', BRIDGE_URL, '...');
  let temp = 4.0;
  let t = 0;
  // Simulate a path moving north from SF
  let lat = 37.7749;
  let lng = -122.4194;
  while (true) {
    temp = 4.0 + Math.sin(t * 0.1) * 1.5 + (Math.random() - 0.5) * 0.3;
    const humidity = 45 + Math.sin(t * 0.05) * 5;
    const shock = Math.random() < 0.05 ? (Math.random() * 2 + 0.5) : 0;
    lat += 0.0001 * (0.5 + Math.sin(t * 0.1) * 0.5);
    lng += 0.0001 * (0.3 + Math.cos(t * 0.08) * 0.3);
    await send({ temp, shock, humidity, lat, lng, deviceId: 'DEV-001' });
    console.log(`Sent: temp=${temp.toFixed(2)}°C, humidity=${humidity.toFixed(1)}%, GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    t++;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
