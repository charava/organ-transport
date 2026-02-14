import { useState, useEffect, useCallback } from 'react';
import { TEMP_SAFE_RANGE } from '../data/mockTransportData';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';
const SHOCK_WARNING_THRESHOLD = 1.5; // g-force above this = warning
const SHOCK_ALERT_THRESHOLD = 2.5;   // g-force above this = critical
const MAX_RECENT_SHOCKS = 20;
const MAX_ALERTS = 50;

const emptyDevice = { deviceId: null, temperature: null, humidity: null, lastShock: null };

export function useLiveReadings() {
  const [isConnected, setIsConnected] = useState(false);
  const [primaryDevice, setPrimaryDevice] = useState(emptyDevice);
  const [recentShocks, setRecentShocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [lastReadingAt, setLastReadingAt] = useState(null);

  const processReading = useCallback((payload) => {
    const { temp, shock, humidity, deviceId, at, receivedAt } = payload;
    const now = receivedAt || at || new Date().toISOString();
    setLastReadingAt(now);

    setPrimaryDevice((prev) => ({
      ...prev,
      deviceId: deviceId || prev.deviceId,
      temperature: typeof temp === 'number' ? temp : prev.temperature,
      humidity: typeof humidity === 'number' ? humidity : prev.humidity,
      lastShock: shock > 0 ? { g: shock, at: now } : prev.lastShock,
    }));

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

    if (typeof temp === 'number' && (temp < TEMP_SAFE_RANGE.min || temp > TEMP_SAFE_RANGE.max)) {
      setAlerts((prev) => [
        {
          id: Date.now(),
          type: 'temperature',
          severity: 'critical',
          message: `${deviceId || 'Device'}: Temperature ${temp.toFixed(1)}°C — outside safe range (${TEMP_SAFE_RANGE.min}–${TEMP_SAFE_RANGE.max}°C)`,
          at: now,
        },
        ...prev.slice(0, MAX_ALERTS - 1),
      ]);
    }
  }, []);

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
  };
}
