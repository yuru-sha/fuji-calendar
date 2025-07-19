import { useState, useEffect, useCallback } from 'react';
import { FavoriteLocation, FavoriteEvent, Location, FujiEvent } from '../../shared/types';
import { favoritesService } from '../services/favoritesService';

export interface UseFavoritesState {
  favoriteLocations: FavoriteLocation[];
  favoriteEvents: FavoriteEvent[];
  upcomingFavoriteEvents: FavoriteEvent[];
  stats: {
    totalLocations: number;
    totalEvents: number;
    diamondEvents: number;
    pearlEvents: number;
    upcomingEvents: number;
    pastEvents: number;
  };
}

export interface UseFavoritesActions {
  addLocationToFavorites: (location: Location) => boolean;
  removeLocationFromFavorites: (locationId: number) => boolean;
  isLocationFavorite: (locationId: number) => boolean;
  addEventToFavorites: (event: FujiEvent) => boolean;
  removeEventFromFavorites: (eventId: string) => boolean;
  isEventFavorite: (eventId: string) => boolean;
  toggleLocationFavorite: (location: Location) => boolean;
  toggleEventFavorite: (event: FujiEvent) => boolean;
  clearAllFavorites: () => boolean;
  exportFavorites: () => string;
  importFavorites: (jsonData: string) => boolean;
  refreshFavorites: () => void;
}

export function useFavorites(): UseFavoritesState & UseFavoritesActions {
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [upcomingFavoriteEvents, setUpcomingFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalEvents: 0,
    diamondEvents: 0,
    pearlEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0
  });

  // お気に入りデータを更新
  const refreshFavorites = useCallback(() => {
    console.log('[DEBUG] useFavorites.refreshFavorites() - Starting refresh');
    
    const locations = favoritesService.getFavoriteLocations();
    const events = favoritesService.getFavoriteEvents();
    const upcomingEvents = favoritesService.getUpcomingFavoriteEvents();
    const currentStats = favoritesService.getFavoritesStats();
    
    console.log('[DEBUG] useFavorites.refreshFavorites() - Retrieved data:', {
      locations,
      events,
      upcomingEvents,
      currentStats
    });
    
    setFavoriteLocations(locations);
    setFavoriteEvents(events);
    setUpcomingFavoriteEvents(upcomingEvents);
    setStats(currentStats);
    
    console.log('[DEBUG] useFavorites.refreshFavorites() - State updated');
  }, []);

  // 初期化
  useEffect(() => {
    console.log('[DEBUG] useFavorites - useEffect triggered, calling refreshFavorites');
    refreshFavorites();
  }, [refreshFavorites]);

  // stats の変更を監視
  useEffect(() => {
    console.log('[DEBUG] useFavorites - stats changed:', stats);
  }, [stats]);

  // 撮影地点のお気に入り操作
  const addLocationToFavorites = useCallback((location: Location): boolean => {
    const success = favoritesService.addLocationToFavorites(location);
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  const removeLocationFromFavorites = useCallback((locationId: number): boolean => {
    const success = favoritesService.removeLocationFromFavorites(locationId);
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  const isLocationFavorite = useCallback((locationId: number): boolean => {
    return favoritesService.isLocationFavorite(locationId);
  }, []);

  const toggleLocationFavorite = useCallback((location: Location): boolean => {
    const isFavorite = isLocationFavorite(location.id);
    const success = isFavorite 
      ? removeLocationFromFavorites(location.id)
      : addLocationToFavorites(location);
    
    return success;
  }, [isLocationFavorite, removeLocationFromFavorites, addLocationToFavorites]);

  // イベントのお気に入り操作
  const addEventToFavorites = useCallback((event: FujiEvent): boolean => {
    const success = favoritesService.addEventToFavorites(event);
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  const removeEventFromFavorites = useCallback((eventId: string): boolean => {
    const success = favoritesService.removeEventFromFavorites(eventId);
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  const isEventFavorite = useCallback((eventId: string): boolean => {
    return favoritesService.isEventFavorite(eventId);
  }, []);

  const toggleEventFavorite = useCallback((event: FujiEvent): boolean => {
    const isFavorite = isEventFavorite(event.id);
    const success = isFavorite 
      ? removeEventFromFavorites(event.id)
      : addEventToFavorites(event);
    
    return success;
  }, [isEventFavorite, removeEventFromFavorites, addEventToFavorites]);

  // その他の操作
  const clearAllFavorites = useCallback((): boolean => {
    const success = favoritesService.clearFavorites();
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  const exportFavorites = useCallback((): string => {
    return favoritesService.exportFavorites();
  }, []);

  const importFavorites = useCallback((jsonData: string): boolean => {
    const success = favoritesService.importFavorites(jsonData);
    if (success) {
      refreshFavorites();
    }
    return success;
  }, [refreshFavorites]);

  return {
    // State
    favoriteLocations,
    favoriteEvents,
    upcomingFavoriteEvents,
    stats,
    
    // Actions
    addLocationToFavorites,
    removeLocationFromFavorites,
    isLocationFavorite,
    addEventToFavorites,
    removeEventFromFavorites,
    isEventFavorite,
    toggleLocationFavorite,
    toggleEventFavorite,
    clearAllFavorites,
    exportFavorites,
    importFavorites,
    refreshFavorites
  };
}