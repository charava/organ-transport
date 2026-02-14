import { useEffect, useState } from 'react';
import './App.css';
import { TEMP_SAFE_RANGE } from './data/mockTransportData';
import { useLiveReadings } from './hooks/useLiveReadings';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function StatusBadge({ status }) {
  const map = {
    ok: { label: 'OK', class: 'status-ok' },
    warning: { label: 'Warning', class: 'status-warning' },
    alert: { label: 'Alert', class: 'status-alert' },
  };
  const { label, class: c } = map[status] || map.ok;
  return <span className={`badge ${c}`}>{label}</span>;
}

function formatRelativeTime(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function App() {
  const { primaryDevice, recentShocks, alerts, isConnected, lastReadingAt } = useLiveReadings();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastReadingAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [lastReadingAt]);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  const tempStatus =
    primaryDevice.temperature != null &&
    (primaryDevice.temperature < TEMP_SAFE_RANGE.min || primaryDevice.temperature > TEMP_SAFE_RANGE.max)
      ? 'alert'
      : 'ok';
  const shockStatus =
    primaryDevice.lastShock && primaryDevice.lastShock.g >= 1.5 ? 'warning' : 'ok';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Organ Transport Monitoring</h1>
          <p className="dashboard-subtitle">
            Temperature & shock monitoring for transplant logistics
          </p>
        </div>
        <div className="header-meta">
          <span className={`live-dot ${isConnected ? 'live-dot-active' : ''}`} />
          {isConnected ? 'Live' : 'Disconnected'}
          <span className="header-time">{formatDate(new Date().toISOString())}</span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{isConnected ? 1 : 0}</span>
            <span className="stat-label">Active transport</span>
          </div>
          <div className="stat-card stat-alerts">
            <span className="stat-value">{criticalCount}</span>
            <span className="stat-label">Critical alerts</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{warningCount}</span>
            <span className="stat-label">Warnings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{isConnected ? 1 : 0}</span>
            <span className="stat-label">Devices online</span>
          </div>
        </section>

        <div className="panels-grid">
          <section className="panel temperature-panel">
            <h2 className="panel-title">Temperature monitoring</h2>
            <p className="panel-desc">Safe range: {TEMP_SAFE_RANGE.min}°C – {TEMP_SAFE_RANGE.max}°C</p>
            <div className="temp-display">
              <span className="temp-value">
                {primaryDevice.temperature != null ? primaryDevice.temperature : '—'}
              </span>
              <span className="temp-unit">°C</span>
            </div>
            <div className="temp-bar-wrap">
              <div
                className="temp-bar"
                style={{
                  left: primaryDevice.temperature != null
                    ? `${Math.max(0, Math.min(100, (primaryDevice.temperature / 30) * 100))}%`
                    : '0%',
                }}
              />
              <div
                className="temp-range"
                style={{
                  left: `${(TEMP_SAFE_RANGE.min / 30) * 100}%`,
                  width: `${((TEMP_SAFE_RANGE.max - TEMP_SAFE_RANGE.min) / 30) * 100}%`,
                }}
              />
            </div>
            <div className="temp-scale">
              <span>0</span>
              <span>{TEMP_SAFE_RANGE.min}–{TEMP_SAFE_RANGE.max}</span>
              <span>30°C</span>
            </div>
            <div className="device-id">Device: {primaryDevice.deviceId || '—'}</div>
            {lastReadingAt && (
              <div className="last-reading">
                Last reading: {formatTime(lastReadingAt)} ({formatRelativeTime(lastReadingAt)})
              </div>
            )}
          </section>

          <section className="panel humidity-panel">
            <h2 className="panel-title">Humidity monitoring</h2>
            <p className="panel-desc">Relative humidity (%)</p>
            <div className="humidity-display-main">
              <span className="humidity-value">
                {primaryDevice.humidity != null ? primaryDevice.humidity.toFixed(1) : '—'}
              </span>
              <span className="humidity-unit">%</span>
            </div>
            <div className="humidity-bar-wrap">
              <div
                className="humidity-bar"
                style={{
                  width: `${Math.min(100, primaryDevice.humidity ?? 0)}%`,
                }}
              />
            </div>
            <div className="humidity-scale">
              <span>0%</span>
              <span>100%</span>
            </div>
            {lastReadingAt && (
              <div className="last-reading">Last reading: {formatTime(lastReadingAt)}</div>
            )}
          </section>

          <section className="panel shock-panel">
            <h2 className="panel-title">Shock sensing</h2>
            <p className="panel-desc">Impact / vibration events (g-force)</p>
            <div className="shock-summary">
              {lastReadingAt && (
                <div className="last-reading">Last data: {formatTime(lastReadingAt)}</div>
              )}
              {recentShocks.length === 0 ? (
                <p className="shock-none">No recent shock events</p>
              ) : (
                <>
                  <div className="shock-last">
                    Last event: <strong>{recentShocks[0].gForce}g</strong> — {formatTime(recentShocks[0].at)}
                  </div>
                  <ul className="shock-list">
                    {recentShocks.map((s) => (
                      <li key={s.id} className={`shock-item severity-${s.severity}`}>
                        <span className="shock-g">{s.gForce}g</span>
                        <span className="shock-meta">{s.deviceId} · {formatTime(s.at)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </div>

        <section className="panel transports-panel">
          <h2 className="panel-title">Active transport</h2>
          <p className="panel-desc">
            {isConnected
              ? 'Live data from connected microcontroller'
              : 'Connect a microcontroller via the bridge server to see live data'}
          </p>
          <div className="table-wrap">
            <table className="transports-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Shock</th>
                  <th>Status</th>
                  <th>Last reading</th>
                </tr>
              </thead>
              <tbody>
                <tr className={isConnected ? 'transport-live' : 'transport-disconnected'}>
                  <td><code>{primaryDevice.deviceId || '—'}</code></td>
                  <td>
                    <span className="temp-cell">
                      {primaryDevice.temperature != null ? `${primaryDevice.temperature}°C` : '—'}
                    </span>
                    {isConnected && <StatusBadge status={tempStatus} />}
                  </td>
                  <td>
                    {primaryDevice.humidity != null ? `${primaryDevice.humidity.toFixed(1)}%` : '—'}
                  </td>
                  <td>
                    {primaryDevice.lastShock ? `${primaryDevice.lastShock.g}g` : '—'}
                    {isConnected && primaryDevice.lastShock && <StatusBadge status={shockStatus} />}
                  </td>
                  <td>
                    {isConnected ? (
                      <span className="status-live">Live</span>
                    ) : (
                      <span className="status-offline">Offline</span>
                    )}
                  </td>
                  <td>{lastReadingAt ? formatTime(lastReadingAt) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel alerts-panel">
          <h2 className="panel-title">Alerts</h2>
          {alerts.length === 0 ? (
            <p className="alerts-none">No active alerts</p>
          ) : (
            <ul className="alerts-list">
              {alerts.map((a) => (
                <li key={a.id} className={`alert-item severity-${a.severity}`}>
                  <span className="alert-badge">{a.severity}</span>
                  <span className="alert-message">{a.message}</span>
                  <span className="alert-time">{formatDate(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
