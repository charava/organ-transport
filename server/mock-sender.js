/**
 * Sends mock readings to the bridge for testing without hardware.
 * Run: npm run mock
 * (Start the bridge first: npm start)
 */

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:4000';

async function send(temp, shock = 0) {
  const res = await fetch(`${BRIDGE_URL}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp, shock, deviceId: 'DEV-001' }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function run() {
  console.log('Sending mock readings to', BRIDGE_URL, '...');
  let temp = 4.0;
  let t = 0;
  while (true) {
    temp = 4.0 + Math.sin(t * 0.1) * 1.5 + (Math.random() - 0.5) * 0.3;
    const shock = Math.random() < 0.05 ? (Math.random() * 2 + 0.5) : 0;
    await send(temp, shock);
    console.log(`Sent: temp=${temp.toFixed(2)}°C, shock=${shock > 0 ? shock.toFixed(2) + 'g' : '0'}`);
    t++;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
