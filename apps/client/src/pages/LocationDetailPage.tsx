import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Location, FujiEvent } from '@fuji-calendar/types';
import { apiClient } from '../services/apiClient';
import { timeUtils } from '@fuji-calendar/utils';
import { useFavorites } from '../hooks/useFavorites';
import SimpleMap from '../components/SimpleMap';
import styles from './LocationDetailPage.module.css';
import { FujiIcon } from '../components/icons/FujiIcons';

const LocationDetailPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const { isLocationFavorite, toggleLocationFavorite, isEventFavorite, toggleEventFavorite } = useFavorites();
  
  const [location, setLocation] = useState<Location | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<FujiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocationDetail = async () => {
      if (!locationId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 地点情報を取得
        const locationsResponse = await apiClient.getLocations();
        const foundLocation = locationsResponse.locations.find(loc => loc.id === parseInt(locationId));
        
        if (!foundLocation) {
          setError('地点が見つかりませんでした');
          return;
        }
        
        setLocation(foundLocation);
        
        // 今後 3 ヶ月間のイベントを取得
        const today = new Date();
        const events: FujiEvent[] = [];
        
        for (let i = 0; i < 3; i++) {
          const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
          try {
            const calendarResponse = await apiClient.getMonthlyCalendar(
              targetDate.getFullYear(), 
              targetDate.getMonth() + 1
            );
            
            // この地点のイベントのみフィルタリング（FujiEvent の型のみ）
            const locationEvents = calendarResponse.events.filter(event => 
              'location' in event && (event as any).location.id === foundLocation.id
            ) as unknown as FujiEvent[];
            
            events.push(...locationEvents);
          } catch (error) {
            console.warn(`Failed to load events for ${targetDate.getFullYear()}-${targetDate.getMonth() + 1}:`, error);
          }
        }
        
        // 今日以降のイベントのみ、時刻順にソート
        const futureEvents = events
          .filter(event => new Date(event.time) >= today)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        setUpcomingEvents(futureEvents);
        
      } catch (error) {
        console.error('Failed to load location detail:', error);
        setError('地点情報の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadLocationDetail();
  }, [locationId]);

  const getCompassDirection = (azimuth: number): string => {
    const directions = [
      '北', '北北東', '北東', '東北東',
      '東', '東南東', '南東', '南南東',
      '南', '南南西', '南西', '西南西',
      '西', '西北西', '北西', '北北西'
    ];
    
    const index = Math.round(azimuth / 22.5) % 16;
    return directions[index];
  };

  const formatEventDate = (time: string | Date) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatEventTime = (time: string | Date) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewEventDetail = (event: FujiEvent) => {
    const eventDate = new Date(event.time);
    const dateString = timeUtils.formatDateString(eventDate);
    
    navigate(`/?date=${dateString}`, {
      state: { 
        selectedDate: eventDate,
        selectedLocationId: event.location.id,
        selectedEventId: event.id
      }
    });
  };

  const handleGoogleMapsClick = () => {
    if (!location) return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(googleMapsUrl, '_blank');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className={styles.error}>
        <h2>エラー</h2>
        <p>{error || '地点情報が見つかりませんでした'}</p>
        <Link to="/favorites" className={styles.backButton}>
          お気に入りに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.locationDetailPage}>
      <div className="content-wide">
        {/* ヘッダー */}
        <div className={styles.header}>
          <div className={styles.breadcrumb}>
            <Link to="/" className={styles.breadcrumbLink}>ホーム</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <Link to="/favorites" className={styles.breadcrumbLink}>お気に入り</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>地点詳細</span>
          </div>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              📍 {location.name}
            </h1>
            <div className={styles.subtitle}>
              {location.prefecture}
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button
              className={`${styles.favoriteButton} ${isLocationFavorite(location.id) ? styles.favorited : styles.unfavorited}`}
              onClick={() => toggleLocationFavorite(location)}
            >
              {isLocationFavorite(location.id) ? '⭐ お気に入り済み' : '☆ お気に入り追加'}
            </button>
            <button
              className={styles.googleMapsButton}
              onClick={handleGoogleMapsClick}
            >
              🗺️ ルート検索
            </button>
          </div>
        </div>

        {/* 2 カラムレイアウト */}
        <div className={styles.content}>
          {/* 左カラム: 地点情報 */}
          <div className={styles.leftColumn}>
            {/* 基本情報 */}
            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>📊 基本情報</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>所在地:</span>
                  <span className={styles.infoValue}>{location.prefecture}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>緯度:</span>
                  <span className={styles.infoValue}>{location.latitude.toFixed(6)}°</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>経度:</span>
                  <span className={styles.infoValue}>{location.longitude.toFixed(6)}°</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>標高:</span>
                  <span className={styles.infoValue}>約{location.elevation.toFixed(1)}m</span>
                </div>
                {location.fujiDistance && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>富士山まで:</span>
                    <span className={styles.infoValue}>約{(location.fujiDistance / 1000).toFixed(1)}km</span>
                  </div>
                )}
                {location.fujiAzimuth !== undefined && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>富士山の方角:</span>
                    <span className={styles.infoValue}>
                      {location.fujiAzimuth ? `${getCompassDirection(location.fujiAzimuth)}（${Math.round(location.fujiAzimuth)}°）` : '計算中'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* アクセス情報 */}
            {(location.accessInfo || location.parkingInfo || location.description) && (
              <div className={styles.infoCard}>
                <h2 className={styles.cardTitle}>ℹ️ アクセス・注意事項</h2>
                
                {location.accessInfo && (
                  <div className={styles.accessInfo}>
                    <h3 className={styles.accessTitle}>🚗 アクセス情報</h3>
                    <p>{location.accessInfo}</p>
                  </div>
                )}
                
                {location.parkingInfo && (
                  <div className={styles.parkingInfo}>
                    <h3 className={styles.parkingTitle}>🅿️ 駐車場情報</h3>
                    <p>{location.parkingInfo}</p>
                  </div>
                )}
                
                {location.description && (
                  <div className={styles.warnings}>
                    <h3 className={styles.warningsTitle}>⚠️ 注意事項</h3>
                    <p>{location.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* 今後のイベント */}
            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>📅 今後の撮影チャンス</h2>
              
              {upcomingEvents.length === 0 ? (
                <div className={styles.noEvents}>
                  <p>今後 3 ヶ月間に撮影可能なダイヤモンド富士・パール富士はありません。</p>
                </div>
              ) : (
                <div className={styles.eventsList}>
                  {upcomingEvents.map((event, index) => (
                    <div key={event.id || index} className={styles.eventItem}>
                      <div className={styles.eventIcon}>
                        <FujiIcon type={event.type} size={32} />
                      </div>
                      
                      <div className={styles.eventInfo}>
                        <div className={styles.eventTitle}>
                          {event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'}
                          {event.subType === 'sunrise' || event.subType === 'rising' ? ' (日の出)' : ' (日の入り)'}
                        </div>
                        <div className={styles.eventDate}>
                          {formatEventDate(event.time)} {formatEventTime(event.time)}
                        </div>
                        {event.elevation !== undefined && (
                          <div className={styles.eventDetail}>
                            高度: {Math.round(event.elevation)}°
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.eventActions}>
                        <button
                          className={`${styles.scheduleButton} ${isEventFavorite(event.id) ? styles.scheduled : styles.unscheduled}`}
                          onClick={() => toggleEventFavorite(event)}
                        >
                          {isEventFavorite(event.id) ? '📅 予定済み' : '📅 予定追加'}
                        </button>
                        <button
                          className={styles.detailButton}
                          onClick={() => handleViewEventDetail(event)}
                        >
                          詳細を見る
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: 地図 */}
          <div className={styles.rightColumn}>
            <div className={styles.mapCard}>
              <h2 className={styles.cardTitle}>🗺️ 位置情報</h2>
              <div className={styles.mapContainer}>
                <SimpleMap
                  locations={[location]}
                  selectedEvents={upcomingEvents}
                  selectedLocationId={location.id}
                  onLocationSelect={() => {}}
                  cameraSettings={{
                    showAngles: true,
                    focalLength: 50,
                    sensorType: 'fullframe',
                    aspectRatio: '3:2',
                    orientation: 'landscape'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetailPage;