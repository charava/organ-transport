import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { getTempRangeForOrgan, getTempStatusForOrgan, activeTransports } from './data/mockTransportData';
import { DEFAULT_DESTINATION } from './data/transportConfig';
import { useLiveReadings } from './hooks/useLiveReadings';
import { MapPanel } from './components/MapPanel';
import { RouteModal } from './components/RouteModal';
import { RedirectTriage } from './components/RedirectTriage';

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
  const { primaryDevice, recentShocks, alerts, isConnected, lastReadingAt, location, path } = useLiveReadings(activeTransports);
  const [, setTick] = useState(0);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [redirectedTo, setRedirectedTo] = useState(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [selectedTransportId, setSelectedTransportId] = useState(null);
  const [routeSnapshot, setRouteSnapshot] = useState(null);
  const [redirectDismissedUntil, setRedirectDismissedUntil] = useState(0);

  useEffect(() => {
    if (!lastReadingAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [lastReadingAt]);

  const criticalAlert = alerts.find((a) => a.severity === 'critical');
  const showRedirectTriage = criticalAlert && Date.now() > redirectDismissedUntil && !redirectedTo;

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  const transportsWithLive = activeTransports.map((t, i) => {
    const isLive = isConnected && t.deviceId === primaryDevice.deviceId;
    const displayLoc = isLive ? (location || { lat: t.lat, lng: t.lng }) : { lat: t.lat, lng: t.lng };
    const displayDest = isLive
      ? destination
      : { name: t.destination, lat: t.destLat ?? t.lat + 0.01, lng: t.destLng ?? t.lng + 0.01 };
    const temp = isLive ? (primaryDevice.temperature ?? t.temperature) : t.temperature;
    const tempStatus = getTempStatusForOrgan(temp, t.organType);
    if (isLive) {
      const shockStatus =
        primaryDevice.lastShock && primaryDevice.lastShock.g >= 1.5 ? 'warning' : 'ok';
      return {
        ...t,
        temperature: primaryDevice.temperature ?? t.temperature,
        humidity: primaryDevice.humidity ?? t.humidity,
        lastShock: primaryDevice.lastShock ?? t.lastShock,
        tempStatus,
        shockStatus,
        location: displayLoc,
        destination: displayDest,
        isLive,
        lastReadingAt: isLive ? lastReadingAt : null,
      };
    }
    return {
      ...t,
      tempStatus,
      location: displayLoc,
      destination: displayDest,
      isLive: false,
      lastReadingAt: null,
    };
  });

  const primaryOrgan = transportsWithLive.find((t) => t.deviceId === primaryDevice.deviceId)?.organType;
  const primaryTempRange = getTempRangeForOrgan(primaryOrgan);

  const handleCloseRouteModal = useCallback(() => {
    setRouteModalOpen(false);
    setSelectedTransportId(null);
    setRouteSnapshot(null);
  }, []);

  const handleConfirmRedirect = (hospital) => {
    setDestination({ name: hospital.name, lat: hospital.lat, lng: hospital.lng });
    setRedirectedTo(hospital);
    setRedirectDismissedUntil(Date.now() + 60000); // Don't show again for 1 minute
  };

  const handleRejectRedirect = () => {
    setRedirectDismissedUntil(Date.now() + 60000); // Don't show again for 1 minute
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <img src="/logo.png" alt="OrganTrail" className="header-logo" />
          <div>
            <h1 className="dashboard-title">OrganTrail</h1>
            <p className="dashboard-subtitle">
              On-ground transport logistics — temperature, shock, humidity & GPS tracking
            </p>
          </div>
        </div>
        <div className="header-meta">
          <span className={`live-dot ${isConnected ? 'live-dot-active' : ''}`} />
          {isConnected ? 'Live' : 'Disconnected'}
          <span className="header-time">{formatDate(new Date().toISOString())}</span>
        </div>
      </header>

      {redirectedTo && (
        <div className="redirect-banner">
          <span className="redirect-banner-icon">↪</span>
          <strong>Redirected</strong>
          <span> — Transport now heading to </span>
          <strong>{redirectedTo.name}</strong>
          {(redirectedTo.city || redirectedTo.state) && (
            <span className="redirect-banner-location">
              {' '}({[redirectedTo.city, redirectedTo.state].filter(Boolean).join(', ')})
            </span>
          )}
        </div>
      )}

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
            <span className="stat-value">{isConnected ? activeTransports.length : activeTransports.length}</span>
            <span className="stat-label">Devices online</span>
          </div>
        </section>

        <div className="panels-grid">
          <section className="panel temperature-panel">
            <h2 className="panel-title">Temperature monitoring</h2>
            <p className="panel-desc">Safe range: {primaryTempRange.min}°C – {primaryTempRange.max}°C{primaryOrgan ? ` (${primaryOrgan})` : ''}</p>
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
                  left: `${(primaryTempRange.min / 30) * 100}%`,
                  width: `${((primaryTempRange.max - primaryTempRange.min) / 30) * 100}%`,
                }}
              />
            </div>
            <div className="temp-scale">
              <span>0</span>
              <span>{primaryTempRange.min}–{primaryTempRange.max}</span>
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

        <MapPanel location={location} path={path} isConnected={isConnected} />

        <section className="panel transports-panel">
          <h2 className="panel-title">Active transports</h2>
          <p className="panel-desc">
            {isConnected
              ? `${activeTransports.length} transports — DEV-001 has live data from microcontroller`
              : `${activeTransports.length} transports with synthetic data. Connect a microcontroller for live updates.`}
          </p>
          <div className="table-wrap">
            <table className="transports-table">
              <thead>
                <tr>
                  <th>Transport</th>
                  <th>Organ</th>
                  <th>Device</th>
                  <th>Destination</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Shock</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last reading</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transportsWithLive.map((t) => (
                  <tr key={t.id} className={t.isLive ? 'transport-live' : ''}>
                    <td><code>{t.id}</code></td>
                    <td>{t.organType}</td>
                    <td><code>{t.deviceId}</code></td>
                    <td>
                      {t.destination?.name ?? t.destination}
                      {t.isLive && redirectedTo && (
                        <span className="badge badge-redirected">Redirected</span>
                      )}
                    </td>
                    <td>
                      <span className="temp-cell">
                        {t.temperature != null ? `${t.temperature}°C` : '—'}
                      </span>
                      {t.isLive && <StatusBadge status={t.tempStatus} />}
                    </td>
                    <td>{t.humidity != null ? `${t.humidity.toFixed(1)}%` : '—'}</td>
                    <td>
                      {t.lastShock ? `${t.lastShock.g}g` : '—'}
                      {t.isLive && t.lastShock && <StatusBadge status={t.shockStatus} />}
                    </td>
                    <td className="location-cell">
                      {t.location
                        ? `${t.location.lat.toFixed(4)}, ${t.location.lng.toFixed(4)}`
                        : '—'}
                    </td>
                    <td>
                      {t.isLive ? (
                        <span className="status-live">Live</span>
                      ) : (
                        <span className="status-offline">Synthetic</span>
                      )}
                    </td>
                    <td>{t.lastReadingAt ? formatTime(t.lastReadingAt) : '—'}</td>
                    <td>
                      <button
                        className="btn-view-route"
                        onClick={() => {
                          const transport = transportsWithLive.find((x) => x.id === t.id);
                          setSelectedTransportId(t.id);
                          setRouteSnapshot({
                            location: transport?.isLive ? (location || transport?.location) : transport?.location,
                            path: transport?.isLive ? [...(path || [])] : [],
                            destination: transport?.destination ?? destination,
                            transportLabel: `${transport?.organType} → ${transport?.destination?.name ?? transport?.destination ?? ''}`,
                          });
                          setRouteModalOpen(true);
                        }}
                        title="View route and path"
                      >
                        View route
                      </button>
                    </td>
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

      <RouteModal
        isOpen={routeModalOpen}
        onClose={handleCloseRouteModal}
        location={routeSnapshot?.location}
        path={routeSnapshot?.path ?? []}
        destination={routeSnapshot?.destination}
        transportLabel={routeSnapshot?.transportLabel}
      />

      <RedirectTriage
        alert={criticalAlert}
        currentDestination={destination}
        location={location || (transportsWithLive[0]?.location ?? { lat: 37.7749, lng: -122.4194 })}
        onConfirm={handleConfirmRedirect}
        onReject={handleRejectRedirect}
        isOpen={showRedirectTriage}
      />
    </div>
  );
}

export default App;
