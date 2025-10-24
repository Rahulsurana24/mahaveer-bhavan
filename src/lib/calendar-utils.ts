import { format, parse, differenceInDays, addDays } from 'date-fns';

/**
 * Calendar Utilities for Enhanced Calendar Management System
 * Handles Upass/Biyashna rule engine, sunset/sunrise calculations, and calendar logic
 */

// Bengaluru coordinates for sunset/sunrise calculation
export const BENGALURU_COORDS = {
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata',
};

// Base date for Upass/Biyashna alternating pattern
// This should be set to a known Upass day
const BASE_UPASS_DATE = new Date('2025-01-01'); // Set Day 1 as Upass

/**
 * Calculate whether a given date should be Upass or Biyashna based on alternating rule
 * Day 1 (base): Upass
 * Day 2: Biyashna
 * Day 3: Upass
 * etc.
 */
export function calculateDefaultStatus(date: Date): 'upass' | 'biyashna' {
  const daysDifference = differenceInDays(date, BASE_UPASS_DATE);
  const remainder = daysDifference % 2;

  // If remainder is 0, it's same as base date (Upass)
  // If remainder is 1 (or -1), it's Biyashna
  if (remainder === 0) {
    return 'upass';
  } else {
    return 'biyashna';
  }
}

/**
 * Calculate sunrise and sunset times for Bengaluru
 * Uses simplified solar calculation algorithm
 * Returns times in HH:mm format (24-hour)
 */
export function calculateSunTimes(date: Date): { sunrise: string; sunset: string } {
  const { latitude, longitude } = BENGALURU_COORDS;

  // Get day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Simplified solar declination calculation
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));

  // Hour angle calculation
  const latRad = latitude * (Math.PI / 180);
  const declRad = declination * (Math.PI / 180);

  const cosHourAngle = -Math.tan(latRad) * Math.tan(declRad);

  // Calculate hour angle
  let hourAngle;
  if (cosHourAngle > 1) {
    // Polar night
    hourAngle = 0;
  } else if (cosHourAngle < -1) {
    // Midnight sun
    hourAngle = 180;
  } else {
    hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
  }

  // Convert hour angle to time
  const sunriseHour = 12 - (hourAngle / 15) - (longitude / 15) + (330 / 60); // 330 is IST offset in minutes
  const sunsetHour = 12 + (hourAngle / 15) - (longitude / 15) + (330 / 60);

  // Convert to HH:mm format
  const formatTime = (decimalHour: number): string => {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return {
    sunrise: formatTime(sunriseHour),
    sunset: formatTime(sunsetHour),
  };
}

/**
 * Fetch sunrise/sunset times from external API (sunrise-sunset.org)
 * Falls back to calculated times if API fails
 */
