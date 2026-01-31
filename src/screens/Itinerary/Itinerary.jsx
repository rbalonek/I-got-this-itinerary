import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../../context/TripContext';
import { formatDate, formatDateTime, getItemIcon, getItemTypeColor } from '../../utils/helpers';
import './Itinerary.css';

export default function Itinerary() {
  const { trips, activeTrip, setActiveTrip } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState(activeTrip);
  const navigate = useNavigate();

  // Get all items from all trips, sorted by date
  const getAllItems = () => {
    let allItems = [];
    trips.forEach((trip) => {
      trip.items.forEach((item) => {
        allItems.push({ ...item, tripId: trip.id, tripName: trip.name });
      });
    });
    return allItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const getFilteredItems = () => {
    if (!selectedTripId || selectedTripId === 'all') {
      return getAllItems();
    }
    const trip = trips.find((t) => t.id === selectedTripId);
    if (!trip) return [];
    return trip.items
      .map((item) => ({ ...item, tripId: trip.id, tripName: trip.name }))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const items = getFilteredItems();

  // Group items by date
  const groupedItems = {};
  items.forEach((item) => {
    if (!item.startDate) return;
    const dateKey = formatDate(item.startDate, 'yyyy-MM-dd');
    if (!groupedItems[dateKey]) {
      groupedItems[dateKey] = [];
    }
    groupedItems[dateKey].push(item);
  });

  const sortedDates = Object.keys(groupedItems).sort();

  const handleTripChange = (e) => {
    const value = e.target.value;
    setSelectedTripId(value === 'all' ? null : value);
    if (value !== 'all') {
      setActiveTrip(value);
    }
  };

  const handleItemClick = (tripId) => {
    navigate(`/trip/${tripId}`);
  };

  return (
    <div className="itinerary-container">
      <div className="itinerary-header">
        <div>
          <h2>Itinerary</h2>
          <p className="itinerary-subtitle">View all your upcoming events</p>
        </div>
        <select
          className="trip-filter"
          value={selectedTripId || 'all'}
          onChange={handleTripChange}
        >
          <option value="all">All Trips</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name}
            </option>
          ))}
        </select>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>No trips yet</h3>
          <p>Create a trip to start building your itinerary.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Create a Trip
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No items in itinerary</h3>
          <p>Add stays, travel, or activities to your trips.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            View Trips
          </button>
        </div>
      ) : (
        <div className="calendar-view">
          {sortedDates.map((date) => (
            <div key={date} className="calendar-day">
              <div className="calendar-date-header">
                <span className="day-name">{formatDate(date, 'EEEE')}</span>
                <span className="day-date">{formatDate(date, 'MMM d, yyyy')}</span>
              </div>
              <div className="calendar-items">
                {groupedItems[date].map((item) => (
                  <div
                    key={item.id}
                    className="calendar-item"
                    onClick={() => handleItemClick(item.tripId)}
                    style={{ '--item-color': getItemTypeColor(item.type) }}
                  >
                    <div className="item-time-badge">
                      {formatDateTime(item.startDate).split(' ').slice(3).join(' ')}
                    </div>
                    <div className="item-icon">
                      {item.image ? (
                        <img src={item.image} alt="" />
                      ) : item.faviconUrl ? (
                        <img src={item.faviconUrl} alt="" />
                      ) : (
                        getItemIcon(item.type, item.travelType)
                      )}
                    </div>
                    <div className="item-details">
                      <h4>{item.title}</h4>
                      {item.location && <span className="item-location">{item.location}</span>}
                    </div>
                    <div className="item-trip-badge">{item.tripName}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
