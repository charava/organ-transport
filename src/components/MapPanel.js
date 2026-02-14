import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapUpdater({ location }) {
  const map = useMap();
  const hasLocated = useRef(false);

  useEffect(() => {
    if (!location) return;
    if (!hasLocated.current) {
      map.setView([location.lat, location.lng], 15);
      hasLocated.current = true;
    } else {
      map.setView([location.lat, location.lng]);
    }
  }, [location, map]);

  return null;
}

export function MapPanel({ location, path, isConnected }) {
  const defaultCenter = [37.7749, -122.4194];
  const pathPositions = path.map((p) => [p.lat, p.lng]);

  return (
    <section className="panel map-panel">
      <h2 className="panel-title">GPS location & route</h2>
      <p className="panel-desc">
        {isConnected
          ? 'Live position and path from connected device'
          : 'Connect a device with GPS to see live tracking'}
      </p>
      {location && (
        <div className="gps-coords">
          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}
      <div className="map-container">
        <MapContainer
          center={location ? [location.lat, location.lng] : defaultCenter}
          zoom={location ? 15 : 4}
          className="leaflet-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {path.length > 1 && (
            <Polyline positions={pathPositions} color="#58a6ff" weight={4} opacity={0.8} />
          )}
          {location && <Marker position={[location.lat, location.lng]} />}
          <MapUpdater location={location} />
        </MapContainer>
      </div>
    </section>
  );
}
