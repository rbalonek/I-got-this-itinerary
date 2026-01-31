import React from 'react'
import { Routes, Route } from "react-router-dom";
import About from '../screens/About/About';
import Home from '../screens/Home/Home';

export default function MainContainer() {
  return (
    <Routes>
    <Route path="/about" element={<About />} />
    <Route path="/" element={<Home />} />
    </Routes>
  )
}