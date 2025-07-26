// API リクエスト・レスポンスの型定義

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface CalendarEvent {
  id: string;
  type: 'diamond' | 'pearl';
  date: string;
  time: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface CalendarEventsResponse extends ApiResponse<CalendarEvent[]> {}

export interface LocationRequest {
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  description?: string;
}