import './App.css';
import {
  activeTransports,
  TEMP_SAFE_RANGE,
} from './data/mockTransportData';
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

function App() {
  const { primaryDevice, recentShocks, alerts, isConnected } = useLiveReadings();
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

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
            <span className="stat-value">{activeTransports.length}</span>
            <span className="stat-label">Active transports</span>
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
            <span className="stat-value">{activeTransports.length}</span>
            <span className="stat-label">Devices online</span>
          </div>
        </section>

        <div className="panels-grid">
          <section className="panel temperature-panel">
            <h2 className="panel-title">Temperature monitoring</h2>
            <p className="panel-desc">Safe range: {TEMP_SAFE_RANGE.min}°C – {TEMP_SAFE_RANGE.max}°C</p>
            <div className="temp-display">
              <span className="temp-value">{primaryDevice.temperature}</span>
              <span className="temp-unit">°C</span>
            </div>
            <div className="temp-bar-wrap">
              <div
                className="temp-bar"
                style={{
                  left: `${Math.max(0, Math.min(100, ((primaryDevice.temperature - 0) / 12) * 100))}%`,
                }}
              />
              <div
                className="temp-range"
                style={{
                  left: `${(TEMP_SAFE_RANGE.min / 12) * 100}%`,
                  width: `${((TEMP_SAFE_RANGE.max - TEMP_SAFE_RANGE.min) / 12) * 100}%`,
                }}
              />
            </div>
            <div className="temp-scale">
              <span>0</span>
              <span>{TEMP_SAFE_RANGE.min}–{TEMP_SAFE_RANGE.max}</span>
              <span>12°C</span>
            </div>
            <div className="device-id">Device: {primaryDevice.deviceId}</div>
          </section>

          <section className="panel shock-panel">
            <h2 className="panel-title">Shock sensing</h2>
            <p className="panel-desc">Impact / vibration events (g-force)</p>
            <div className="shock-summary">
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
          <h2 className="panel-title">Active transports</h2>
          <div className="table-wrap">
            <table className="transports-table">
              <thead>
                <tr>
                  <th>Transport ID</th>
                  <th>Organ</th>
                  <th>Destination</th>
                  <th>Temperature</th>
                  <th>Shock</th>
                  <th>Started</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {activeTransports.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td>{t.organType}</td>
                    <td>{t.destination}</td>
                    <td>
                      <span className="temp-cell">{t.temperature}°C</span>
                      <StatusBadge status={t.tempStatus} />
                    </td>
                    <td>
                      {t.lastShock ? `${t.lastShock.g}g` : '—'}
                      <StatusBadge status={t.shockStatus} />
                    </td>
                    <td>{formatTime(t.startedAt)}</td>
                    <td>{formatTime(t.estimatedArrival)}</td>
                  </tr>
                ))}
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
