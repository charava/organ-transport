import { memo, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchDirections, decodePolyline } from '../utils/directions';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const destinationIcon = new L.DivIcon({
  html: '<div style="background:#f85149;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  className: 'destination-marker',
  iconSize: [16, 16],
});

function RouteMapUpdater({ location, destination, path, routePath }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    const points = [...path.map((p) => [p.lat, p.lng])];
    if (location) points.push([location.lat, location.lng]);
    if (routePath?.length) points.push(...routePath);
    if (destination) points.push([destination.lat, destination.lng]);
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    if (!initialized.current && location) {
      map.setView([location.lat, location.lng], 13);
      initialized.current = true;
    }
  }, [location, destination, path, routePath, map]);

  return null;
}

function RouteModalInner({ isOpen, onClose, location, path, destination, transportLabel }) {
  const defaultCenter = [37.7749, -122.4194];
  const pathPositions = path.map((p) => [p.lat, p.lng]);
  const [routePath, setRoutePath] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  useEffect(() => {
    if (!isOpen || !location || !destination) {
      setRoutePath([]);
      setRouteError(null);
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    fetchDirections(location.lat, location.lng, destination.lat, destination.lng)
      .then((data) => {
        if (data.polyline) {
          setRoutePath(decodePolyline(data.polyline));
        } else {
          setRoutePath([]);
        }
      })
      .catch((err) => {
        setRouteError(err.message);
        setRoutePath([]);
      })
      .finally(() => setRouteLoading(false));
  }, [isOpen, location, destination]);

  if (!isOpen) return null;

  const routePositions = routePath.map(([lat, lng]) => [lat, lng]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content route-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{transportLabel || `Route to ${destination?.name || 'Destination'}`}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="route-desc">
            {path.length > 1 && 'Path taken (blue) · '}
            {location && destination && (
              routeLoading ? 'Loading route... · ' : routeError ? `Route unavailable (${routeError}) · ` : 'Route via Google Maps (orange) · '
            )}
            {destination ? destination.name : '—'}
          </p>
          <div className="route-map-container">
            <MapContainer
              center={location ? [location.lat, location.lng] : destination ? [destination.lat, destination.lng] : defaultCenter}
              zoom={13}
              className="leaflet-map"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {path.length > 1 && (
                <Polyline positions={pathPositions} color="#58a6ff" weight={5} opacity={0.9} />
              )}
              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  color="#f0883e"
                  weight={5}
                  opacity={0.9}
                />
              )}
              {location && destination && routePositions.length <= 1 && !routeLoading && (
                <Polyline
                  positions={[[location.lat, location.lng], [destination.lat, destination.lng]]}
                  color="#f0883e"
                  weight={4}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
              {location && <Marker position={[location.lat, location.lng]} />}
              {destination && (
                <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
              )}
              <RouteMapUpdater location={location} destination={destination} path={path} routePath={routePositions} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RouteModal = memo(RouteModalInner);
