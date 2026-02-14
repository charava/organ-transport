import { useState, useEffect } from 'react';
import { getNearestHospitalsAsync } from '../utils/hospitals';

export function RedirectTriage({ alert, currentDestination, location, onConfirm, onReject, isOpen }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !location) return;
    setLoading(true);
    setError(null);
    getNearestHospitalsAsync(location.lat, location.lng, 5)
      .then(setHospitals)
      .catch((err) => {
        setError(err.message);
        setHospitals([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, location]);

  if (!isOpen || !alert) return null;

  const suggested = hospitals[0];

  return (
    <div className="redirect-triage-overlay">
      <div className="redirect-triage-panel">
        <div className="redirect-triage-header">
          <span className="redirect-triage-badge">Redirect suggested</span>
          <h3>Error detected — consider redirect</h3>
          <p className="redirect-triage-alert">{alert.message}</p>
        </div>
        <div className="redirect-triage-body">
          <p className="redirect-triage-desc">
            Current destination: <strong>{currentDestination?.name || '—'}</strong>
          </p>
          <div className="redirect-triage-suggestion">
            <p>Nearest hospitals (from your location):</p>
            {loading ? (
              <p className="redirect-loading">Loading hospitals...</p>
            ) : error ? (
              <p className="redirect-error">{error}</p>
            ) : hospitals.length === 0 ? (
              <p className="redirect-error">No hospitals found. Run: node scripts/processHospitals.js</p>
            ) : (
              <div className="redirect-hospital-list">
                {hospitals.map((h) => (
                  <div
                    key={`${h.lat}-${h.lng}`}
                    className={`redirect-hospital-card ${h === suggested ? 'redirect-hospital-suggested' : ''}`}
                  >
                    <div>
                      <strong>{h.name}</strong>
                      {(h.city || h.state) && (
                        <span className="redirect-hospital-location">
                          {[h.city, h.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                    <span>{h.distance.toFixed(1)} mi away</span>
                    <button
                      className="btn-select-hospital"
                      onClick={() => onConfirm(h)}
                      title="Redirect to this hospital"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="redirect-triage-actions">
          <button className="btn-reject" onClick={onReject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
