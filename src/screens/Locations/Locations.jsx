import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTrips, LOCATION_CATEGORIES } from '../../context/TripContext';
import { getCategoryIcon, getCategoryColor } from '../../utils/helpers';
import LocationModal from './LocationModal';
import 'leaflet/dist/leaflet.css';
import './Locations.css';

// Fix for default marker icons in Leaflet with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon creator
const createCustomIcon = (category) => {
  const color = getCategoryColor(category);
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin" style="background-color: ${color}">
        <span class="marker-icon">${getCategoryIcon(category)}</span>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -35],
  });
};

// Component to handle map view updates
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function Locations() {
  const { locations, deleteLocation } = useTrips();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mapCenter, setMapCenter] = useState([41.9028, 12.4964]); // Default to Rome

  const filteredLocations = selectedCategory === 'all'
    ? locations
    : locations.filter((loc) => loc.category === selectedCategory);

  // Get locations with coordinates for map
  const mappableLocations = filteredLocations.filter(
    (loc) => loc.coordinates && loc.coordinates.lat && loc.coordinates.lng
  );

  const handleEdit = (location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleDelete = (locationId) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      deleteLocation(locationId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleLocationClick = (location) => {
    if (location.coordinates) {
      setMapCenter([location.coordinates.lat, location.coordinates.lng]);
    }
  };

  return (
    <div className="locations-container">
      <div className="locations-header">
        <div>
          <h2>Locations</h2>
          <p className="locations-subtitle">Wishlist and places to explore</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span className="btn-icon">+</span>
          Add Location
        </button>
      </div>

      <div className="locations-layout">
        <div className="locations-sidebar">
          <div className="category-filter">
            <button
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {Object.entries(LOCATION_CATEGORIES).map(([key, value]) => (
              <button
                key={key}
                className={`category-btn ${selectedCategory === value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(value)}
                style={{ '--category-color': getCategoryColor(value) }}
              >
                {getCategoryIcon(value)} {key.charAt(0) + key.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="locations-list">
            {filteredLocations.length === 0 ? (
              <div className="empty-locations">
                <p>No locations yet. Add places you want to visit!</p>
              </div>
            ) : (
              filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="location-card"
                  onClick={() => handleLocationClick(location)}
                  style={{ '--category-color': getCategoryColor(location.category) }}
                >
                  <div className="location-icon">
                    {getCategoryIcon(location.category)}
                  </div>
                  <div className="location-info">
                    <h4>{location.name}</h4>
                    {location.address && (
                      <span className="location-address">{location.address}</span>
                    )}
                    {location.notes && (
                      <p className="location-notes">{location.notes}</p>
                    )}
                  </div>
                  <div className="location-actions">
                    <button
                      className="action-btn edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(location);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(location.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="locations-map">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            {mappableLocations.map((location) => (
              <Marker
                key={location.id}
                position={[location.coordinates.lat, location.coordinates.lng]}
                icon={createCustomIcon(location.category)}
              >
                <Popup>
                  <div className="map-popup">
                    <h4>{location.name}</h4>
                    {location.address && <p>{location.address}</p>}
                    {location.notes && <p className="popup-notes">{location.notes}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {isModalOpen && (
        <LocationModal
          location={editingLocation}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
