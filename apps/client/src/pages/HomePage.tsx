import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/icons/IconMap';
import { Location, FujiEvent, CalendarResponse, WeatherInfo } from '@fuji-calendar/types';
import { apiClient } from '../services/apiClient';
import { timeUtils } from '@fuji-calendar/utils';
import SimpleCalendar from '../components/SimpleCalendar';
import SimpleMap from '../components/SimpleMap';
import FilterPanel, { FilterOptions } from '../components/FilterPanel';
import CameraPanel, { CameraSettings } from '../components/CameraPanel';
import EventDetail from '../components/EventDetail';

const HomePage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayEvents, setDayEvents] = useState<FujiEvent[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | undefined>(undefined);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [filters, setFilters] = useState<FilterOptions>({
    distance: 'all',
    diamondSunrise: false,
    diamondSunset: false,
    pearlMoonrise: false,
    pearlMoonset: false,
    specialEvents: {
      solarEclipse: false,
      lunarEclipse: false,
      supermoon: false
    }
  });
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    showAngles: false,
    focalLength: 50,
    sensorType: 'fullframe',
    aspectRatio: '3:2',
    orientation: 'landscape'
  });

  // 天気アイコンを取得する関数
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case '晴れ':
        return <Icon name="sun" size={16} />;
      case '曇り':
        return <Icon name="cloud" size={16} />;
      case '雨':
        return <Icon name="cloudRain" size={16} />;
      case '雪':
        return <Icon name="snowflake" size={16} />;
      default:
        return <Icon name="partlyCloudy" size={16} />;
    }
  };

  // URL パラメータから日付や地点 ID を処理
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const locationIdParam = searchParams.get('locationId');
    
    // お気に入りから遷移した場合の状態を復元
    if (location.state) {
      const { selectedDate: stateDate, selectedLocationId: stateLocationId, selectedEventId: stateEventId } = location.state;
      
      if (stateDate) {
        setSelectedDate(new Date(stateDate));
        setCurrentYear(new Date(stateDate).getFullYear());
        setCurrentMonth(new Date(stateDate).getMonth() + 1);
      }
      
      // 地点 ID と イベント ID は locations が読み込まれた後に処理
      if (stateLocationId) {
        setSelectedLocationId(stateLocationId); // 一旦セット
      }
      
      if (stateEventId) {
        setSelectedEventId(stateEventId);
      }
    }
    // URL パラメータから日付を処理
    else if (dateParam) {
      try {
        const date = new Date(dateParam);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setCurrentYear(date.getFullYear());
          setCurrentMonth(date.getMonth() + 1);
        }
      } catch (error) {
        console.warn('Invalid date parameter:', dateParam);
      }
    }
    
    // URL パラメータから地点 ID を処理
    if (locationIdParam) {
      const locationId = parseInt(locationIdParam);
      if (!isNaN(locationId)) {
        setSelectedLocationId(locationId);
      }
    }
  }, [searchParams, location.state]);

  // カレンダーデータを取得
  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getMonthlyCalendar(currentYear, currentMonth);
        console.log('Calendar data loaded:', response);
        console.log('First event structure:', response.events[0]);
        setCalendarData(response);
      } catch (error) {
        console.error('Failed to load calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [currentYear, currentMonth]);

  // 撮影地点を取得
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await apiClient.getLocations();
        console.log('Locations loaded:', response);
        setLocations(response.locations);
      } catch (error) {
        console.error('Failed to load locations:', error);
      }
    };

    loadLocations();
  }, []);

  // locations 読み込み後に、お気に入りから来た地点 ID の存在確認
  useEffect(() => {
    if (locations.length > 0 && selectedLocationId) {
      const locationExists = locations.find(loc => loc.id === selectedLocationId);
      if (!locationExists) {
        console.warn(`指定された地点 ID ${selectedLocationId} は存在しません。選択をリセットします。`);
        setSelectedLocationId(undefined);
      }
    }
  }, [locations, selectedLocationId]);

  // URL パラメータで指定された日付のイベントを自動読み込み
  useEffect(() => {
    if (selectedDate && calendarData) {
      handleDateClick(selectedDate);
    }
  }, [selectedDate, calendarData]);

  // 月変更ハンドラー
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // 日付選択ハンドラー
  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setLoading(true);
    
    // 日付が変わったら地点選択をリセット
    setSelectedLocationId(undefined);
    
    try {
      const dateString = timeUtils.formatDateString(date);
      const response = await apiClient.getDayEvents(dateString);
      setDayEvents(response.events || []);
      
      // 最初の地点を自動選択（イベントがある場合）
      if (response.events && response.events.length > 0) {
        setSelectedLocationId(response.events[0].location.id);
      } else {
        // イベントが存在しない場合は地点選択をクリア
        setSelectedLocationId(undefined);
        console.warn(`選択された日付 ${timeUtils.formatDateString(date)} にはイベントが存在しません`);
      }
      
      // 天気情報を取得（7 日間以内の未来日付のみ）
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        try {
          const weatherResponse = await apiClient.getWeather(dateString);
          setWeather(weatherResponse);
        } catch (weatherError) {
          console.warn('Failed to load weather data:', weatherError);
          setWeather(undefined);
        }
      } else {
        setWeather(undefined);
      }
    } catch (error) {
      console.error('Failed to load day events:', error);
      setDayEvents([]);
      setWeather(undefined);
    } finally {
      setLoading(false);
    }
  };

  // 地点選択ハンドラー
  const handleLocationSelect = (location: Location) => {
    setSelectedLocationId(location.id);
  };

  // フィルタリングされたイベントを計算
  const filteredEvents = useMemo(() => {
    if (!dayEvents.length) return [];

    return dayEvents.filter(event => {
      // 距離フィルター
      if (filters.distance !== 'all') {
        const distance = (event.location.fujiDistance || 0) / 1000; // メートルからキロメートルに変換
        switch (filters.distance) {
          case 'very_near':
            if (distance > 50) return false;
            break;
          case 'near':
            if (distance > 100) return false;
            break;
          case 'medium':
            if (distance > 200) return false;
            break;
          case 'far':
            if (distance > 300) return false;
            break;
          case 'very_far':
            if (distance <= 300) return false;
            break;
        }
      }

      // イベントタイプフィルター（複数選択可能）
      const hasEventTypeFilter = filters.diamondSunrise || filters.diamondSunset || 
                                 filters.pearlMoonrise || filters.pearlMoonset;
      
      if (hasEventTypeFilter) {
        const isDiamond = event.type === 'diamond';
        const isPearl = event.type === 'pearl';
        const isRising = event.subType === 'rising' || event.subType === 'sunrise';
        const isSetting = event.subType === 'setting' || event.subType === 'sunset';

        let matchesFilter = false;
        
        if (isDiamond && isRising && filters.diamondSunrise) matchesFilter = true;
        if (isDiamond && isSetting && filters.diamondSunset) matchesFilter = true;
        if (isPearl && isRising && filters.pearlMoonrise) matchesFilter = true;
        if (isPearl && isSetting && filters.pearlMoonset) matchesFilter = true;

        if (!matchesFilter) return false;
      }

      // 特別イベントフィルター（現在は基本のイベントのみなので、将来の拡張用）
      // TODO: 実際の日食・月食・スーパームーンデータが利用可能になったら実装
      
      return true;
    });
  }, [dayEvents, filters]);

  if (!calendarData) {
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      padding: '2rem 0'
    }}>
      <div style={{ 
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1.5rem'
        }}>
          {/* 左カラム: カレンダーと地図 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SimpleCalendar
            year={currentYear}
            month={currentMonth}
            events={calendarData.events}
            onDateClick={handleDateClick}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate || undefined}
          />
          
          {selectedDate && (
            <SimpleMap
              locations={locations}
              selectedDate={selectedDate}
              selectedEvents={filteredEvents}
              selectedLocationId={selectedLocationId}
              selectedEventId={selectedEventId}
              onLocationSelect={handleLocationSelect}
              cameraSettings={cameraSettings}
            />
          )}
          
          {/* 地図下のコントロールパネル */}
          {selectedDate && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '1rem'
            }}>
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                eventCount={filteredEvents.length}
                uniqueLocationCount={new Set(filteredEvents.map(e => e.location.id)).size}
              />
              <CameraPanel
                cameraSettings={cameraSettings}
                onCameraSettingsChange={setCameraSettings}
              />
            </div>
          )}

          {/* 撮影地詳細情報 */}
          {selectedDate && filteredEvents.length > 0 && (
            <EventDetail
              date={selectedDate}
              events={filteredEvents}
              weather={weather}
              selectedLocationId={selectedLocationId}
              onLocationSelect={(location) => {
                if (location) {
                  setSelectedLocationId(location.id);
                } else {
                  setSelectedLocationId(undefined);
                }
              }}
            />
          )}
        </div>

        {/* 右カラム: サイドバー */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          position: 'sticky',
          top: '1rem',
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto'
        }}>
          {/* 使い方ガイド */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <Icon name="book" size={20} style={{ marginRight: '0.5rem' }} />
              <h3 style={{ 
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                使い方ガイド
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>1</span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                    日付を選択
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                    カレンダーから撮影したい日付をクリック
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>2</span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                    地図で位置確認
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                    地図上で撮影地点とルート確認
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>3</span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                    撮影地詳細を確認
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                    下に表示される詳細情報をチェック
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#0369a1',
                fontWeight: '500'
              }}>
                <Icon name="lightbulb" size={16} />
                <span><Icon name="sun" size={14} style={{ display: 'inline', marginRight: '2px' }} />ダイヤモンド富士 <Icon name="moon" size={14} style={{ display: 'inline', marginLeft: '4px', marginRight: '2px' }} />パール富士のアイコンで種類を確認できます</span>
              </div>
            </div>
          </div>

          {/* 選択中の情報 */}
          {selectedDate && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <Icon name="calendar" size={20} style={{ marginRight: '0.5rem' }} />
                <h3 style={{ 
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  選択中の情報
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 選択日付 */}
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#0369a1',
                    fontWeight: '600',
                    marginBottom: '0.25rem'
                  }}>
                    選択日付
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#0c4a6e',
                    fontWeight: '500'
                  }}>
                    {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#0369a1',
                    marginTop: '0.25rem'
                  }}>
                    {['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()]}曜日
                  </div>
                </div>

                {/* 選択地点 */}
                {selectedLocationId && locations.length > 0 && (() => {
                  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
                  return selectedLocation ? (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#166534',
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                      }}>
                        選択地点
                      </div>
                      <div style={{
                        fontSize: '1rem',
                        color: '#14532d',
                        fontWeight: '500',
                        marginBottom: '0.25rem'
                      }}>
                        {selectedLocation.name}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#166534'
                      }}>
                        {selectedLocation.prefecture} • 標高{selectedLocation.elevation.toFixed(0)}m
                      </div>
                      {selectedLocation.fujiDistance && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#166534',
                          marginTop: '0.25rem'
                        }}>
                          富士山まで約{(selectedLocation.fujiDistance / 1000).toFixed(1)}km
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

                {/* イベント数 */}
                {filteredEvents.length > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fbbf24',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#92400e',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}>
                      この日のイベント
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#78350f',
                      fontWeight: '500'
                    }}>
                      {filteredEvents.length}件のイベント
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#92400e',
                      marginTop: '0.25rem'
                    }}>
                      {new Set(filteredEvents.map(e => e.location.id)).size}箇所の撮影地点
                    </div>
                  </div>
                )}

                {/* 天気情報（ある場合） */}
                {weather && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fefce8',
                    borderRadius: '8px',
                    border: '1px solid #fde047',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#a16207',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}>
                      天気予報
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#713f12',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {getWeatherIcon(weather.condition)}
                      {weather.condition}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#a16207',
                      marginTop: '0.25rem'
                    }}>
                      撮影条件: {weather.recommendation === 'excellent' ? '最適' : weather.recommendation === 'good' ? '良い' : weather.recommendation === 'fair' ? '可能' : '困難'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
};

export default HomePage;