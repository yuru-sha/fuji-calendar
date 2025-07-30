import React, { memo, useState } from 'react';
import { FujiEvent, WeatherInfo, Location } from '@fuji-calendar/types';
import { timeUtils } from '@fuji-calendar/utils';
import { useFavorites } from '../hooks/useFavorites';
import { Icon } from './icons/IconMap';
import styles from './EventDetail.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji_small.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

interface EventDetailProps {
  date: Date;
  events: FujiEvent[];
  weather?: WeatherInfo;
  selectedLocationId?: number;
  onLocationSelect?: (location: Location | null) => void;
}

const EventDetail: React.FC<EventDetailProps> = memo(({
  date,
  events,
  weather,
  selectedLocationId,
  onLocationSelect
}) => {
  const { isEventFavorite, toggleEventFavorite, isLocationFavorite, toggleLocationFavorite } = useFavorites();
  const [expandedLocationIds, setExpandedLocationIds] = useState<Set<number>>(() => {
    // 初期状態では一番上（最初）の地点のみ展開
    if (events.length > 0) {
      const firstLocationId = events[0].location.id;
      return new Set([firstLocationId]);
    }
    return new Set();
  });

  // HomePage 側で選択管理されるため、ここでの自動選択は不要
  // （HomePage の handleDateClick で最初の地点が自動選択される）
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
    
    // 方位角を 16 方位に変換
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
      ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIcon} loading="lazy" />
      : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIcon} loading="lazy" />;
  };

  const getWeatherIcon = (condition: string): JSX.Element => {
    switch (condition) {
      case '晴れ':
        return <Icon name="sun" size={20} />;
      case '曇り':
        return <Icon name="cloud" size={20} />;
      case '雨':
        return <Icon name="cloudRain" size={20} />;
      case '雪':
        return <Icon name="snowflake" size={20} />;
      default:
        return <Icon name="partlyCloudy" size={20} />;
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

  const getAccuracyText = (accuracy: 'perfect' | 'excellent' | 'good' | 'fair'): string => {
    switch (accuracy) {
      case 'perfect':
        return '完全一致';
      case 'excellent':
        return '非常に高精度';
      case 'good':
        return '高精度';
      case 'fair':
        return '標準精度';
      default:
        return '';
    }
  };

  const getAccuracyBadge = (accuracy: 'perfect' | 'excellent' | 'good' | 'fair'): string => {
    switch (accuracy) {
      case 'perfect':
        return styles.accuracyPerfect;
      case 'excellent':
        return styles.accuracyExcellent;
      case 'good':
        return styles.accuracyGood;
      case 'fair':
        return styles.accuracyFair;
      default:
        return '';
    }
  };


  const handleGoogleMapsClick = (event: FujiEvent) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.location.latitude},${event.location.longitude}`;
    window.open(googleMapsUrl, '_blank');
  };

  // 折りたたみボタンで地図連携も含めて制御
  const handleLocationToggle = (locationId: number, location: Location) => {
    const isExpanded = expandedLocationIds.has(locationId);
    
    if (isExpanded) {
      // 折りたたみ：選択解除して地図から除去
      setExpandedLocationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(locationId);
        return newSet;
      });
      if (onLocationSelect && selectedLocationId === locationId) {
        onLocationSelect(null);
      }
    } else {
      // 展開：この地点を選択して地図に表示
      setExpandedLocationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(locationId);
        return newSet;
      });
      if (onLocationSelect) {
        onLocationSelect(location);
      }
    }
  };

  // 不要になった関数を削除

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
            {(() => {
              // 地点ごとにイベントをグループ化
              const eventsByLocation = events.reduce((acc, event) => {
                const locationId = event.location.id;
                if (!acc[locationId]) {
                  acc[locationId] = [];
                }
                acc[locationId].push(event);
                return acc;
              }, {} as Record<number, FujiEvent[]>);

              return Object.entries(eventsByLocation).map(([locationIdStr, locationEvents]) => {
                const locationId = parseInt(locationIdStr);
                const location = locationEvents[0].location;
                const isExpanded = expandedLocationIds.has(locationId);
                const isSelected = selectedLocationId === locationId;

                return (
                  <div key={locationId} className={styles.locationGroup}>
                    {/* 地点ヘッダー */}
                    <div className={`${styles.locationHeader} ${isSelected ? styles.selectedLocation : ''}`}>
                      <div className={styles.locationInfo}>
                        <Icon name="location" size={16} className={styles.locationIcon} />
                        <span className={styles.locationText}>
                          {location.prefecture}・{location.name}
                        </span>
                        {isSelected && (
                          <span className={styles.selectedBadge}>地図表示中</span>
                        )}
                        <button
                          className={`${styles.locationFavoriteButton} ${isLocationFavorite(location.id) ? styles.favorited : styles.unfavorited}`}
                          onClick={() => toggleLocationFavorite(location)}
                          title={isLocationFavorite(location.id) ? 'お気に入り地点から削除' : 'お気に入り地点に追加'}
                        >
                          {isLocationFavorite(location.id) ? 'お気に入り済み' : 'お気に入りに追加'}
                        </button>
                      </div>
                      
                      <div className={styles.locationActions}>
                        <button
                          className={`${styles.expandButton} ${isExpanded ? styles.expanded : styles.collapsed}`}
                          onClick={() => handleLocationToggle(locationId, location)}
                          title={isExpanded ? '詳細を折りたたむ（地図から除去）' : '詳細を表示（地図に表示）'}
                        >
                          {isExpanded ? '▼ 折りたたみ' : '▶ 表示'}
                        </button>
                      </div>
                    </div>

                    {/* イベント詳細（展開時のみ表示） */}
                    {isExpanded && locationEvents.map((event, index) => (
                      <div key={event.id || index} className={styles.eventItem}>
                        <div className={styles.eventMainInfo}>
                          <div className={styles.eventBasicInfo}>
                            <div className={styles.eventTitleSection}>
                              <span className={styles.eventIcon}>
                                {getEventIcon(event)}
                              </span>
                              <div className={styles.eventTitleGroup}>
                                <h5 className={styles.eventTitle}>
                                  {formatEventTitle(event)}
                                </h5>
                                <span className={styles.eventTime}>
                                  {formatTime(event.time)}頃
                                </span>
                              </div>
                            </div>
                            
                            <div className={styles.eventActions}>
                              <button
                                className={`${styles.eventScheduleButton} ${isEventFavorite(event.id) ? styles.scheduled : styles.unscheduled}`}
                                onClick={() => toggleEventFavorite(event)}
                                title={isEventFavorite(event.id) ? '撮影予定から削除' : '撮影予定に追加'}
                              >
                                {isEventFavorite(event.id) ? (
                                  <>
                                    <Icon name="calendar" size={14} style={{ marginRight: '4px' }} />
                                    予定済み
                                  </>
                                ) : (
                                  <>
                                    <Icon name="calendar" size={14} style={{ marginRight: '4px' }} />
                                    予定に追加
                                  </>
                                )}
                              </button>
                              <button 
                                className={styles.googleMapsButton}
                                onClick={() => handleGoogleMapsClick(event)}
                                title="Google Maps でルート検索"
                              >
                                <Icon name="map" size={14} style={{ marginRight: '4px' }} />
                                ルート検索
                              </button>
                            </div>
                          </div>

                          {/* イベント固有の詳細データ */}
                          <div className={styles.eventSpecificDetails}>
                            {event.elevation !== undefined && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>高度:</span>
                                <span className={styles.detailValue}>{Math.round(event.elevation)}°</span>
                              </div>
                            )}
                            {event.type === 'pearl' && event.moonPhase !== undefined && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>月相:</span>
                                <span className={styles.detailValue}>{event.moonPhase.toFixed(1)}°</span>
                              </div>
                            )}
                            {event.type === 'pearl' && event.moonIllumination !== undefined && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>照度:</span>
                                <span className={styles.detailValue}>{Math.round(event.moonIllumination * 100)}%</span>
                              </div>
                            )}
                            {event.accuracy && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>精度:</span>
                                <span className={getAccuracyBadge(event.accuracy)}>
                                  {getAccuracyText(event.accuracy)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 地点共通情報（展開時のみ表示） */}
                    {isExpanded && (
                      <div className={styles.locationDetails}>
                        {location.description && (
                          <div className={styles.locationDescription}>
                            <p>{location.description}</p>
                          </div>
                        )}

                        {/* 撮影地データ */}
                        <div className={styles.locationDataSection}>
                          <h6 className={styles.sectionTitle}>
                            <Icon name="data" size={14} style={{ marginRight: '4px' }} />
                            撮影地データ
                          </h6>
                          <div className={styles.locationDataGrid}>
                            {location.fujiAzimuth !== undefined && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>富士山の方角:</span>
                                <span className={styles.detailValue}>
                                  {location.fujiAzimuth ? `${getCompassDirection(location.fujiAzimuth)}（${Math.round(location.fujiAzimuth)}°）` : '計算中'}
                                </span>
                              </div>
                            )}
                            {location.fujiDistance && (
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>富士山まで:</span>
                                <span className={styles.detailValue}>約{(location.fujiDistance / 1000).toFixed(1)}km</span>
                              </div>
                            )}
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>海抜標高:</span>
                              <span className={styles.detailValue}>約{location.elevation.toFixed(1)}m</span>
                            </div>
                          </div>
                        </div>

                        {/* アクセス情報セクション */}
                        <div className={styles.accessSection}>
                          {location.accessInfo && (
                            <div className={styles.accessInfo}>
                              <h6 className={styles.accessTitle}>
                                <Icon name="car" size={14} style={{ marginRight: '4px' }} />
                                アクセス情報
                              </h6>
                              <p>{location.accessInfo}</p>
                            </div>
                          )}

                          {location.parkingInfo && (
                            <div className={styles.parkingInfo}>
                              <h6 className={styles.parkingTitle}>
                                <Icon name="parking" size={14} style={{ marginRight: '4px' }} />
                                駐車場情報
                              </h6>
                              <p>{location.parkingInfo}</p>
                            </div>
                          )}

                          {location.warnings && (
                            <div className={styles.warnings}>
                              <h6 className={styles.warningsTitle}>
                                <Icon name="warning" size={14} style={{ marginRight: '4px' }} />
                                注意事項
                              </h6>
                              <p>{location.warnings}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
});

EventDetail.displayName = 'EventDetail';

export default EventDetail;