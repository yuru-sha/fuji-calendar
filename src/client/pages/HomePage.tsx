import React, { useState } from 'react';
import Calendar from '../components/Calendar';
import EventDetail from '../components/EventDetail';
import MapView from '../components/MapView';
import { useCalendar } from '../hooks/useCalendar';
import { useFavorites } from '../hooks/useFavorites';
import { FujiEvent, FavoriteEvent } from '../../shared/types';
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
    loadDayEvents,
    clearError,
    setCurrentDate
  } = useCalendar();

  const {
    upcomingFavoriteEvents,
    stats: favoriteStats
  } = useFavorites();


  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FujiEvent | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  const currentDate = new Date();
  const currentYear = calendarData?.year || currentDate.getFullYear();
  const currentMonth = calendarData?.month || (currentDate.getMonth() + 1);

  const handleDateClick = async (date: Date) => {
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
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentDate(year, month);
    setSelectedDate(null);
  };

  const handleMapClick = (event: FujiEvent) => {
    setSelectedEvent(event);
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedEvent(null);
  };

  const handleFavoriteEventClick = async (favoriteEvent: FavoriteEvent) => {
    // お気に入りイベントの日付を取得
    const eventDate = new Date(favoriteEvent.time);
    
    // その年月のカレンダーに移動
    const year = eventDate.getFullYear();
    const month = eventDate.getMonth() + 1;
    
    if (calendarData?.year !== year || calendarData?.month !== month) {
      // 別の月なら月を変更
      setCurrentDate(year, month);
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
          {/* カレンダーセクション */}
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
          
          {/* 日付詳細をカレンダーの下に表示 */}
          {selectedDate && dayEvents && (
            <div className={`${styles.detailArea} mt-4`}>
              <EventDetail
                date={selectedDate}
                events={dayEvents.events}
                weather={dayEvents.weather}
                onMapClick={handleMapClick}
              />
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className={styles.sidebar}>
          {/* 今後のイベント */}
          <div className="card">
            <h3 className="card-title">今後のイベント</h3>
            {!upcomingEventsLoaded ? (
              <p>今後のイベントを読み込み中...</p>
            ) : upcomingEvents.length > 0 ? (
              <div className={styles.upcomingEvents}>
                {upcomingEvents.slice(0, 5).map((event, index) => (
                  <div key={event.id || index} className={styles.upcomingEvent}>
                    <div className={styles.eventIcon}>
                      {event.type === 'diamond' 
                        ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconImg} />
                        : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconImg} />
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

          {/* 撮影地点数 */}
          <div className="card">
            <h3 className="card-title">撮影地点</h3>
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
            </div>
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
                        ? <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconImg} />
                        : <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconImg} />
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