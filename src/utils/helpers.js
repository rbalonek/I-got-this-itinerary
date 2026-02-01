import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) ? format(parsed, formatStr) : '';
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM d, yyyy h:mm a');
};

export const formatTime = (date) => {
  return formatDate(date, 'h:mm a');
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate) return '';
  const start = formatDateTime(startDate);
  if (!endDate) return start;
  const end = formatDateTime(endDate);
  return `${start} - ${end}`;
};

export const getDayOfWeek = (date) => {
  return formatDate(date, 'EEEE');
};

export const groupItemsByDate = (items) => {
  const groups = {};
  items.forEach((item) => {
    const dateKey = formatDate(item.startDate, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  // Sort items within each group by start time
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  });

  return groups;
};

export const getItemIcon = (type, subtype) => {
  const icons = {
    stay: '🏨',
    travel: {
      train: '🚂',
      flight: '✈️',
      bus: '🚌',
      car: '🚗',
      ferry: '⛴️',
      other: '🚀',
    },
    activity: '🎯',
  };

  if (type === 'travel' && subtype) {
    return icons.travel[subtype] || icons.travel.other;
  }
  return icons[type] || '📍';
};

export const getCategoryIcon = (category) => {
  const icons = {
    lodging: '🏨',
    restaurant: '🍽️',
    sight: '🏛️',
    museum: '🖼️',
    shopping: '🛍️',
    nightlife: '🌙',
    nature: '🌳',
    other: '📍',
  };
  return icons[category] || icons.other;
};

export const getCategoryColor = (category) => {
  const colors = {
    lodging: '#667eea',
    restaurant: '#FF6B6B',
    sight: '#4ECDC4',
    museum: '#9B59B6',
    shopping: '#F39C12',
    nightlife: '#8E44AD',
    nature: '#27AE60',
    other: '#95A5A6',
  };
  return colors[category] || colors.other;
};

export const getItemTypeColor = (type) => {
  const colors = {
    stay: '#667eea',
    travel: '#f093fb',
    activity: '#4fd1c5',
  };
  return colors[type] || '#a0aec0';
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const extractDomain = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return '';
  }
};

export const getFaviconUrl = (url) => {
  const domain = extractDomain(url);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

// Geocode a location string to coordinates using OpenStreetMap Nominatim
export const geocodeLocation = async (locationString) => {
  if (!locationString || locationString.trim().length < 3) {
    return null;
  }

  try {
    const encodedLocation = encodeURIComponent(locationString.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'I-Got-This-Itinerary/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Debounce helper for geocoding
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
