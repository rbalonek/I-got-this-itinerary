import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTrips } from '../../context/TripContext';
import { formatDate, formatDateTime, getItemIcon, getItemTypeColor, getFaviconUrl } from '../../utils/helpers';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for itinerary items
const createItemIcon = (item) => {
  const color = getItemTypeColor(item.type);
  const iconContent = item.image || item.faviconUrl;

  let innerContent;
  if (iconContent) {
    innerContent = `<img src="${iconContent}" alt="" class="marker-image" />`;
  } else {
    innerContent = `<span class="marker-emoji">${getItemIcon(item.type, item.travelType)}</span>`;
  }

  return L.divIcon({
    className: 'item-marker',
    html: `
      <div class="item-marker-pin" style="background-color: ${color}">
        ${innerContent}
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -40],
  });
};

// Component to fit map bounds
function MapBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

export default function MapView() {
  const { trips } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  // Get all itinerary items with coordinates
  const allItems = useMemo(() => {
    let items = [];
    trips.forEach((trip) => {
      trip.items.forEach((item) => {
        if (item.coordinates) {
          items.push({ ...item, tripId: trip.id, tripName: trip.name });
        }
      });
    });
    return items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [trips]);

  // Filter items based on selected trip
  const filteredItems = useMemo(() => {
    if (selectedTripId === 'all') {
      return allItems;
    }
    return allItems.filter((item) => item.tripId === selectedTripId);
  }, [allItems, selectedTripId]);

  // Get positions for map bounds
  const positions = useMemo(() => {
    return filteredItems.map((item) => [item.coordinates.lat, item.coordinates.lng]);
  }, [filteredItems]);

  // Create polyline for travel route
  const routePositions = useMemo(() => {
    if (selectedTripId === 'all') return [];
    return filteredItems.map((item) => [item.coordinates.lat, item.coordinates.lng]);
  }, [filteredItems, selectedTripId]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  // Default center (Rome)
  const defaultCenter = [41.9028, 12.4964];

  return (
    <div className="map-view-container">
      <div className="map-header">
        <div>
          <h2>Trip Map</h2>
          <p className="map-subtitle">Visualize your journey</p>
        </div>
        <select
          className="trip-filter"
          value={selectedTripId}
          onChange={(e) => setSelectedTripId(e.target.value)}
        >
          <option value="all">All Trips</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name}
            </option>
          ))}
        </select>
      </div>

      <div className="map-layout">
        <div className="map-sidebar">
          <h3>Events</h3>
          {filteredItems.length === 0 ? (
            <div className="empty-events">
              <p>No events with locations yet.</p>
              <p className="hint">Add coordinates when creating itinerary items to see them on the map.</p>
            </div>
          ) : (
            <div className="events-list">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`event-card ${selectedItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item)}
                  style={{ '--item-color': getItemTypeColor(item.type) }}
                >
                  <div className="event-number">{index + 1}</div>
                  <div className="event-icon">
                    {item.image ? (
                      <img src={item.image} alt="" />
                    ) : item.faviconUrl ? (
                      <img src={item.faviconUrl} alt="" />
                    ) : (
                      getItemIcon(item.type, item.travelType)
                    )}
                  </div>
                  <div className="event-info">
                    <h4>{item.title}</h4>
                    <span className="event-date">
                      {formatDateTime(item.startDate)}
                    </span>
                    {item.location && (
                      <span className="event-location">{item.location}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="map-content">
          <MapContainer
            center={defaultCenter}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {positions.length > 0 && <MapBounds positions={positions} />}

            {/* Route line */}
            {routePositions.length > 1 && (
              <Polyline
                positions={routePositions}
                color="#667eea"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}

            {/* Markers */}
            {filteredItems.map((item, index) => (
              <Marker
                key={item.id}
                position={[item.coordinates.lat, item.coordinates.lng]}
                icon={createItemIcon(item)}
                eventHandlers={{
                  click: () => handleItemClick(item),
                }}
              >
                <Popup>
                  <div className="item-popup">
                    <div className="popup-header">
                      <span className="popup-number">{index + 1}</span>
                      <span
                        className="popup-type"
                        style={{ background: getItemTypeColor(item.type) }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <h4>{item.title}</h4>
                    <p className="popup-date">{formatDateTime(item.startDate)}</p>
                    {item.location && <p className="popup-location">{item.location}</p>}
                    {item.price && <p className="popup-price">{item.price}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="popup-link"
                      >
                        View Details
                      </a>
                    )}
                    <p className="popup-trip">{item.tripName}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: getItemTypeColor('stay') }}></span>
              Stays
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: getItemTypeColor('travel') }}></span>
              Travel
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: getItemTypeColor('activity') }}></span>
              Activities
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
