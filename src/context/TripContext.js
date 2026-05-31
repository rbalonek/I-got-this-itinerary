import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { uploadDataUrlImage, isDataUrl } from '../lib/storage';
import { useAuth } from './AuthContext';

const TripContext = createContext();

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
  LODGING: 'lodging',
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
  loading: true,
};

// ---- Row <-> app-object mappers -------------------------------------------
// Trips use typed columns; items and locations keep their rich nested shapes
// in a jsonb `data` column so the rest of the app reads identical field names.

const tripToRow = (trip) => ({
  id: trip.id,
  name: trip.name,
  description: trip.description ?? '',
  start_date: trip.startDate ?? null,
  end_date: trip.endDate ?? null,
  cover_image: trip.coverImage ?? null,
});

const rowToTrip = (row, items = []) => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  coverImage: row.cover_image ?? null,
  createdAt: row.created_at,
  items,
});

const rowToItem = (row) => ({ id: row.id, ...row.data });
const rowToLocation = (row) => ({ id: row.id, ...row.data });

// Strip the id out of an object before storing it in a jsonb `data` column
// (the id lives in its own column).
const withoutId = ({ id, ...rest }) => rest;

function tripReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, loading: false };

    case 'RESET':
      return { ...initialState, loading: false };

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

// Surfaces Supabase write failures without blocking the optimistic UI.
const reportError = (label) => ({ error }) => {
  if (error) console.error(`Supabase ${label} failed:`, error.message);
};

export function TripProvider({ children }) {
  const [state, dispatch] = useReducer(tripReducer, initialState);
  const { user } = useAuth();

  // Load this user's data whenever they sign in; clear it when they sign out.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      dispatch({ type: 'RESET' });
      return;
    }

    (async () => {
      const [tripsRes, itemsRes, locationsRes] = await Promise.all([
        supabase.from('trips').select('*').order('created_at', { ascending: true }),
        supabase.from('itinerary_items').select('*').order('created_at', { ascending: true }),
        supabase.from('locations').select('*').order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      if (tripsRes.error || itemsRes.error || locationsRes.error) {
        console.error(
          'Failed to load data:',
          tripsRes.error?.message || itemsRes.error?.message || locationsRes.error?.message
        );
        dispatch({ type: 'LOAD_DATA', payload: { trips: [], locations: [] } });
        return;
      }

      // Group items under their trip.
      const itemsByTrip = {};
      for (const row of itemsRes.data) {
        (itemsByTrip[row.trip_id] ||= []).push(rowToItem(row));
      }

      const trips = tripsRes.data.map((row) => rowToTrip(row, itemsByTrip[row.id] || []));
      const locations = locationsRes.data.map(rowToLocation);

      dispatch({ type: 'LOAD_DATA', payload: { trips, locations } });

      // One-time, best-effort migration: legacy items stored their screenshot
      // inline as base64, which bloats every load. Move each into Storage and
      // replace it with a URL so future loads are small. Sequential + guarded
      // so a failure just leaves that image inline (still works, just heavier).
      for (const trip of trips) {
        for (const it of trip.items) {
          if (cancelled) return;
          if (!isDataUrl(it.image)) continue;
          try {
            const url = await uploadDataUrlImage(it.image, user.id);
            const migrated = { ...it, image: url };
            const { error } = await supabase
              .from('itinerary_items')
              .update({ data: withoutId(migrated) })
              .eq('id', it.id);
            if (error) throw error;
            if (cancelled) return;
            dispatch({
              type: 'UPDATE_ITINERARY_ITEM',
              payload: { tripId: trip.id, item: migrated },
            });
          } catch (e) {
            console.error('Image migration failed for item', it.id, e.message);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
    supabase.from('trips').insert(tripToRow(trip)).then(reportError('insert trip'));
    return trip;
  };

  const updateTrip = (tripData) => {
    dispatch({ type: 'UPDATE_TRIP', payload: tripData });
    supabase
      .from('trips')
      .update(tripToRow({ ...state.trips.find((t) => t.id === tripData.id), ...tripData }))
      .eq('id', tripData.id)
      .then(reportError('update trip'));
  };

  const deleteTrip = (tripId) => {
    dispatch({ type: 'DELETE_TRIP', payload: tripId });
    // itinerary_items are removed automatically via ON DELETE CASCADE.
    supabase.from('trips').delete().eq('id', tripId).then(reportError('delete trip'));
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
    supabase
      .from('itinerary_items')
      .insert({ id: item.id, trip_id: tripId, data: withoutId(item) })
      .then(reportError('insert item'));
    return item;
  };

  const updateItineraryItem = (tripId, item) => {
    dispatch({ type: 'UPDATE_ITINERARY_ITEM', payload: { tripId, item } });
    supabase
      .from('itinerary_items')
      .update({ data: withoutId(item) })
      .eq('id', item.id)
      .then(reportError('update item'));
  };

  const deleteItineraryItem = (tripId, itemId) => {
    dispatch({ type: 'DELETE_ITINERARY_ITEM', payload: { tripId, itemId } });
    supabase.from('itinerary_items').delete().eq('id', itemId).then(reportError('delete item'));
  };

  // Location/wishlist actions
  const addLocation = (locationData) => {
    const location = {
      id: uuidv4(),
      ...locationData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOCATION', payload: location });
    supabase
      .from('locations')
      .insert({ id: location.id, data: withoutId(location) })
      .then(reportError('insert location'));
    return location;
  };

  const updateLocation = (location) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: location });
    supabase
      .from('locations')
      .update({ data: withoutId(location) })
      .eq('id', location.id)
      .then(reportError('update location'));
  };

  const deleteLocation = (locationId) => {
    dispatch({ type: 'DELETE_LOCATION', payload: locationId });
    supabase.from('locations').delete().eq('id', locationId).then(reportError('delete location'));
  };

  const value = {
    trips: state.trips,
    locations: state.locations,
    activeTrip: state.activeTrip,
    loading: state.loading,
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
