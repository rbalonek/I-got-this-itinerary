import React, { useState, useEffect } from 'react';
import { useTrips, LOCATION_CATEGORIES } from '../../context/TripContext';
import { getCategoryIcon } from '../../utils/helpers';
import './LocationModal.css';

export default function LocationModal({ location, onClose }) {
  const { addLocation, updateLocation } = useTrips();
  const [isSearching, setIsSearching] = useState(false);

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
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  const handleSearchLocation = async () => {
    if (!formData.address.trim()) return;

    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setFormData((prev) => ({
          ...prev,
          address: result.display_name,
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
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
                placeholder="Search for an address..."
              />
              <button
                type="button"
                className="search-btn"
                onClick={handleSearchLocation}
                disabled={isSearching}
              >
                {isSearching ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </button>
            </div>
            {formData.coordinates && (
              <span className="coordinates-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Location found
              </span>
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
