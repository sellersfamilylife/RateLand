import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icon path — React bundlers don't resolve
// the icon URLs from leaflet's CSS automatically.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Renders an interactive Leaflet map centered on a city.
 * Only renders when lat/lng are provided.
 *
 * @param {{ lat: number, lng: number, city: string, state: string }} props
 */
export default function CityMap({ lat, lng, city, state }) {
  if (lat == null || lng == null) return null;

  return (
    <div
      className="overflow-hidden rounded-lg border shadow-sm"
      role="region"
      aria-label={`Map showing ${city}, ${state}`}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        scrollWheelZoom={false}
        className="h-72 w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[lat, lng]}>
          <Popup>
            {city}, {state}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
