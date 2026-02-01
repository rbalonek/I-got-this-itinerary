import React, { useState, useEffect } from 'react';
import { useTrips, ITEM_TYPES, TRAVEL_TYPES } from '../context/TripContext';
import { fileToBase64, getFaviconUrl, isValidUrl, geocodeLocation } from '../utils/helpers';
import './ItemModal.css';

export default function ItemModal({ tripId, item, itemType, onClose }) {
  const { addItineraryItem, updateItineraryItem } = useTrips();
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(true); // Always show image upload option
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null); // 'success', 'not_found', or null

  const [formData, setFormData] = useState({
    type: itemType || ITEM_TYPES.STAY,
    travelType: TRAVEL_TYPES.TRAIN,
    title: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    price: '',
    url: '',
    notes: '',
    image: null,
    faviconUrl: null,
    coordinates: null,
  });

  useEffect(() => {
    if (item) {
      const startDateTime = item.startDate ? new Date(item.startDate) : null;
      const endDateTime = item.endDate ? new Date(item.endDate) : null;

      setFormData({
        type: item.type || itemType || ITEM_TYPES.STAY,
        travelType: item.travelType || TRAVEL_TYPES.TRAIN,
        title: item.title || '',
        location: item.location || '',
        startDate: startDateTime ? startDateTime.toISOString().split('T')[0] : '',
        startTime: startDateTime ? startDateTime.toTimeString().slice(0, 5) : '',
        endDate: endDateTime ? endDateTime.toISOString().split('T')[0] : '',
        endTime: endDateTime ? endDateTime.toTimeString().slice(0, 5) : '',
        price: item.price || '',
        url: item.url || '',
        notes: item.notes || '',
        image: item.image || null,
        faviconUrl: item.faviconUrl || null,
        coordinates: item.coordinates || null,
      });
      // Show success status if item already has coordinates
      if (item.coordinates) {
        setGeocodeStatus('success');
      }
    }
  }, [item, itemType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Update favicon when URL changes
    if (name === 'url' && isValidUrl(value)) {
      setFormData((prev) => ({ ...prev, faviconUrl: getFaviconUrl(value) }));
    }

    // Reset geocode status when location changes
    if (name === 'location') {
      setGeocodeStatus(null);
    }
  };

  const handleGeocodeLocation = async (locationValue) => {
    const location = locationValue || formData.location;
    if (!location || location.trim().length < 3) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeStatus(null);

    try {
      const result = await geocodeLocation(location);
      if (result) {
        setFormData((prev) => ({
          ...prev,
          coordinates: { lat: result.lat, lng: result.lng },
        }));
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('not_found');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      setGeocodeStatus('not_found');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData((prev) => ({ ...prev, image: base64 }));
        setParseSuccess(null);
      } catch (error) {
        console.error('Error reading image:', error);
      }
    }
  };

  const handleExtractFromImage = async () => {
    if (!formData.image) return;

    setIsParsingImage(true);
    setParseSuccess(null);
    setScrapeError(null);

    try {
      const response = await fetch('/.netlify/functions/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: formData.image, itemType: formData.type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fieldsFound = [];
          const updates = {};

          if (data.title) { updates.title = data.title; fieldsFound.push('title'); }
          if (data.location) { updates.location = data.location; fieldsFound.push('location'); }
          if (data.startDate) { updates.startDate = data.startDate; fieldsFound.push('start date'); }
          if (data.startTime) { updates.startTime = data.startTime; fieldsFound.push('start time'); }
          if (data.endDate) { updates.endDate = data.endDate; fieldsFound.push('end date'); }
          if (data.endTime) { updates.endTime = data.endTime; fieldsFound.push('end time'); }
          if (data.price) { updates.price = data.price; fieldsFound.push('price'); }
          if (data.coordinates) {
            updates.coordinates = data.coordinates;
            fieldsFound.push('map location');
            setGeocodeStatus('success');
          }

          if (fieldsFound.length > 0) {
            setFormData((prev) => ({ ...prev, ...updates }));
            setParseSuccess(`Extracted: ${fieldsFound.join(', ')}`);
          } else {
            setParseSuccess('Could not extract any fields. Please fill in manually.');
          }
        } else {
          setParseSuccess('Could not extract information. Please fill in manually.');
        }
      } else {
        setParseSuccess('Failed to process image. Please fill in manually.');
      }
    } catch (error) {
      console.error('Error parsing image:', error);
      setParseSuccess('Error processing image. Please fill in manually.');
    } finally {
      setIsParsingImage(false);
    }
  };

  const handleScrapeUrl = async () => {
    if (!formData.url || !isValidUrl(formData.url)) {
      setScrapeError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setScrapeError(null);

    try {
      const response = await fetch('/.netlify/functions/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url, itemType: formData.type }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData((prev) => ({
          ...prev,
          title: data.title || prev.title,
          location: data.location || prev.location,
          startDate: data.startDate || prev.startDate,
          startTime: data.startTime || prev.startTime,
          endDate: data.endDate || prev.endDate,
          endTime: data.endTime || prev.endTime,
          price: data.price || prev.price,
          coordinates: data.coordinates || prev.coordinates,
          faviconUrl: getFaviconUrl(formData.url),
        }));
        if (data.coordinates) {
          setGeocodeStatus('success');
        }
      } else {
        setScrapeError(data.error || 'Could not extract information from URL');
        setShowImageUpload(true);
      }
    } catch (error) {
      console.error('Error scraping URL:', error);
      setScrapeError('Failed to scrape URL. Try uploading a screenshot instead.');
      setShowImageUpload(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const startDateTime = formData.startDate && formData.startTime
      ? new Date(`${formData.startDate}T${formData.startTime}`)
      : formData.startDate
        ? new Date(formData.startDate)
        : null;

    const endDateTime = formData.endDate && formData.endTime
      ? new Date(`${formData.endDate}T${formData.endTime}`)
      : formData.endDate
        ? new Date(formData.endDate)
        : null;

    const itemData = {
      type: formData.type,
      travelType: formData.type === ITEM_TYPES.TRAVEL ? formData.travelType : null,
      title: formData.title,
      location: formData.location,
      startDate: startDateTime ? startDateTime.toISOString() : null,
      endDate: endDateTime ? endDateTime.toISOString() : null,
      price: formData.price,
      url: formData.url,
      notes: formData.notes,
      image: formData.image,
      faviconUrl: formData.faviconUrl,
      coordinates: formData.coordinates,
    };

    if (item) {
      updateItineraryItem(tripId, { ...item, ...itemData });
    } else {
      addItineraryItem(tripId, itemData);
    }
    onClose();
  };

  const getTypeLabel = () => {
    switch (formData.type) {
      case ITEM_TYPES.STAY:
        return 'Stay';
      case ITEM_TYPES.TRAVEL:
        return 'Travel';
      case ITEM_TYPES.ACTIVITY:
        return 'Activity';
      default:
        return 'Item';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? 'Edit' : 'Add'} {getTypeLabel()}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* URL Scraping Section */}
          <div className="scrape-section">
            <label>Import from URL</label>
            <div className="url-input-group">
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="Paste a link (Airbnb, train ticket, etc.)"
              />
              <button
                type="button"
                className="btn-scrape"
                onClick={handleScrapeUrl}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Fetch
                  </>
                )}
              </button>
            </div>
            {scrapeError && (
              <div className="scrape-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {scrapeError}
              </div>
            )}
          </div>

          {/* Image Upload Section */}
          <div className="form-group">
            <label>Upload Screenshot</label>
            <div className="image-upload-section">
              {formData.image ? (
                <>
                  <div className="image-preview-small">
                    <img src={formData.image} alt="Uploaded" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, image: null }));
                        setParseSuccess(null);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-extract"
                    onClick={handleExtractFromImage}
                    disabled={isParsingImage}
                  >
                    {isParsingImage ? (
                      <>
                        <span className="loading-spinner"></span>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10,9 9,9 8,9" />
                        </svg>
                        Extract Info
                      </>
                    )}
                  </button>
                </>
              ) : (
                <label className="upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    hidden
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Screenshot
                </label>
              )}
            </div>
            {parseSuccess && (
              <div className={`parse-result ${parseSuccess.includes('Extracted') ? 'success' : 'info'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {parseSuccess.includes('Extracted') ? (
                    <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></>
                  ) : (
                    <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                  )}
                </svg>
                {parseSuccess}
              </div>
            )}
            <p className="helper-text">
              Upload a screenshot of your booking and click "Extract Info" to auto-fill the details.
            </p>
          </div>

          <div className="divider">
            <span>or fill in manually</span>
          </div>

          {/* Travel Type Selector */}
          {formData.type === ITEM_TYPES.TRAVEL && (
            <div className="form-group">
              <label>Travel Type</label>
              <div className="travel-type-grid">
                {Object.entries(TRAVEL_TYPES).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`travel-type-btn ${formData.travelType === value ? 'active' : ''}`}
                    onClick={() => setFormData((prev) => ({ ...prev, travelType: value }))}
                  >
                    {value === 'train' && '🚂'}
                    {value === 'flight' && '✈️'}
                    {value === 'bus' && '🚌'}
                    {value === 'car' && '🚗'}
                    {value === 'ferry' && '⛴️'}
                    {value === 'other' && '🚀'}
                    <span>{key.charAt(0) + key.slice(1).toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={
                formData.type === ITEM_TYPES.STAY
                  ? 'e.g., Airbnb in Rome'
                  : formData.type === ITEM_TYPES.TRAVEL
                    ? 'e.g., Rome to Venice'
                    : 'e.g., Colosseum Tour'
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <div className="location-input-group">
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                onBlur={() => handleGeocodeLocation()}
                placeholder="e.g., Rome, Italy"
              />
              {isGeocoding && (
                <span className="geocode-indicator loading">
                  <span className="loading-spinner small"></span>
                </span>
              )}
              {!isGeocoding && geocodeStatus === 'success' && (
                <span className="geocode-indicator success" title="Location found on map">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </span>
              )}
              {!isGeocoding && geocodeStatus === 'not_found' && (
                <span className="geocode-indicator warning" title="Location not found - won't appear on map">
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

          <div className="form-row">
            <div className="form-group">
              <label>
                {formData.type === ITEM_TYPES.STAY ? 'Check-in' : 'Start'}
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                {formData.type === ITEM_TYPES.STAY ? 'Check-out' : 'End'}
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price</label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g., $150/night or €45"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {item ? 'Save Changes' : `Add ${getTypeLabel()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
