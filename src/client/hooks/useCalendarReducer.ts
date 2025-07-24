import { useReducer, useCallback } from 'react';
import { CalendarResponse, EventsResponse, FujiEvent, Location } from '../../shared/types';
import { apiClient, getErrorMessage } from '../services/apiClient';

// State型定義
export interface CalendarState {
  calendarData: CalendarResponse | null;
  dayEvents: EventsResponse | null;
  upcomingEvents: FujiEvent[];
  bestShotDays: FujiEvent[];
  locations: Location[];
  loading: boolean;
  upcomingEventsLoaded: boolean;
  error: string | null;
  currentYear: number;
  currentMonth: number;
}

// Action型定義
export type CalendarAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CALENDAR_DATA'; payload: CalendarResponse }
  | { type: 'SET_DAY_EVENTS'; payload: EventsResponse }
  | { type: 'SET_UPCOMING_EVENTS'; payload: FujiEvent[] }
  | { type: 'SET_BEST_SHOT_DAYS'; payload: FujiEvent[] }
  | { type: 'SET_LOCATIONS'; payload: Location[] }
  | { type: 'SET_UPCOMING_EVENTS_LOADED'; payload: boolean }
  | { type: 'SET_CURRENT_DATE'; payload: { year: number; month: number } };

// 初期状態
const initialState: CalendarState = {
  calendarData: null,
  dayEvents: null,
  upcomingEvents: [],
  bestShotDays: [],
  locations: [],
  loading: false,
  upcomingEventsLoaded: false,
  error: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
};

// Reducer関数
function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_CALENDAR_DATA':
      return { ...state, calendarData: action.payload, loading: false };
    
    case 'SET_DAY_EVENTS':
      return { ...state, dayEvents: action.payload, loading: false };
    
    case 'SET_UPCOMING_EVENTS':
      return { 
        ...state, 
        upcomingEvents: action.payload, 
        upcomingEventsLoaded: true,
        loading: false 
      };
    
    case 'SET_BEST_SHOT_DAYS':
      return { ...state, bestShotDays: action.payload, loading: false };
    
    case 'SET_LOCATIONS':
      return { ...state, locations: action.payload, loading: false };
    
    case 'SET_UPCOMING_EVENTS_LOADED':
      return { ...state, upcomingEventsLoaded: action.payload };
    
    case 'SET_CURRENT_DATE':
      return { 
        ...state, 
        currentYear: action.payload.year, 
        currentMonth: action.payload.month 
      };
    
    default:
      return state;
  }
}

// Actions型定義
export interface UseCalendarActions {
  loadMonthlyCalendar: (year: number, month: number) => Promise<void>;
  loadDayEvents: (date: string) => Promise<void>;
  loadUpcomingEvents: (limit?: number) => Promise<void>;
  loadBestShotDays: (year: number, month: number) => Promise<void>;
  loadLocations: () => Promise<void>;
  clearError: () => void;
  setCurrentDate: (year: number, month: number) => void;
}

// useCalendar Hook（useReducer版）
export function useCalendar(): CalendarState & UseCalendarActions {
  const [state, dispatch] = useReducer(calendarReducer, initialState);

  // Action creators
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setCurrentDate = useCallback((year: number, month: number) => {
    dispatch({ type: 'SET_CURRENT_DATE', payload: { year, month } });
  }, []);

  // API呼び出しメソッド
  const loadMonthlyCalendar = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getMonthlyCalendar(year, month);
      dispatch({ type: 'SET_CALENDAR_DATA', payload: response });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`カレンダーデータの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDayEvents = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getDayEvents(date);
      dispatch({ type: 'SET_DAY_EVENTS', payload: response });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`イベントデータの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUpcomingEvents = useCallback(async (limit: number = 30) => {
    if (state.upcomingEventsLoaded) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getUpcomingEvents(limit);
      dispatch({ type: 'SET_UPCOMING_EVENTS', payload: response.events });
      dispatch({ type: 'SET_UPCOMING_EVENTS_LOADED', payload: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`今後のイベント読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [state.upcomingEventsLoaded]);

  const loadBestShotDays = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getBestShotDays(year, month);
      dispatch({ type: 'SET_BEST_SHOT_DAYS', payload: response.recommendations });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`ベストショット日の読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    if (state.locations.length > 0) return; // 既に読み込み済みの場合はスキップ

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getLocations();
      dispatch({ type: 'SET_LOCATIONS', payload: response.locations });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`地点データの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [state.locations.length]);

  return {
    ...state,
    loadMonthlyCalendar,
    loadDayEvents,
    loadUpcomingEvents,
    loadBestShotDays,
    loadLocations,
    clearError,
    setCurrentDate,
  };
}