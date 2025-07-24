import React, { useState, useCallback, useEffect } from 'react';
import Calendar from '../components/Calendar';
import MapView from '../components/MapView';
import { useCalendar } from '../hooks/useCalendarReducer';
import { useFavorites } from '../hooks/useFavorites';
import { FujiEvent, FavoriteEvent, Location } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import styles from './HomePage.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji_small.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

const HomePage: React.FC = () => {
  const {
    calendarData,
    dayEvents,
    upcomingEvents,
    locations,
    loading,
    upcomingEventsLoaded,
    error,
    loadMonthlyCalendar,
    loadDayEvents,
    loadUpcomingEvents,
    loadLocations,
    clearError,
    setCurrentDate
  } = useCalendar();

  const {
    upcomingFavoriteEvents,
    stats: favoriteStats
  } = useFavorites();


  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FujiEvent | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [showMap, setShowMap] = useState<boolean>(false);

  const currentDate = new Date();
  const currentYear = calendarData?.year || currentDate.getFullYear();
  const currentMonth = calendarData?.month || (currentDate.getMonth() + 1);

  // 初期データの読み込み
  useEffect(() => {
    const initializeData = async () => {
      // 現在の年月のカレンダーデータを読み込み
      await loadMonthlyCalendar(currentYear, currentMonth);
      
      // 今後のイベントを読み込み
      if (!upcomingEventsLoaded) {
        await loadUpcomingEvents(30);
      }
      
      // 地点データを読み込み
      if (locations.length === 0) {
        await loadLocations();
      }
    };

    initializeData();
  }, []); // 初回マウント時のみ実行

  const handleDateClick = useCallback(async (date: Date) => {
    setSelectedDate(date);
    const dateString = timeUtils.formatDateString(date);
    await loadDayEvents(dateString);
    
    // 詳細エリアにスクロール
    setTimeout(() => {
      const detailArea = document.querySelector(`.${styles.detailArea}`) as HTMLElement;
      if (detailArea) {
        detailArea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }, [loadDayEvents]);

  const handleMonthChange = useCallback(async (year: number, month: number) => {
    setCurrentDate(year, month);
    setSelectedDate(null);
    // 新しい月のカレンダーデータを読み込み
    await loadMonthlyCalendar(year, month);
  }, [setCurrentDate, loadMonthlyCalendar]);


  const handleCloseMap = useCallback(() => {
    setShowMap(false);
    setSelectedEvent(null);
  }, []);

  const handleLocationSelect = useCallback((location: Location | null) => {
    setSelectedLocationId(location?.id);
  }, []);

  const handleUpcomingEventClick = async (event: FujiEvent) => {
    // イベントの日付を取得
    const eventDate = new Date(event.time);
    
    // その年月のカレンダーに移動
    const year = eventDate.getFullYear();
    const month = eventDate.getMonth() + 1;
    
    if (calendarData?.year !== year || calendarData?.month !== month) {
      // 別の月なら月を変更してデータを読み込み
      setCurrentDate(year, month);
      await loadMonthlyCalendar(year, month);
    }
    
    // 日付を選択して詳細を表示
    setSelectedDate(eventDate);
    const dateString = timeUtils.formatDateString(eventDate);
    await loadDayEvents(dateString);
    
    // 詳細エリアにスクロール
    setTimeout(() => {
      const detailArea = document.querySelector(`.${styles.detailArea}`) as HTMLElement;
      if (detailArea) {
        detailArea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };


  const handleFavoriteEventClick = async (favoriteEvent: FavoriteEvent) => {
    // お気に入りイベントの日付を取得
    const eventDate = new Date(favoriteEvent.time);
    
    // その年月のカレンダーに移動
    const year = eventDate.getFullYear();
    const month = eventDate.getMonth() + 1;
    
    
    if (calendarData?.year !== year || calendarData?.month !== month) {
      // 別の月なら月を変更してデータを読み込み
      setCurrentDate(year, month);
      await loadMonthlyCalendar(year, month);
    }
    
    // 日付を選択して詳細を表示
    setSelectedDate(eventDate);
    const dateString = timeUtils.formatDateString(eventDate);
    await loadDayEvents(dateString);
    
    // 詳細エリアにスクロール
    setTimeout(() => {
      const detailArea = document.querySelector(`.${styles.detailArea}`) as HTMLElement;
      if (detailArea) {
        detailArea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };




  return (
    <div className={styles.homePage}>
      {/* ヘッダーセクション */}
      <div className="card content-wide">
        <h2 className="card-title">ダイヤモンド富士・パール富士カレンダー</h2>
        <div className="readable-text">
          <p>
            富士山と太陽・月が重なる美しい瞬間「ダイヤモンド富士」「パール富士」の撮影に最適な日時と場所をご案内します。
          </p>
          <p>
            カレンダーから日付を選択して、詳細な撮影情報をご確認ください。
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={clearError}>エラーを閉じる</button>
        </div>
      )}

      {/* ローディング表示 */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>データを読み込み中...</p>
        </div>
      )}

      <div className="content-wide">
        <div className={styles.mainContent}>
          {/* メインコンテンツエリア */}
          <div className={styles.leftColumn}>
            {/* 1. カレンダーセクション */}
            <div className={styles.calendarSection}>
              <div className="card">
                <h3 className="card-title">カレンダー</h3>
                {calendarData ? (
                  <Calendar
                    year={currentYear}
                    month={currentMonth}
                    events={calendarData.events}
                    onDateClick={handleDateClick}
                    onMonthChange={handleMonthChange}
                    selectedDate={selectedDate || undefined}
                  />
                ) : (
                  <div className={styles.placeholderCalendar}>
                    <p>カレンダーを読み込み中...</p>
                  </div>
                )}
              </div>
              
            </div>

            {/* 2. 地図表示エリア */}
            <div className={`${styles.mapArea} mt-4`}>
              <div className="card">
                <h3 className="card-title">撮影地点マップ</h3>
                <div className={styles.mapContainer}>
                  <MapView
                    center={[35.3606, 138.7274]}
                    zoom={8}
                    locations={locations}
                    fujiEvent={selectedEvent || undefined}
                    selectedLocationId={selectedLocationId}
                    showDirection={true}
                    dayEvents={selectedDate && dayEvents ? dayEvents.events : undefined}
                    onLocationSelect={handleLocationSelect}
                    className={styles.homePageMap}
                  />
                </div>
              </div>
            </div>

            {/* 3. 撮影地の詳細 */}
            <div className={`${styles.locationListArea} mt-4`}>
              <div className="card">
                <h3 className="card-title">撮影地の詳細</h3>
                <div className={styles.locationStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{locations.length}</span>
                    <span className={styles.statLabel}>地点</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>
                      {new Set(locations.map(l => l.prefecture)).size}
                    </span>
                    <span className={styles.statLabel}>都道府県</span>
                  </div>
                  {selectedLocationId && (
                    <div className={styles.statItem}>
                      <span className={styles.statNumber}>1</span>
                      <span className={styles.statLabel}>選択中</span>
                    </div>
                  )}
                </div>
                <div className={styles.locationGrid}>
                  {locations.map((location) => (
                    <div 
                      key={location.id} 
                      className={`${styles.locationCard} ${selectedLocationId === location.id ? styles.selectedLocation : ''}`}
                      onClick={() => handleLocationSelect(selectedLocationId === location.id ? null : location)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleLocationSelect(selectedLocationId === location.id ? null : location);
                        }
                      }}
                    >
                      <div className={styles.locationCardHeader}>
                        <h4 className={styles.locationName}>{location.name}</h4>
                        <span className={styles.locationPrefecture}>{location.prefecture}</span>
                      </div>
                      <div className={styles.locationInfo}>
                        <div className={styles.locationElevation}>
                          標高: {location.elevation.toFixed(1)}m
                        </div>
                        <div className={styles.locationDistance}>
                          {location.fujiDistance ? `富士山まで: ${location.fujiDistance.toFixed(1)}km` : '距離不明'}
                        </div>
                      </div>
                      {selectedLocationId === location.id && (
                        <div className={styles.selectedIndicator}>選択中</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* サイドバー */}
          <div className={styles.sidebar}>
            {/* 使い方ガイド */}
            {!selectedDate && (
              <div className="card">
                <h3 className="card-title">📖 使い方ガイド</h3>
                <div className={styles.usageGuide}>
                  <div className={styles.usageStep}>
                    <span className={styles.stepNumber}>1</span>
                    <div className={styles.stepContent}>
                      <div className={styles.stepTitle}>📅 日付を選択</div>
                      <div className={styles.stepDescription}>
                        カレンダーから撮影したい日付をクリックしてください
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.usageStep}>
                    <span className={styles.stepNumber}>2</span>
                    <div className={styles.stepContent}>
                      <div className={styles.stepTitle}>📍 撮影地点を選択</div>
                      <div className={styles.stepDescription}>
                        地図上のマーカーまたは撮影地点リストから地点を選択
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.usageStep}>
                    <span className={styles.stepNumber}>3</span>
                    <div className={styles.stepContent}>
                      <div className={styles.stepTitle}>🗺️ 詳細を確認</div>
                      <div className={styles.stepDescription}>
                        太陽軌道線・カメラ画角・ルート検索で撮影計画を立てる
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.usageTip}>
                    <div className={styles.tipIcon}>💡</div>
                    <div className={styles.tipText}>
                      <strong>ヒント:</strong> お気に入り機能で撮影地点を保存できます
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 日付選択時の詳細表示 */}
            {selectedDate && dayEvents && (
              <div className="card">
                <h3 className="card-title">
                  {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の詳細
                </h3>
                
                {/* 天気情報 */}
                {dayEvents.weather && (
                  <div className={styles.sidebarWeather}>
                    <h4 className={styles.sidebarWeatherTitle}>
                      {dayEvents.weather.condition === '晴れ' ? '☀️' : 
                       dayEvents.weather.condition === '曇り' ? '☁️' : 
                       dayEvents.weather.condition === '雨' ? '🌧️' : 
                       dayEvents.weather.condition === '雪' ? '❄️' : '🌤️'} 
                      富士山周辺の天気予報
                    </h4>
                    <div className={styles.sidebarWeatherInfo}>
                      <div className={styles.weatherMainInfo}>
                        <span className={styles.weatherCondition}>{dayEvents.weather.condition}</span>
                        <span className={styles.weatherRecommendationBadge}>
                          <span className={`${styles[dayEvents.weather.recommendation]}`}>
                            {dayEvents.weather.recommendation === 'excellent' ? '撮影最適' :
                             dayEvents.weather.recommendation === 'good' ? '撮影良好' :
                             dayEvents.weather.recommendation === 'fair' ? '撮影可能' : '撮影困難'}
                          </span>
                        </span>
                      </div>
                      <div className={styles.weatherDetails}>
                        <div>雲量: {dayEvents.weather.cloudCover}% | 視界: {dayEvents.weather.visibility}km</div>
                      </div>
                      <div className={styles.weatherNote}>
                        ※ 富士山麓エリアの予想天気です（模擬データ）
                      </div>
                    </div>
                  </div>
                )}

                {/* イベント一覧 */}
                {dayEvents.events.length > 0 ? (
                  <div className={styles.sidebarEvents}>
                    <h4 className={styles.sidebarEventsTitle}>イベント ({dayEvents.events.length}件)</h4>
                    {dayEvents.events.map((event, index) => (
                      <div key={event.id || index} className={styles.sidebarEventItem}>
                        <div className={styles.sidebarEventHeader}>
                          <span className={styles.sidebarEventIcon}>
                            {event.type === 'diamond' 
                              ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.sidebarEventIconImg} />
                              : <img src={pearlFujiIcon} alt="パール富士" className={styles.sidebarEventIconImg} />
                            }
                          </span>
                          <div className={styles.sidebarEventInfo}>
                            <div className={styles.sidebarEventType}>
                              {event.subType === 'rising' ? '昇る' : '沈む'}
                              {event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'}
                            </div>
                            <div className={styles.sidebarEventTime}>
                              {event.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className={styles.sidebarEventLocation}>
                              📍 {event.location.name}
                            </div>
                          </div>
                        </div>
                        <div className={styles.sidebarEventActions}>
                          <button 
                            className={`${styles.sidebarSelectButton} ${selectedLocationId === event.location.id ? styles.selected : ''}`}
                            onClick={() => handleLocationSelect(selectedLocationId === event.location.id ? null : event.location)}
                          >
                            {selectedLocationId === event.location.id ? '✓' : '📍'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.sidebarNoEvents}>
                    <p>この日はイベントがありません</p>
                  </div>
                )}
              </div>
            )}

            {/* 今後のイベント */}
            <div className="card">
              <h3 className="card-title">今後のイベント</h3>
              {!upcomingEventsLoaded ? (
                <p>今後のイベントを読み込み中...</p>
              ) : upcomingEvents.length > 0 ? (
                <div className={styles.upcomingEvents}>
                  {upcomingEvents.slice(0, 5).map((event, index) => (
                    <div 
                      key={event.id || index} 
                      className={styles.upcomingEvent}
                      onClick={() => handleUpcomingEventClick(event)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleUpcomingEventClick(event);
                        }
                      }}
                    >
                      <div className={styles.eventIcon}>
                        {event.type === 'diamond' 
                          ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconImg} loading="lazy" />
                          : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconImg} loading="lazy" />
                        }
                      </div>
                      <div className={styles.eventInfo}>
                        <div className={styles.eventDate}>
                          {event.time.toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className={styles.eventTime}>
                          {event.time.toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className={styles.eventLocation}>
                          {event.location.name}
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingEvents.length > 5 && (
                    <p className={styles.moreEvents}>
                      他 {upcomingEvents.length - 5} 件のイベント
                    </p>
                  )}
                </div>
              ) : (
                <p>今後30日間のイベントはありません。秋から冬にかけてがダイヤモンド富士のシーズンです。</p>
              )}
            </div>


            {/* お気に入り */}
            <div className="card">
              <h3 className="card-title">お気に入り</h3>
              <div className={styles.favoriteStats}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{favoriteStats.totalLocations}</span>
                  <span className={styles.statLabel}>地点</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{favoriteStats.upcomingEvents}</span>
                  <span className={styles.statLabel}>今後のイベント</span>
                </div>
              </div>
              
              {upcomingFavoriteEvents.length > 0 && (
                <div className={styles.favoriteEvents}>
                  <h4 className={styles.favoriteEventsTitle}>今後のお気に入りイベント</h4>
                  {upcomingFavoriteEvents.slice(0, 3).map((event, _index) => (
                    <div 
                      key={event.id} 
                      className={styles.favoriteEvent}
                      onClick={() => handleFavoriteEventClick(event)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleFavoriteEventClick(event);
                        }
                      }}
                    >
                      <div className={styles.favoriteEventIcon}>
                        {event.type === 'diamond' 
                          ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconImg} loading="lazy" />
                          : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconImg} loading="lazy" />
                        }
                      </div>
                      <div className={styles.favoriteEventInfo}>
                        <div className={styles.favoriteEventDate}>
                          {new Date(event.time).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className={styles.favoriteEventLocation}>
                          {event.locationName}
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingFavoriteEvents.length > 3 && (
                    <p className={styles.moreFavorites}>
                      他 {upcomingFavoriteEvents.length - 3} 件のお気に入り
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 地図モーダル */}
      {showMap && selectedEvent && (
        <div className={styles.modal} style={{ zIndex: 1100 }}>
          <div className={styles.modalOverlay} onClick={handleCloseMap} />
          <div className={styles.modalContent} style={{ zIndex: 1101, maxWidth: '95vw', width: '900px' }}>
            <MapView
              center={[selectedEvent.location.latitude, selectedEvent.location.longitude]}
              zoom={12}
              fujiEvent={selectedEvent}
              showDirection={true}
              onClose={handleCloseMap}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;