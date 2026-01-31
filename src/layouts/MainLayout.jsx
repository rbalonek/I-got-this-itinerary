import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MainLayout.css';

const navItems = [
  { path: '/', label: 'Trips', icon: 'trips' },
  { path: '/itinerary', label: 'Itinerary', icon: 'itinerary' },
  { path: '/locations', label: 'Locations', icon: 'locations' },
  { path: '/map', label: 'Map', icon: 'map' },
];

const NavIcon = ({ icon }) => {
  const icons = {
    trips: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
    itinerary: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    locations: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  };
  return <span className="nav-icon">{icons[icon]}</span>;
};

export default function MainLayout({ children }) {
  const location = useLocation();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">✈️</span>
            <h1>I Got This</h1>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive || (item.path === '/' && location.pathname === '/') ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <NavIcon icon={item.icon} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="app-main">{children}</main>
    </div>
  );
}
