import { useEffect, useRef, useState } from 'react';
import { Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './CurrentLocation.css';

// Pulsing "blue dot" for the user's position (Google-Maps style).
const userIcon = L.divIcon({
  className: 'current-location-marker',
  html: '<div class="current-location-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const LOCATE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/>' +
  '<line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/>' +
  '<line x1="19" y1="12" x2="22" y2="12"/></svg>';

/**
 * Renders inside a <MapContainer>. Adds a "locate me" control button; on click
 * it asks the browser for the user's position and shows a pulsing dot plus an
 * accuracy circle, then flies the map there.
 */
export default function CurrentLocation() {
  const map = useMap();
  const [position, setPosition] = useState(null); // [lat, lng]
  const [accuracy, setAccuracy] = useState(null); // meters
  const [status, setStatus] = useState('idle'); // 'idle' | 'locating' | 'error'
  const btnRef = useRef(null);

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setPosition([latitude, longitude]);
        setAccuracy(acc);
        setStatus('idle');
        map.flyTo([latitude, longitude], 14, { duration: 0.75 });
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Add the locate button as a Leaflet control once the map is ready.
  useEffect(() => {
    const control = L.control({ position: 'topright' });
    control.onAdd = () => {
      const btn = L.DomUtil.create('button', 'locate-me-btn');
      btn.type = 'button';
      btn.title = 'Show my location';
      btn.innerHTML = LOCATE_ICON;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', locate);
      btnRef.current = btn;
      return btn;
    };
    control.addTo(map);
    return () => control.remove();
    // locate closes over only stable values (map + setters), so add once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Reflect status on the imperatively-created button.
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.classList.toggle('locating', status === 'locating');
    btn.classList.toggle('error', status === 'error');
    btn.title =
      status === 'error'
        ? 'Location unavailable — check browser permissions'
        : status === 'locating'
          ? 'Finding your location…'
          : 'Show my location';
  }, [status]);

  if (!position) return null;

  return (
    <>
      {accuracy != null && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.12,
            weight: 1,
          }}
        />
      )}
      <Marker position={position} icon={userIcon}>
        <Popup>You are here</Popup>
      </Marker>
    </>
  );
}
