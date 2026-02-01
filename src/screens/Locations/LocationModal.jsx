import React, { useState, useEffect } from 'react';
import { useTrips, LOCATION_CATEGORIES } from '../../context/TripContext';
import { getCategoryIcon } from '../../utils/helpers';
import './LocationModal.css';

export default function LocationModal({ location, onClose }) {
  const { addLocation, updateLocation } = useTrips();
  const [isSearching, setIsSearching] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null); // 'success', 'not_found', or null

  const [formData, setFormData] = useState({
    name: '',
    category: LOCATION_CATEGORIES.RESTAURANT,
    address: '',
    notes: '',
    url: '',
    coordinates: null,
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        category: location.category || LOCATION_CATEGORIES.RESTAURANT,
        address: location.address || '',
        notes: location.notes || '',
        url: location.url || '',
        coordinates: location.coordinates || null,
      });
      // Show success status if location already has coordinates
      if (location.coordinates) {
        setGeocodeStatus('success');
      }
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Reset geocode status when address changes
    if (name === 'address') {
      setGeocodeStatus(null);
      setFormData((prev) => ({ ...prev, coordinates: null }));
    }
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  const handleSearchLocation = async () => {
    if (!formData.address.trim() || formData.address.trim().length < 3) return;

    setIsSearching(true);
    setGeocodeStatus(null);
    try {
      // Use Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`,
        {
          headers: {
            'User-Agent': 'I-Got-This-Itinerary/1.0',
          },
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setFormData((prev) => ({
          ...prev,
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
        }));
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('not_found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeStatus('not_found');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (location) {
      updateLocation({ ...location, ...formData });
    } else {
      addLocation(formData);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{location ? 'Edit Location' : 'Add Location'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <div className="category-grid">
              {Object.entries(LOCATION_CATEGORIES).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`category-option ${formData.category === value ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(value)}
                >
                  <span className="category-icon">{getCategoryIcon(value)}</span>
                  <span>{key.charAt(0) + key.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Trattoria da Luigi"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <div className="address-input-group">
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleSearchLocation}
                placeholder="Enter an address to show on map..."
              />
              {isSearching && (
                <span className="geocode-indicator loading">
                  <span className="loading-spinner"></span>
                </span>
              )}
              {!isSearching && geocodeStatus === 'success' && (
                <span className="geocode-indicator success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </span>
              )}
              {!isSearching && geocodeStatus === 'not_found' && (
                <span className="geocode-indicator warning">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
              )}
            </div>
            {geocodeStatus === 'success' && formData.coordinates && (
              <span className="helper-text success">Will appear on map</span>
            )}
            {geocodeStatus === 'not_found' && (
              <span className="helper-text warning">Location not found - try a more specific address</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any notes about this place..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {location ? 'Save Changes' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
