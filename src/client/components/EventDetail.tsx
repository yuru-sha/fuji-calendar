import React from 'react';
import { FujiEvent, WeatherInfo } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import { useFavorites } from '../hooks/useFavorites';
import FavoriteButton from './FavoriteButton';
import LocationFavoriteButton from './LocationFavoriteButton';
import styles from './EventDetail.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

interface EventDetailProps {
  date: Date;
  events: FujiEvent[];
  weather?: WeatherInfo;
  onMapClick?: (event: FujiEvent) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({
  date,
  events,
  weather,
  onMapClick
}) => {
  const { isEventFavorite, toggleEventFavorite, isLocationFavorite, toggleLocationFavorite } = useFavorites();
  const formatTime = (time: Date): string => {
    return timeUtils.formatJstTime(time);
  };

  const getCompassDirection = (azimuth: number): string => {
    const directions = [
      '北', '北北東', '北東', '東北東',
      '東', '東南東', '南東', '南南東',
      '南', '南南西', '南西', '西南西',
      '西', '西北西', '北西', '北北西'
    ];
    
    // 方位角を16方位に変換
    const index = Math.round(azimuth / 22.5) % 16;
    return directions[index];
  };

  const formatEventTitle = (event: FujiEvent): string => {
    const typeLabel = event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
    const subTypeLabel = event.subType === 'rising' ? '昇る' : '沈む';
    return `【${subTypeLabel}${typeLabel}】`;
  };

  const getEventIcon = (event: FujiEvent): JSX.Element => {
    return event.type === 'diamond' 
      ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIcon} />
      : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIcon} />;
  };

  const getWeatherIcon = (condition: string): string => {
    switch (condition) {
      case '晴れ':
        return '☀️';
      case '曇り':
        return '☁️';
      case '雨':
        return '🌧️';
      case '雪':
        return '❄️';
      default:
        return '🌤️';
    }
  };

  const getRecommendationText = (recommendation: 'excellent' | 'good' | 'fair' | 'poor'): string => {
    switch (recommendation) {
      case 'excellent':
        return '撮影に最適';
      case 'good':
        return '撮影に適している';
      case 'fair':
        return '撮影可能';
      case 'poor':
        return '撮影困難';
      default:
        return '';
    }
  };

  const getRecommendationColor = (recommendation: 'excellent' | 'good' | 'fair' | 'poor'): string => {
    switch (recommendation) {
      case 'excellent':
        return styles.excellent;
      case 'good':
        return styles.good;
      case 'fair':
        return styles.fair;
      case 'poor':
        return styles.poor;
      default:
        return '';
    }
  };

  const handleMapClick = (event: FujiEvent) => {
    if (onMapClick) {
      onMapClick(event);
    }
  };

  const handleGoogleMapsClick = (event: FujiEvent) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.location.latitude},${event.location.longitude}`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className={styles.eventDetail}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日の撮影情報
        </h3>
      </div>

      {/* 天気情報 */}
      {weather && (
        <div className={styles.weather}>
          <h4 className={styles.weatherTitle}>
            <span className={styles.weatherIcon}>
              {getWeatherIcon(weather.condition)}
            </span>
            天気予報
          </h4>
          <div className={styles.weatherContent}>
            <div className={styles.weatherItem}>
              <span className={styles.weatherLabel}>天候:</span>
              <span>{weather.condition}</span>
            </div>
            <div className={styles.weatherItem}>
              <span className={styles.weatherLabel}>雲量:</span>
              <span>{weather.cloudCover}%</span>
            </div>
            <div className={styles.weatherItem}>
              <span className={styles.weatherLabel}>視界:</span>
              <span>{weather.visibility}km</span>
            </div>
            <div className={`${styles.weatherItem} ${styles.recommendation}`}>
              <span className={styles.weatherLabel}>撮影条件:</span>
              <span className={getRecommendationColor(weather.recommendation)}>
                {getRecommendationText(weather.recommendation)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* イベント一覧 */}
      <div className={styles.events}>
        {events.length === 0 ? (
          <div className={styles.noEvents}>
            <p>この日はダイヤモンド富士・パール富士は発生しません。</p>
          </div>
        ) : (
          <div className={styles.eventsList}>
            {events.map((event, index) => (
              <div key={event.id || index} className={styles.eventItem}>
                <div className={styles.eventHeader}>
                  <span className={styles.eventIcon}>
                    {getEventIcon(event)}
                  </span>
                  <h5 className={styles.eventTitle}>
                    {formatEventTitle(event)}
                  </h5>
                  <span className={styles.eventTime}>
                    {formatTime(event.time)}頃
                  </span>
                  <button
                    className={`${styles.eventScheduleButton} ${isEventFavorite(event.id) ? styles.scheduled : styles.unscheduled}`}
                    onClick={() => toggleEventFavorite(event)}
                    title={isEventFavorite(event.id) ? '撮影予定から削除' : '撮影予定に追加'}
                  >
                    {isEventFavorite(event.id) ? '📅 予定済み' : '📅 予定に追加'}
                  </button>
                </div>

                <div className={styles.eventLocation}>
                  <span className={styles.locationIcon}>📍</span>
                  <span className={styles.locationText}>
                    {event.location.prefecture}・{event.location.name}
                  </span>
                  <button
                    className={`${styles.locationFavoriteButton} ${isLocationFavorite(event.location.id) ? styles.favorited : styles.unfavorited}`}
                    onClick={() => toggleLocationFavorite(event.location)}
                    title={isLocationFavorite(event.location.id) ? 'お気に入り地点から削除' : 'お気に入り地点に追加'}
                  >
                    {isLocationFavorite(event.location.id) ? '⭐' : '☆'}
                  </button>
                  <div className={styles.mapButtons}>
                    {onMapClick && (
                      <button 
                        className={styles.mapButton}
                        onClick={() => handleMapClick(event)}
                      >
                        地図を確認
                      </button>
                    )}
                    <button 
                      className={styles.googleMapsButton}
                      onClick={() => handleGoogleMapsClick(event)}
                    >
                      Google Mapsで開く
                    </button>
                  </div>
                </div>

                {event.location.description && (
                  <div className={styles.eventDescription}>
                    <p>{event.location.description}</p>
                  </div>
                )}

                <div className={styles.eventDetails}>
                  {event.location.fujiAzimuth !== undefined && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>富士山の方角:</span>
                      <span>{getCompassDirection(event.location.fujiAzimuth)}（{Math.round(event.location.fujiAzimuth)}°）</span>
                    </div>
                  )}
                  {event.location.fujiDistance && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>富士山まで:</span>
                      <span>約{event.location.fujiDistance.toFixed(1)}km</span>
                    </div>
                  )}
                  {event.elevation !== undefined && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>高度:</span>
                      <span>{Math.round(event.elevation)}°</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>海抜標高:</span>
                    <span>約{event.location.elevation.toFixed(1)}m</span>
                  </div>
                </div>

                {event.location.accessInfo && (
                  <div className={styles.accessInfo}>
                    <h6 className={styles.accessTitle}>アクセス情報</h6>
                    <p>{event.location.accessInfo}</p>
                  </div>
                )}

                {event.location.warnings && (
                  <div className={styles.warnings}>
                    <h6 className={styles.warningsTitle}>⚠️ 注意事項</h6>
                    <p>{event.location.warnings}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;