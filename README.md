# I Got This - Travel Itinerary Planner

A modern, visually appealing travel itinerary web application built with React and designed for deployment on Netlify.

## Features

### Trip Management
- Create and manage multiple trips
- Add cover images and trip details
- Set trip dates and descriptions

### Smart Itinerary Building
- Add **Stays** (hotels, Airbnb, etc.)
- Add **Travel** (trains, flights, buses, cars, ferries)
- Add **Activities** (tours, museums, events)

### AI-Powered Smart Scraping
- Paste URLs from booking sites (Airbnb, train tickets, etc.)
- Automatically extracts dates, times, locations, and prices using AI (ChatGPT or Claude)
- Image upload with OCR fallback when URL scraping fails

### Locations & Wishlist
- Add restaurants, sights, museums, and other points of interest
- Categorize locations with visual icons
- Interactive map powered by Leaflet.js
- Geocoding with OpenStreetMap

### Trip Map View
- Visualize your entire itinerary on a map
- See travel routes with connecting lines
- Filter by trip
- Custom markers with icons/images

### Modern Design
- Soft, relaxing color palette
- Mobile-responsive layout
- Smooth animations and transitions
- Easy navigation with bottom tabs on mobile

## Tech Stack

- **Frontend**: React 18 with React Router
- **Maps**: Leaflet.js with React-Leaflet
- **Styling**: Custom CSS with CSS Variables
- **State Management**: React Context API
- **Storage**: LocalStorage for data persistence
- **Backend**: Netlify Functions (serverless)
- **AI Integration**: Anthropic Claude API / OpenAI API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd i-got-this-itinerary

# Install dependencies
npm install

# Start the development server
npm start
```

### Environment Variables

For the AI-powered scraping features, set these environment variables in Netlify:

```
ANTHROPIC_API_KEY=your-anthropic-api-key
# OR
OPENAI_API_KEY=your-openai-api-key
```

## Deployment to Netlify

### Option 1: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod
```

### Option 2: Connect to Git

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables for AI APIs

## Project Structure

```
src/
├── components/         # Reusable components
│   └── ItemModal.jsx   # Add/edit itinerary items
├── context/
│   └── TripContext.js  # Global state management
├── layouts/
│   └── MainLayout.jsx  # App layout with navigation
├── screens/
│   ├── Trips/          # Trip management screens
│   ├── Itinerary/      # Calendar view of events
│   ├── Locations/      # Wishlist and locations map
│   └── Map/            # Trip map visualization
├── utils/
│   └── helpers.js      # Utility functions
├── App.js
└── index.js

netlify/
└── functions/
    ├── scrape-url.js   # URL scraping with AI
    └── parse-image.js  # Image OCR with AI

public/
├── index.html
├── manifest.json
└── _redirects
```

## Usage Guide

### Creating a Trip
1. Click "New Trip" on the Trips tab
2. Enter trip name, dates, and optional cover image
3. Click "Create Trip"

### Adding Itinerary Items
1. Open a trip by clicking on it
2. Click "Add Stay", "Add Travel", or "Add Activity"
3. Either paste a URL and click "Fetch" to auto-fill details
4. Or manually enter the information
5. If scraping fails, upload a screenshot for OCR

### Managing Locations
1. Go to the Locations tab
2. Click "Add Location"
3. Select category and enter details
4. Search for address to add map coordinates
5. View all locations on the interactive map

### Viewing Trip Map
1. Go to the Map tab
2. Select a specific trip or view all
3. Click on markers for details
4. See the travel route connecting events

## License

MIT License
