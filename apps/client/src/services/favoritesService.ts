import { FavoriteLocation, FavoriteEvent, Favorites, Location, FujiEvent } from '@fuji-calendar/types';

const STORAGE_KEY = 'fuji-calendar-favorites';

/**
 * ローカルストレージベースのお気に入り管理サービス
 */
export class FavoritesService {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  /**
   * お気に入りデータを取得
   */
  getFavorites(): Favorites {
    try {
      const data = this.storage.getItem(STORAGE_KEY);
      console.log('[DEBUG] FavoritesService.getFavorites() - Raw localStorage data:', data);
      
      if (!data) {
        console.log('[DEBUG] FavoritesService.getFavorites() - No data in localStorage, returning empty');
        return { locations: [], events: [] };
      }
      
      const parsed = JSON.parse(data) as Favorites;
      console.log('[DEBUG] FavoritesService.getFavorites() - Parsed data:', parsed);
      
      // データ構造の検証
      if (!parsed.locations || !Array.isArray(parsed.locations)) {
        console.log('[DEBUG] FavoritesService.getFavorites() - Invalid locations, resetting to empty array');
        parsed.locations = [];
      }
      if (!parsed.events || !Array.isArray(parsed.events)) {
        console.log('[DEBUG] FavoritesService.getFavorites() - Invalid events, resetting to empty array');
        parsed.events = [];
      }
      
      console.log('[DEBUG] FavoritesService.getFavorites() - Final result:', parsed);
      return parsed;
    } catch (error) {
      console.warn('Failed to load favorites from localStorage:', error);
      return { locations: [], events: [] };
    }
  }

  /**
   * お気に入りデータを保存
   */
  private saveFavorites(favorites: Favorites): boolean {
    try {
      const jsonString = JSON.stringify(favorites);
      console.log('[DEBUG] FavoritesService.saveFavorites() - Saving data:', favorites);
      console.log('[DEBUG] FavoritesService.saveFavorites() - JSON string length:', jsonString.length);
      
      this.storage.setItem(STORAGE_KEY, jsonString);
      
      // 保存確認
      const saved = this.storage.getItem(STORAGE_KEY);
      const saveSuccess = saved === jsonString;
      console.log('[DEBUG] FavoritesService.saveFavorites() - Save verification:', saveSuccess);
      
      return saveSuccess;
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
      return false;
    }
  }

  /**
   * 撮影地点をお気に入りに追加
   */
  addLocationToFavorites(location: Location): boolean {
    console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Called with location:', location);
    
    const favorites = this.getFavorites();
    console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Current favorites:', favorites);
    
    // 既に登録済みかチェック
    if (favorites.locations.some(fav => fav.id === location.id)) {
      console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Location already exists, returning false');
      return false; // 既に登録済み
    }
    
    const favoriteLocation: FavoriteLocation = {
      id: location.id,
      name: location.name,
      prefecture: location.prefecture,
      latitude: location.latitude,
      longitude: location.longitude,
      addedAt: new Date().toISOString()
    };
    
    console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Creating favorite location:', favoriteLocation);
    
    favorites.locations.push(favoriteLocation);
    console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Updated favorites before save:', favorites);
    
    const result = this.saveFavorites(favorites);
    console.log('[DEBUG] FavoritesService.addLocationToFavorites() - Save result:', result);
    
    return result;
  }

  /**
   * 撮影地点をお気に入りから削除
   */
  removeLocationFromFavorites(locationId: number): boolean {
    const favorites = this.getFavorites();
    const initialLength = favorites.locations.length;
    
    favorites.locations = favorites.locations.filter(fav => fav.id !== locationId);
    
    if (favorites.locations.length === initialLength) {
      return false; // 削除対象が見つからなかった
    }
    
    return this.saveFavorites(favorites);
  }

  /**
   * 撮影地点がお気に入りに登録されているかチェック
   */
  isLocationFavorite(locationId: number): boolean {
    const favorites = this.getFavorites();
    return favorites.locations.some(fav => fav.id === locationId);
  }

  /**
   * イベントをお気に入りに追加
   */
  addEventToFavorites(event: FujiEvent): boolean {
    const favorites = this.getFavorites();
    
    // 既に登録済みかチェック
    if (favorites.events.some(fav => fav.id === event.id)) {
      return false; // 既に登録済み
    }
    
    const favoriteEvent: FavoriteEvent = {
      id: event.id,
      type: event.type,
      subType: event.subType,
      time: event.time.toISOString(),
      locationId: event.location.id,
      locationName: event.location.name,
      azimuth: event.azimuth,
      elevation: event.elevation || 0,
      addedAt: new Date().toISOString()
    };
    
    favorites.events.push(favoriteEvent);
    return this.saveFavorites(favorites);
  }

