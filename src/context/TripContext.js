import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { uploadDataUrlImage, isDataUrl } from '../lib/storage';
import {
  loadCache,
  saveCache,
  enqueueOp,
  flushQueue,
  pendingCount,
  isOnline,
} from '../lib/offline';
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
          trip.id === tripId ? { ...trip, items: [...trip.items, item] } : trip
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
                items: trip.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)),
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
      return { ...state, locations: [...state.locations, action.payload] };

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
  const { user } = useAuth();
  const [online, setOnline] = useState(isOnline());
  const [pendingSync, setPendingSync] = useState(0);

  // Every mutation goes through the queue: the optimistic dispatch already
  // updated the UI; this records the write durably and flushes it when online.
  const queueWrite = (op) => {
    if (!user) return;
    enqueueOp(user.id, op);
    setPendingSync(pendingCount(user.id));
    flushQueue(supabase, user.id, setPendingSync);
  };

  // Load this user's data on sign-in; clear it on sign-out.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      dispatch({ type: 'RESET' });
      return;
    }

    // 1) Instant hydrate from the local cache — works with no signal.
    const cached = loadCache(user.id);
    if (cached) {
      dispatch({ type: 'LOAD_DATA', payload: cached });
    }
    setPendingSync(pendingCount(user.id));

    // 2) Replay any writes queued during a previous offline session.
    flushQueue(supabase, user.id, setPendingSync);

    // 3) Refresh from the server when reachable.
    (async () => {
      const [tripsRes, itemsRes, locationsRes] = await Promise.all([
        supabase.from('trips').select('*').order('created_at', { ascending: true }),
        supabase.from('itinerary_items').select('*').order('created_at', { ascending: true }),
        supabase.from('locations').select('*').order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      if (tripsRes.error || itemsRes.error || locationsRes.error) {
        // Offline or transient error — keep showing the cache. Only fall back
        // to empty if we had nothing cached to show.
        if (!cached) dispatch({ type: 'LOAD_DATA', payload: { trips: [], locations: [] } });
        return;
      }

      const itemsByTrip = {};
      for (const row of itemsRes.data) {
        (itemsByTrip[row.trip_id] ||= []).push(rowToItem(row));
      }

      const trips = tripsRes.data.map((row) => rowToTrip(row, itemsByTrip[row.id] || []));
      const locations = locationsRes.data.map(rowToLocation);

      dispatch({ type: 'LOAD_DATA', payload: { trips, locations } });
      saveCache(user.id, { trips, locations });

      // One-time, best-effort migration of any legacy inline base64 images.
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

  // Persist a fresh snapshot to the cache whenever the data changes.
  useEffect(() => {
    if (user && !state.loading) {
      saveCache(user.id, { trips: state.trips, locations: state.locations });
    }
  }, [state.trips, state.locations, state.loading, user]);

  // Track connectivity; flush the queue the moment we come back online.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (user) flushQueue(supabase, user.id, setPendingSync);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
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
    queueWrite({ op: 'insert', table: 'trips', values: tripToRow(trip) });
    return trip;
  };

  const updateTrip = (tripData) => {
    const merged = { ...state.trips.find((t) => t.id === tripData.id), ...tripData };
    dispatch({ type: 'UPDATE_TRIP', payload: tripData });
    queueWrite({
      op: 'update',
      table: 'trips',
      values: tripToRow(merged),
      match: { column: 'id', value: tripData.id },
    });
  };

  const deleteTrip = (tripId) => {
    dispatch({ type: 'DELETE_TRIP', payload: tripId });
    // itinerary_items are removed automatically via ON DELETE CASCADE.
    queueWrite({ op: 'delete', table: 'trips', match: { column: 'id', value: tripId } });
  };

  const setActiveTrip = (tripId) => {
    dispatch({ type: 'SET_ACTIVE_TRIP', payload: tripId });
  };

  const getTrip = (tripId) => state.trips.find((trip) => trip.id === tripId);

  const getActiveTrip = () => state.trips.find((trip) => trip.id === state.activeTrip);

  // Itinerary item actions
  const addItineraryItem = (tripId, itemData) => {
    const item = {
      id: uuidv4(),
      ...itemData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ITINERARY_ITEM', payload: { tripId, item } });
    queueWrite({
      op: 'insert',
      table: 'itinerary_items',
      values: { id: item.id, trip_id: tripId, data: withoutId(item) },
    });
    return item;
  };

  const updateItineraryItem = (tripId, item) => {
    dispatch({ type: 'UPDATE_ITINERARY_ITEM', payload: { tripId, item } });
    queueWrite({
      op: 'update',
      table: 'itinerary_items',
      values: { data: withoutId(item) },
      match: { column: 'id', value: item.id },
    });
  };

  const deleteItineraryItem = (tripId, itemId) => {
    dispatch({ type: 'DELETE_ITINERARY_ITEM', payload: { tripId, itemId } });
    queueWrite({
      op: 'delete',
      table: 'itinerary_items',
      match: { column: 'id', value: itemId },
    });
  };

  // Location/wishlist actions
  const addLocation = (locationData) => {
    const location = {
      id: uuidv4(),
      ...locationData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOCATION', payload: location });
    queueWrite({
      op: 'insert',
      table: 'locations',
      values: { id: location.id, data: withoutId(location) },
    });
    return location;
  };

  const updateLocation = (location) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: location });
    queueWrite({
      op: 'update',
      table: 'locations',
      values: { data: withoutId(location) },
      match: { column: 'id', value: location.id },
    });
  };

  const deleteLocation = (locationId) => {
    dispatch({ type: 'DELETE_LOCATION', payload: locationId });
    queueWrite({
      op: 'delete',
      table: 'locations',
      match: { column: 'id', value: locationId },
    });
  };

  const value = {
    trips: state.trips,
    locations: state.locations,
    activeTrip: state.activeTrip,
    loading: state.loading,
    online,
    pendingSync,
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
