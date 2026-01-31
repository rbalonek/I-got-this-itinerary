import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TripContext = createContext();

const STORAGE_KEY = 'i-got-this-itinerary-data';

// Item types
export const ITEM_TYPES = {
  STAY: 'stay',
  TRAVEL: 'travel',
  ACTIVITY: 'activity',
};

// Travel subtypes
export const TRAVEL_TYPES = {
  TRAIN: 'train',
  FLIGHT: 'flight',
  BUS: 'bus',
  CAR: 'car',
  FERRY: 'ferry',
  OTHER: 'other',
};

// Location categories for wishlists
export const LOCATION_CATEGORIES = {
  RESTAURANT: 'restaurant',
  SIGHT: 'sight',
  MUSEUM: 'museum',
  SHOPPING: 'shopping',
  NIGHTLIFE: 'nightlife',
  NATURE: 'nature',
  OTHER: 'other',
};

const initialState = {
  trips: [],
  locations: [], // Wishlist locations
  activeTrip: null,
};

function tripReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload };

    case 'CREATE_TRIP':
      return {
        ...state,
        trips: [...state.trips, action.payload],
        activeTrip: action.payload.id,
      };

    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === action.payload.id ? { ...trip, ...action.payload } : trip
        ),
      };

    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter((trip) => trip.id !== action.payload),
        activeTrip: state.activeTrip === action.payload ? null : state.activeTrip,
      };

    case 'SET_ACTIVE_TRIP':
      return {
        ...state,
        activeTrip: action.payload,
      };

    case 'ADD_ITINERARY_ITEM': {
      const { tripId, item } = action.payload;
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === tripId
            ? { ...trip, items: [...trip.items, item] }
            : trip
        ),
      };
    }

    case 'UPDATE_ITINERARY_ITEM': {
      const { tripId, item } = action.payload;
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                items: trip.items.map((i) =>
                  i.id === item.id ? { ...i, ...item } : i
                ),
              }
            : trip
        ),
      };
    }

    case 'DELETE_ITINERARY_ITEM': {
      const { tripId, itemId } = action.payload;
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === tripId
            ? { ...trip, items: trip.items.filter((i) => i.id !== itemId) }
            : trip
        ),
      };
    }

    case 'ADD_LOCATION':
      return {
        ...state,
        locations: [...state.locations, action.payload],
      };

    case 'UPDATE_LOCATION':
      return {
        ...state,
        locations: state.locations.map((loc) =>
          loc.id === action.payload.id ? { ...loc, ...action.payload } : loc
        ),
      };

    case 'DELETE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((loc) => loc.id !== action.payload),
      };

    default:
      return state;
  }
}

export function TripProvider({ children }) {
  const [state, dispatch] = useReducer(tripReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        dispatch({ type: 'LOAD_DATA', payload: data });
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Trip actions
  const createTrip = (name, description = '', startDate = null, endDate = null, coverImage = null) => {
    const trip = {
      id: uuidv4(),
      name,
      description,
      startDate,
      endDate,
      coverImage,
      items: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_TRIP', payload: trip });
    return trip;
  };

  const updateTrip = (tripData) => {
    dispatch({ type: 'UPDATE_TRIP', payload: tripData });
  };

  const deleteTrip = (tripId) => {
    dispatch({ type: 'DELETE_TRIP', payload: tripId });
  };

  const setActiveTrip = (tripId) => {
    dispatch({ type: 'SET_ACTIVE_TRIP', payload: tripId });
  };

  const getTrip = (tripId) => {
    return state.trips.find((trip) => trip.id === tripId);
  };

  const getActiveTrip = () => {
    return state.trips.find((trip) => trip.id === state.activeTrip);
  };

  // Itinerary item actions
  const addItineraryItem = (tripId, itemData) => {
    const item = {
      id: uuidv4(),
      ...itemData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ITINERARY_ITEM', payload: { tripId, item } });
    return item;
  };

  const updateItineraryItem = (tripId, item) => {
    dispatch({ type: 'UPDATE_ITINERARY_ITEM', payload: { tripId, item } });
  };

  const deleteItineraryItem = (tripId, itemId) => {
    dispatch({ type: 'DELETE_ITINERARY_ITEM', payload: { tripId, itemId } });
  };

  // Location/wishlist actions
  const addLocation = (locationData) => {
    const location = {
      id: uuidv4(),
      ...locationData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOCATION', payload: location });
    return location;
  };

  const updateLocation = (location) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: location });
  };

  const deleteLocation = (locationId) => {
    dispatch({ type: 'DELETE_LOCATION', payload: locationId });
  };

  const value = {
    trips: state.trips,
    locations: state.locations,
    activeTrip: state.activeTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    setActiveTrip,
    getTrip,
    getActiveTrip,
    addItineraryItem,
    updateItineraryItem,
    deleteItineraryItem,
    addLocation,
    updateLocation,
    deleteLocation,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrips() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
}

export default TripContext;