  /**
   * イベントをお気に入りから削除
   */
  removeEventFromFavorites(eventId: string): boolean {
    const favorites = this.getFavorites();
    const initialLength = favorites.events.length;
    
    favorites.events = favorites.events.filter(fav => fav.id !== eventId);
    
    if (favorites.events.length === initialLength) {
      return false; // 削除対象が見つからなかった
    }
    
    return this.saveFavorites(favorites);
  }

  /**
   * イベントがお気に入りに登録されているかチェック
   */
  isEventFavorite(eventId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.events.some(fav => fav.id === eventId);
  }

  /**
   * お気に入り撮影地点一覧を取得（追加日時順）
   */
  getFavoriteLocations(): FavoriteLocation[] {
    const favorites = this.getFavorites();
    return favorites.locations
      .slice()
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }

  /**
   * お気に入りイベント一覧を取得（イベント時刻順）
   */
  getFavoriteEvents(): FavoriteEvent[] {
    const favorites = this.getFavorites();
    return favorites.events
      .slice()
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  /**
   * 今後のお気に入りイベント一覧を取得
   */
  getUpcomingFavoriteEvents(): FavoriteEvent[] {
    const now = new Date();
    return this.getFavoriteEvents()
      .filter(event => new Date(event.time) > now);
  }

  /**
   * 過去のお気に入りイベント一覧を取得
   */
  getPastFavoriteEvents(): FavoriteEvent[] {
    const now = new Date();
    return this.getFavoriteEvents()
      .filter(event => new Date(event.time) <= now)
      .reverse(); // 最新から順番に
  }

  /**
   * お気に入りデータをクリア
   */
  clearFavorites(): boolean {
    try {
      this.storage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear favorites:', error);
      return false;
    }
  }

  /**
   * お気に入りデータをエクスポート（JSON形式）
   */
  exportFavorites(): string {
    const favorites = this.getFavorites();
    return JSON.stringify(favorites, null, 2);
  }

  /**
   * お気に入りデータをインポート（JSON形式）
   */
  importFavorites(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData) as Favorites;
      
      // データ構造の検証
      if (typeof imported !== 'object' || !imported.locations || !imported.events) {
        throw new Error('Invalid favorites data structure');
      }
      
      if (!Array.isArray(imported.locations) || !Array.isArray(imported.events)) {
        throw new Error('Invalid favorites data arrays');
      }
      
      return this.saveFavorites(imported);
    } catch (error) {
      console.error('Failed to import favorites:', error);
      return false;
    }
  }

  /**
   * ストレージ使用状況を取得
   */
  getStorageInfo(): { used: number; total: number; available: number } {
    try {
      const favoritesData = this.storage.getItem(STORAGE_KEY) || '';
      const used = new Blob([favoritesData]).size;
      
      // ローカルストレージの概算容量（5MB）
      const total = 5 * 1024 * 1024;
      const available = total - used;
      
      return { used, total, available };
    } catch (error) {
      return { used: 0, total: 0, available: 0 };
    }
  }

  /**
   * お気に入り統計情報を取得
   */
  getFavoritesStats(): {
    totalLocations: number;
    totalEvents: number;
    diamondEvents: number;
    pearlEvents: number;
    upcomingEvents: number;
    pastEvents: number;
  } {
    const favorites = this.getFavorites();
    const now = new Date();
    
    // デバッグログ
    console.log('[DEBUG] FavoritesService.getFavoritesStats() - Raw favorites data:', favorites);
    console.log('[DEBUG] FavoritesService.getFavoritesStats() - Current time:', now.toISOString());
    
    const upcomingEvents = favorites.events.filter(event => new Date(event.time) > now);
    const pastEvents = favorites.events.filter(event => new Date(event.time) <= now);
    const diamondEvents = favorites.events.filter(event => event.type === 'diamond');
    const pearlEvents = favorites.events.filter(event => event.type === 'pearl');
    
    const stats = {
      totalLocations: favorites.locations.length,
      totalEvents: favorites.events.length,
      diamondEvents: diamondEvents.length,
      pearlEvents: pearlEvents.length,
      upcomingEvents: upcomingEvents.length,
      pastEvents: pastEvents.length
    };
    
    console.log('[DEBUG] FavoritesService.getFavoritesStats() - Calculated stats:', stats);
    
    return stats;
  }
}

// シングルトンインスタンス
export const favoritesService = new FavoritesService();