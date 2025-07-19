import React from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { favoritesService } from '../services/favoritesService';

const FavoritesDebug: React.FC = () => {
  const { stats, favoriteLocations, favoriteEvents } = useFavorites();

  const testAddLocation = () => {
    console.log('[DEBUG] テスト: 地点追加ボタンクリック');
    const testLocation = {
      id: 999,
      name: 'テスト地点',
      prefecture: 'テスト県',
      latitude: 35.0,
      longitude: 139.0,
      elevation: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = favoritesService.addLocationToFavorites(testLocation);
    console.log('[DEBUG] テスト: 地点追加結果:', result);
  };

  const testAddEvent = () => {
    console.log('[DEBUG] テスト: イベント追加ボタンクリック');
    const testEvent = {
      id: 'test-event-999',
      type: 'diamond' as const,
      subType: 'sunset' as const,
      time: new Date('2025-12-25T17:00:00'),
      location: {
        id: 999,
        name: 'テスト地点',
        prefecture: 'テスト県',
        latitude: 35.0,
        longitude: 139.0,
        elevation: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      azimuth: 225,
      elevation: 10
    };
    
    const result = favoritesService.addEventToFavorites(testEvent);
    console.log('[DEBUG] テスト: イベント追加結果:', result);
  };

  const checkLocalStorage = () => {
    console.log('[DEBUG] ローカルストレージ確認');
    const data = localStorage.getItem('fuji-calendar-favorites');
    console.log('[DEBUG] ローカルストレージの内容:', data);
    
    const favorites = favoritesService.getFavorites();
    console.log('[DEBUG] favoritesService.getFavorites()の結果:', favorites);
    
    const stats = favoritesService.getFavoritesStats();
    console.log('[DEBUG] favoritesService.getFavoritesStats()の結果:', stats);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc',
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <h4>お気に入りデバッグ</h4>
      <p>地点: {stats.totalLocations}</p>
      <p>イベント: {stats.totalEvents}</p>
      <p>今後: {stats.upcomingEvents}</p>
      <button onClick={testAddLocation}>テスト地点追加</button>
      <button onClick={testAddEvent}>テストイベント追加</button>
      <button onClick={checkLocalStorage}>LS確認</button>
    </div>
  );
};

export default FavoritesDebug;