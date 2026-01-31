import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Trips from '../screens/Trips/Trips';
import TripDetail from '../screens/Trips/TripDetail';
import Itinerary from '../screens/Itinerary/Itinerary';
import Locations from '../screens/Locations/Locations';
import MapView from '../screens/Map/MapView';

export default function MainContainer() {
  return (
    <Routes>
      <Route path="/" element={<Trips />} />
      <Route path="/trip/:tripId" element={<TripDetail />} />
      <Route path="/itinerary" element={<Itinerary />} />
      <Route path="/locations" element={<Locations />} />
      <Route path="/map" element={<MapView />} />
    </Routes>
  );
}