export async function fetchSunTimes(date: Date): Promise<{ sunrise: string; sunset: string }> {
  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${BENGALURU_COORDS.latitude}&lng=${BENGALURU_COORDS.longitude}&date=${dateStr}&formatted=0`
    );

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error('API returned error status');
    }

    // Parse ISO times and convert to IST HH:mm format
    const sunriseUTC = new Date(data.results.sunrise);
    const sunsetUTC = new Date(data.results.sunset);

    // Add IST offset (5:30)
    const sunriseIST = new Date(sunriseUTC.getTime() + (5.5 * 60 * 60 * 1000));
    const sunsetIST = new Date(sunsetUTC.getTime() + (5.5 * 60 * 60 * 1000));

    return {
      sunrise: format(sunriseIST, 'HH:mm'),
      sunset: format(sunsetIST, 'HH:mm'),
    };
  } catch (error) {
    console.error('Failed to fetch sun times from API, using calculated times:', error);
    return calculateSunTimes(date);
  }
}

/**
 * Type definitions for calendar entries
 */
export type CalendarEntryType = 'upass' | 'biyashna' | 'holiday' | 'custom_event';

export interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  entry_type: CalendarEntryType;
  is_manual_override: boolean;
  title?: string;
  reason?: string;
  description?: string;
  sunrise_time?: string;
  sunset_time?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Festival {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD format
  description?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  is_active: boolean;
}

export interface DayActivity {
  type: 'event' | 'trip' | 'upass' | 'biyashna' | 'holiday' | 'festival' | 'custom_event';
  id: string;
  title: string;
  description?: string;
  isDefault?: boolean; // True if it's a default rule, not manual override
  sunTimes?: { sunrise: string; sunset: string };
}

/**
 * Merge all activities for a given date
 * Returns a list of activities including: events, trips, upass/biyashna, holidays, festivals, custom events
 */
export function mergeActivitiesForDate(
  date: Date,
  calendarEntry: CalendarEntry | null,
  events: any[],
  trips: any[],
  festivals: Festival[]
): DayActivity[] {
  const activities: DayActivity[] = [];
  const dateStr = format(date, 'yyyy-MM-dd');

  // Add calendar entry (Upass/Biyashna/Holiday/Custom Event)
  if (calendarEntry) {
    if (calendarEntry.entry_type === 'holiday') {
      activities.push({
        type: 'holiday',
        id: calendarEntry.id,
        title: calendarEntry.title || 'Holiday',
        description: calendarEntry.reason || calendarEntry.description,
      });
    } else if (calendarEntry.entry_type === 'custom_event') {
      activities.push({
        type: 'custom_event',
        id: calendarEntry.id,
        title: calendarEntry.title || 'Custom Event',
        description: calendarEntry.description,
        sunTimes: calendarEntry.sunrise_time && calendarEntry.sunset_time
          ? { sunrise: calendarEntry.sunrise_time, sunset: calendarEntry.sunset_time }
          : undefined,
      });
    } else {
      // Upass or Biyashna
      activities.push({
        type: calendarEntry.entry_type,
        id: calendarEntry.id,
        title: calendarEntry.entry_type === 'upass' ? 'Upass' : 'Biyashna',
        description: calendarEntry.description,
        isDefault: !calendarEntry.is_manual_override,
        sunTimes: calendarEntry.sunrise_time && calendarEntry.sunset_time
          ? { sunrise: calendarEntry.sunrise_time, sunset: calendarEntry.sunset_time }
          : undefined,
      });
    }
  } else {
    // No calendar entry exists, use default rule
    const defaultStatus = calculateDefaultStatus(date);
    activities.push({
      type: defaultStatus,
      id: `default-${dateStr}`,
      title: defaultStatus === 'upass' ? 'Upass' : 'Biyashna',
      description: 'Default schedule',
      isDefault: true,
    });
  }

  // Add events
  events.forEach(event => {
    if (format(new Date(event.date), 'yyyy-MM-dd') === dateStr) {
      activities.push({
        type: 'event',
        id: event.id,
        title: event.title,
        description: event.description,
      });
    }
  });

  // Add trips
  trips.forEach(trip => {
    const startDate = format(new Date(trip.start_date), 'yyyy-MM-dd');
    const endDate = format(new Date(trip.end_date), 'yyyy-MM-dd');
    if (dateStr >= startDate && dateStr <= endDate) {
      activities.push({
        type: 'trip',
        id: trip.id,
        title: trip.title,
        description: trip.description,
      });
    }
  });

  // Add festivals
  festivals.forEach(festival => {
    if (format(new Date(festival.date), 'yyyy-MM-dd') === dateStr && festival.is_active) {
      activities.push({
        type: 'festival',
        id: festival.id,
        title: festival.name,
        description: festival.description,
      });
    }
  });

  return activities;
}

/**
 * Get color for activity type
 */
export function getActivityColor(type: DayActivity['type']): string {
  switch (type) {
    case 'upass':
      return '#00A36C'; // Emerald green
    case 'biyashna':
      return '#B8860B'; // Gold
    case 'holiday':
      return '#EF4444'; // Red
    case 'event':
      return '#3B82F6'; // Blue
    case 'trip':
      return '#8B5CF6'; // Purple
    case 'festival':
      return '#F59E0B'; // Amber
    case 'custom_event':
      return '#06B6D4'; // Cyan
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Get icon name for activity type (Lucide icon names)
 */
export function getActivityIcon(type: DayActivity['type']): string {
  switch (type) {
    case 'upass':
    case 'biyashna':
      return 'Calendar';
    case 'holiday':
      return 'X';
    case 'event':
      return 'PartyPopper';
    case 'trip':
      return 'Plane';
    case 'festival':
      return 'Sparkles';
    case 'custom_event':
      return 'Plus';
    default:
      return 'Calendar';
  }
}
