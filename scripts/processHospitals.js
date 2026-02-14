/**
 * Processes hospitals.csv into a smaller JSON for the dashboard.
 * Run: node scripts/processHospitals.js
 * Output: public/hospitals.json
 */

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'hospitals.csv');
const outPath = path.join(__dirname, '..', 'public', 'hospitals.json');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
      result.push(current.trim());
      current = '';
      if (c !== ',') break;
    } else {
      current += c;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);
const header = parseCSVLine(lines[0]);
const nameIdx = header.indexOf('NAME');
const latIdx = header.indexOf('LATITUDE');
const lngIdx = header.indexOf('LONGITUDE');
const cityIdx = header.indexOf('CITY');
const stateIdx = header.indexOf('STATE');
const typeIdx = header.indexOf('TYPE');
const statusIdx = header.indexOf('STATUS');

const hospitals = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  const name = cols[nameIdx];
  const lat = parseFloat(cols[latIdx]);
  const lng = parseFloat(cols[lngIdx]);
  const type = cols[typeIdx] || '';
  const status = cols[statusIdx] || '';

  if (!name || isNaN(lat) || isNaN(lng)) continue;
  if (status !== 'OPEN') continue;

  const key = `${lat},${lng}`;
  if (seen.has(key)) continue;
  seen.add(key);

  hospitals.push({
    name,
    lat,
    lng,
    city: cols[cityIdx] || '',
    state: cols[stateIdx] || '',
  });
}

fs.writeFileSync(outPath, JSON.stringify(hospitals), 'utf8');
console.log(`Wrote ${hospitals.length} hospitals to public/hospitals.json`);
