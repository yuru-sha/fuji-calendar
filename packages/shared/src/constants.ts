// Shared constants for the application

export const APP_CONFIG = {
  NAME: "Fuji Calendar",
  VERSION: "0.4.0",
} as const;

export const API_ENDPOINTS = {
  CALENDAR: "/api/calendar",
  LOCATIONS: "/api/locations",
  EVENTS: "/api/events",
  WEATHER: "/api/weather",
} as const;
