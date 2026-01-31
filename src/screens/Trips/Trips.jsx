import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../../context/TripContext';
import { formatDate } from '../../utils/helpers';
import TripModal from './TripModal';
import './Trips.css';

export default function Trips() {
  const { trips, deleteTrip, setActiveTrip } = useTrips();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const navigate = useNavigate();

  const handleTripClick = (trip) => {
    setActiveTrip(trip.id);
    navigate(`/trip/${trip.id}`);
  };

  const handleEdit = (e, trip) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleDelete = (e, tripId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip?')) {
      deleteTrip(tripId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrip(null);
  };

  return (
    <div className="trips-container">
      <div className="trips-header">
        <div>
          <h2>Your Trips</h2>
          <p className="trips-subtitle">Plan and organize your adventures</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span className="btn-icon">+</span>
          New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌍</div>
          <h3>No trips yet</h3>
          <p>Start planning your next adventure by creating a new trip.</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="trip-card"
              onClick={() => handleTripClick(trip)}
            >
              <div
                className="trip-card-cover"
                style={{
                  backgroundImage: trip.coverImage
                    ? `url(${trip.coverImage})`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                <div className="trip-card-overlay">
                  <div className="trip-card-actions">
                    <button
                      className="action-btn edit"
                      onClick={(e) => handleEdit(e, trip)}
                      title="Edit trip"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => handleDelete(e, trip.id)}
                      title="Delete trip"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="trip-card-content">
                <h3 className="trip-card-title">{trip.name}</h3>
                {trip.description && (
                  <p className="trip-card-description">{trip.description}</p>
                )}
                <div className="trip-card-meta">
                  {trip.startDate && (
                    <span className="trip-date">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDate(trip.startDate)}
                      {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                    </span>
                  )}
                  <span className="trip-items-count">
                    {trip.items.length} {trip.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TripModal
          trip={editingTrip}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
