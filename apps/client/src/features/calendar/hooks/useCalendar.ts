import { useState, useEffect, useCallback } from 'react';
import { CalendarResponse, EventsResponse, FujiEvent, Location } from '@fuji-calendar/types';
import { apiClient } from '../../../services/apiClient';

export interface UseCalendarState {
  calendarData: CalendarResponse | null;
  dayEvents: EventsResponse | null;
  upcomingEvents: FujiEvent[];
  bestShotDays: FujiEvent[];
  locations: Location[];
  loading: boolean;
  upcomingEventsLoaded: boolean;
  error: string | null;
}

export interface UseCalendarActions {
  loadMonthlyCalendar: (year: number, month: number) => Promise<void>;
  loadDayEvents: (date: string) => Promise<void>;
  loadUpcomingEvents: (limit?: number) => Promise<void>;
  loadBestShotDays: (year: number, month: number) => Promise<void>;
  loadLocations: () => Promise<void>;
  clearError: () => void;
  setCurrentDate: (year: number, month: number) => void;
}

export function useCalendar(): UseCalendarState & UseCalendarActions {
  const [state, setState] = useState<UseCalendarState>({
    calendarData: null,
    dayEvents: null,
    upcomingEvents: [],
    bestShotDays: [],
    locations: [],
    loading: false,
    upcomingEventsLoaded: false,
    error: null,
  });

  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const loadMonthlyCalendar = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const calendarData = await apiClient.getMonthlyCalendar(year, month);
      setState(prev => ({ ...prev, calendarData }));
    } catch (error) {
      const errorMessage = apiClient.getErrorMessage(error);
      setError(`カレンダーデータの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const loadDayEvents = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const dayEvents = await apiClient.getDayEvents(date);
      setState(prev => ({ ...prev, dayEvents }));
    } catch (error) {
      const errorMessage = apiClient.getErrorMessage(error);
      setError(`イベントデータの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const loadUpcomingEvents = useCallback(async (limit: number = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getUpcomingEvents(limit);
      setState(prev => ({ ...prev, upcomingEvents: result.events, upcomingEventsLoaded: true }));
    } catch (error) {
      const errorMessage = apiClient.getErrorMessage(error);
      setError(`今後のイベントの読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const loadBestShotDays = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getBestShotDays(year, month);
      setState(prev => ({ ...prev, bestShotDays: result.recommendations }));
    } catch (error) {
      const errorMessage = apiClient.getErrorMessage(error);
      setError(`おすすめ撮影日の読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getLocations();
      setState(prev => ({ ...prev, locations: result.locations }));
    } catch (error) {
      const errorMessage = apiClient.getErrorMessage(error);
      setError(`撮影地点の読み込みに失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const setCurrentDate = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  // 初期データの読み込み
  useEffect(() => {
    loadMonthlyCalendar(currentYear, currentMonth);
    loadLocations();
    loadUpcomingEvents();
  }, [currentYear, currentMonth, loadMonthlyCalendar, loadLocations, loadUpcomingEvents]);

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