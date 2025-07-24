import React, { useState, useEffect, useMemo } from 'react';
import { Location, FujiEvent, CalendarResponse } from '../../shared/types';
import { apiClient } from '../services/apiClient';
import SimpleCalendar from '../components/SimpleCalendar';
import SimpleMap from '../components/SimpleMap';
import FilterPanel, { FilterOptions } from '../components/FilterPanel';
import CameraPanel, { CameraSettings } from '../components/CameraPanel';

const HomePage: React.FC = () => {
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayEvents, setDayEvents] = useState<FujiEvent[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [filters, setFilters] = useState<FilterOptions>({
    distance: 'all',
    timeType: 'all',
    eventType: 'all'
  });
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    showAngles: false,
    focalLength: 50,
    sensorType: 'fullframe',
    customFocalLength: '50'
  });

  // カレンダーデータを取得
  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getMonthlyCalendar(currentYear, currentMonth);
        console.log('Calendar data loaded:', response);
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

  // 月変更ハンドラー
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // 日付選択ハンドラー
  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setLoading(true);
    
    try {
      const dateString = date.toISOString().split('T')[0];
      const response = await apiClient.getDayEvents(dateString);
      setDayEvents(response.events || []);
    } catch (error) {
      console.error('Failed to load day events:', error);
      setDayEvents([]);
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
        const distance = event.location.fujiDistance || 0;
        if (filters.distance === 'near' && distance > 100) return false;
        if (filters.distance === 'far' && distance <= 100) return false;
      }

      // 時間帯フィルター
      if (filters.timeType !== 'all') {
        const isRising = event.subType === 'rising' || event.subType === 'sunrise';
        if (filters.timeType === 'morning' && !isRising) return false;
        if (filters.timeType === 'evening' && isRising) return false;
      }

      // イベントタイプフィルター
      if (filters.eventType !== 'all') {
        if (filters.eventType !== event.type) return false;
      }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ 
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: 0,
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          ダイヤモンド富士・パール富士カレンダー
        </h1>
        <p style={{ 
          margin: '0.5rem 0 0 0',
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          撮影に最適な日時と場所を見つけましょう
        </p>
      </div>

      {/* 2カラムレイアウト */}
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
            selectedDate={selectedDate}
          />
          
          <SimpleMap
            locations={locations}
            selectedDate={selectedDate}
            selectedEvents={filteredEvents}
            selectedLocationId={selectedLocationId}
            onLocationSelect={handleLocationSelect}
            cameraSettings={cameraSettings}
          />
          
          {/* 地図下のコントロールパネル */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '1rem'
          }}>
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              eventCount={filteredEvents.length}
            />
            <CameraPanel
              cameraSettings={cameraSettings}
              onCameraSettingsChange={setCameraSettings}
            />
          </div>
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
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📖</span>
              <h3 style={{ 
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                使い方ガイド
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#3b82f6',
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
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
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
                    地点を確認
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                    地図で撮影地点を確認・選択
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
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
                    詳細をチェック
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                    イベント詳細で時刻や条件を確認
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#92400e',
                fontWeight: '500'
              }}>
                <span>💡</span>
                <span>☀️ダイヤモンド富士 🌙パール富士のアイコンで種類を確認できます</span>
              </div>
            </div>
          </div>

          {/* 選択された日の詳細 */}
          {selectedDate && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                📅 {selectedDate.toLocaleDateString('ja-JP')}
              </h3>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 0.5rem'
                  }}></div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>読み込み中...</p>
                </div>
              ) : filteredEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredEvents.map((event, index) => (
                    <div key={index} style={{ 
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {event.type === 'diamond' ? '☀️' : '🌙'}
                        </span>
                        <h4 style={{ 
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'}
                          ({event.subType === 'rising' ? '昇る' : '沈む'})
                        </h4>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.4' }}>
                        <p style={{ margin: '0.25rem 0' }}>
                          ⏰ {event.time.toLocaleTimeString('ja-JP')}
                        </p>
                        <p style={{ margin: '0.25rem 0' }}>
                          📍 {event.location.name} ({event.location.prefecture})
                        </p>
                        <p style={{ margin: '0.25rem 0' }}>
                          ⛰️ 標高: {event.location.elevation}m
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ 
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  padding: '1rem'
                }}>
                  この日はイベントがありません
                </p>
              )}
            </div>
          )}

          {/* 撮影地点統計 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📊 撮影地点情報
            </h3>
            <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              <p style={{ margin: '0.5rem 0' }}>
                🗾 登録地点数: <strong>{locations.length}箇所</strong>
              </p>
              <p style={{ margin: '0.5rem 0', fontSize: '0.75rem', color: '#6b7280' }}>
                ☁️ 天気情報は7日間の予報を表示
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;