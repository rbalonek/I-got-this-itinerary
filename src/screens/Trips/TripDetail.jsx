import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrips, ITEM_TYPES } from '../../context/TripContext';
import { formatDate, formatDateTime, groupItemsByDate, getItemIcon, getItemTypeColor } from '../../utils/helpers';
import ItemModal from '../../components/ItemModal';
import './TripDetail.css';

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { getTrip, deleteItineraryItem } = useTrips();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemType, setItemType] = useState(null);

  const trip = getTrip(tripId);

  if (!trip) {
    return (
      <div className="not-found">
        <h2>Trip not found</h2>
        <p>This trip may have been deleted.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Back to Trips
        </button>
      </div>
    );
  }

  const groupedItems = groupItemsByDate(trip.items);
  const sortedDates = Object.keys(groupedItems).sort();

  const handleAddItem = (type) => {
    setItemType(type);
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemType(item.type);
    setIsModalOpen(true);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItineraryItem(tripId, itemId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setItemType(null);
  };

  return (
    <div className="trip-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Back to Trips
      </button>

      <div
        className="trip-hero"
        style={{
          backgroundImage: trip.coverImage
            ? `url(${trip.coverImage})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="trip-hero-content">
          <h1>{trip.name}</h1>
          {trip.description && <p>{trip.description}</p>}
          {trip.startDate && (
            <div className="trip-dates">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(trip.startDate)}
              {trip.endDate && ` - ${formatDate(trip.endDate)}`}
            </div>
          )}
        </div>
      </div>

      <div className="add-item-buttons">
        <button
          className="add-item-btn stay"
          onClick={() => handleAddItem(ITEM_TYPES.STAY)}
        >
          <span className="item-icon">🏨</span>
          Add Stay
        </button>
        <button
          className="add-item-btn travel"
          onClick={() => handleAddItem(ITEM_TYPES.TRAVEL)}
        >
          <span className="item-icon">🚂</span>
          Add Travel
        </button>
        <button
          className="add-item-btn activity"
          onClick={() => handleAddItem(ITEM_TYPES.ACTIVITY)}
        >
          <span className="item-icon">🎯</span>
          Add Activity
        </button>
      </div>

      {trip.items.length === 0 ? (
        <div className="empty-itinerary">
          <div className="empty-icon">📋</div>
          <h3>No items yet</h3>
          <p>Start building your itinerary by adding stays, travel, or activities.</p>
        </div>
      ) : (
        <div className="itinerary-timeline">
          {sortedDates.map((date) => (
            <div key={date} className="timeline-day">
              <div className="timeline-date">
                <span className="date-label">{formatDate(date, 'EEEE')}</span>
                <span className="date-value">{formatDate(date, 'MMM d, yyyy')}</span>
              </div>
              <div className="timeline-items">
                {groupedItems[date].map((item) => (
                  <div
                    key={item.id}
                    className="timeline-item"
                    style={{ '--item-color': getItemTypeColor(item.type) }}
                  >
                    <div className="item-time">
                      {formatDateTime(item.startDate).split(' ').slice(3).join(' ')}
                    </div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-icon-badge">
                          {item.image ? (
                            <img src={item.image} alt="" />
                          ) : item.faviconUrl ? (
                            <img src={item.faviconUrl} alt="" />
                          ) : (
                            getItemIcon(item.type, item.travelType)
                          )}
                        </span>
                        <div className="item-title-section">
                          <h4>{item.title}</h4>
                          <span className="item-type-badge">{item.type}</span>
                        </div>
                        <div className="item-actions">
                          <button
                            className="item-action edit"
                            onClick={() => handleEditItem(item)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="item-action delete"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {item.location && (
                        <div className="item-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {item.location}
                        </div>
                      )}
                      {item.endDate && (
                        <div className="item-duration">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                          Until {formatDateTime(item.endDate)}
                        </div>
                      )}
                      {item.price && (
                        <div className="item-price">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          {item.price}
                        </div>
                      )}
                      {item.notes && (
                        <p className="item-notes">{item.notes}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="item-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Details
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15,3 21,3 21,9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ItemModal
          tripId={tripId}
          item={editingItem}
          itemType={itemType}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
