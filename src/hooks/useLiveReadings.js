import { useState, useEffect, useCallback } from 'react';
import { getTempRangeForOrgan, getSyntheticLocation } from '../data/mockTransportData';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';
const SHOCK_WARNING_THRESHOLD = 1.5; // g-force above this = warning
const SHOCK_ALERT_THRESHOLD = 2.5;   // g-force above this = critical
const MAX_RECENT_SHOCKS = 20;
const MAX_ALERTS = 50; // maybe we want to change this?!! to 100

const emptyDevice = { deviceId: null, temperature: null, humidity: null, lastShock: null };
const MAX_PATH_POINTS = 500;

export function useLiveReadings(transports = []) {
  const [isConnected, setIsConnected] = useState(false);
  const [primaryDevice, setPrimaryDevice] = useState(emptyDevice);
  const [recentShocks, setRecentShocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [lastReadingAt, setLastReadingAt] = useState(null);
  const [location, setLocation] = useState(null);
  const [path, setPath] = useState([]);

  const processReading = useCallback((payload) => {
    const { temp, shock, humidity, lat, lng, deviceId, at, receivedAt } = payload;
    const now = receivedAt || at || new Date().toISOString();
    setLastReadingAt(now);

    setPrimaryDevice((prev) => ({
      ...prev,
      deviceId: deviceId || prev.deviceId,
      temperature: typeof temp === 'number' ? temp : prev.temperature,
      humidity: typeof humidity === 'number' ? humidity : prev.humidity,
      lastShock: shock > 0 ? { g: shock, at: now } : prev.lastShock,
    }));

    if (typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setLocation({ lat, lng, at: now });
      setPath((prev) => {
        const last = prev[prev.length - 1];
        const same = last && Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001;
        if (same) return prev;
        return [...prev, { lat, lng, at: now }].slice(-MAX_PATH_POINTS);
      });
    } else {
      // Synthetic location when no GPS from device
      const t = Date.now() / 10000;
      const synth = getSyntheticLocation(deviceId || 'DEV-001', t);
      setLocation({ ...synth, at: now });
      setPath((prev) => {
        const last = prev[prev.length - 1];
        const same = last && Math.abs(last.lat - synth.lat) < 0.00005 && Math.abs(last.lng - synth.lng) < 0.00005;
        if (same) return prev;
        return [...prev, { ...synth, at: now }].slice(-MAX_PATH_POINTS);
      });
    }

    if (shock > 0) {
      const severity =
        shock >= SHOCK_ALERT_THRESHOLD ? 'alert' : shock >= SHOCK_WARNING_THRESHOLD ? 'warning' : 'ok';
      setRecentShocks((prev) => [
        { id: Date.now(), deviceId: deviceId || 'DEV-001', gForce: shock, at: now, severity },
        ...prev.slice(0, MAX_RECENT_SHOCKS - 1),
      ]);
      if (severity !== 'ok') {
        setAlerts((prev) => [
          {
            id: Date.now(),
            type: 'shock',
            severity: severity === 'alert' ? 'critical' : 'warning',
            message: `${deviceId || 'Device'}: Shock event ${shock.toFixed(1)}g detected`,
            at: now,
          },
          ...prev.slice(0, MAX_ALERTS - 1),
        ]);
      }
    }

    const organType = transports.find((t) => t.deviceId === (deviceId || 'DEV-001'))?.organType;
    const range = getTempRangeForOrgan(organType);
    if (typeof temp === 'number' && (temp < range.min || temp > range.max)) {
      setAlerts((prev) => [
        {
          id: Date.now(),
          type: 'temperature',
          severity: 'critical',
          message: `${deviceId || 'Device'}${organType ? ` (${organType})` : ''}: Temperature ${temp.toFixed(1)}°C — outside safe range (${range.min}–${range.max}°C)`,
          at: now,
        },
        ...prev.slice(0, MAX_ALERTS - 1),
      ]);
    }
  }, [transports]);

  useEffect(() => {
    if (!isConnected) {
      setPrimaryDevice({
        deviceId: null,
        temperature: null,
        humidity: null,
        lastShock: null,
      });
      setRecentShocks([]);
      setAlerts([]);
      setLastReadingAt(null);
      setLocation(null);
      setPath([]);
    }
  }, [isConnected]);

  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => setIsConnected(true);

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {};

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          processReading(payload);
        } catch (err) {
          console.warn('Invalid WebSocket message:', event.data);
        }
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [processReading]);

  return {
    primaryDevice,
    recentShocks,
    alerts,
    isConnected,
    lastReadingAt,
    location,
    path,
  };
}
