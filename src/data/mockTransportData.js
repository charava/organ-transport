// Mock data for organ transport monitoring — replace with API/hardware later

export const TEMP_SAFE_RANGE = { min: 2, max: 6 }; // °C for cold storage/transport

export const activeTransports = [
  {
    id: 'T-2847',
    organType: 'Heart',
    destination: 'Memorial Hospital',
    status: 'in_transit',
    temperature: 4.2,
    tempStatus: 'ok',
    lastShock: null,
    shockStatus: 'ok',
    startedAt: '2025-02-14T08:30:00Z',
    estimatedArrival: '2025-02-14T11:45:00Z',
    deviceId: 'DEV-001',
  },
  {
    id: 'T-2848',
    organType: 'Liver',
    destination: 'City Medical Center',
    status: 'in_transit',
    temperature: 5.1,
    tempStatus: 'ok',
    lastShock: { g: 2.1, at: '2025-02-14T09:15:00Z' },
    shockStatus: 'warning',
    startedAt: '2025-02-14T07:00:00Z',
    estimatedArrival: '2025-02-14T10:30:00Z',
    deviceId: 'DEV-002',
  },
  {
    id: 'T-2849',
    organType: 'Kidney',
    destination: 'Regional Transplant Unit',
    status: 'in_transit',
    temperature: 7.8,
    tempStatus: 'alert',
    lastShock: null,
    shockStatus: 'ok',
    startedAt: '2025-02-14T09:00:00Z',
    estimatedArrival: '2025-02-14T12:00:00Z',
    deviceId: 'DEV-003',
  },
];

export const currentReadings = {
  primaryDevice: {
    deviceId: 'DEV-001',
    temperature: 4.2,
    temperatureHistory: [4.0, 4.1, 4.0, 4.2, 4.3, 4.2, 4.2],
    lastShock: null,
    shockHistory: [],
  },
  recentShocks: [
    { id: 1, deviceId: 'DEV-002', transportId: 'T-2848', gForce: 2.1, at: '2025-02-14T09:15:00Z', severity: 'warning' },
    { id: 2, deviceId: 'DEV-001', transportId: 'T-2847', gForce: 0.8, at: '2025-02-14T08:45:00Z', severity: 'ok' },
  ],
};

export const alerts = [
  { id: 1, type: 'temperature', severity: 'critical', message: 'T-2849 (Kidney): Temperature 7.8°C — above safe range', at: '2025-02-14T09:32:00Z' },
  { id: 2, type: 'shock', severity: 'warning', message: 'T-2848 (Liver): Shock event 2.1g detected', at: '2025-02-14T09:15:00Z' },
];
