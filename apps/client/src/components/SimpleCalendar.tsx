import React, { useMemo } from 'react';
import { CalendarEvent } from '@fuji-calendar/types';
import { Icon } from './icons/IconMap';

interface SimpleCalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateClick: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({
  year,
  month,
  events,
  selectedDate,
  onDateClick,
  onMonthChange
}) => {
  // カレンダーのデータを生成（前月・来月の日付も含む）
  const calendarData = useMemo(() => {

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // 月の最初の週の日曜日から開始
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // 月の最後の週の土曜日まで
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month - 1,
        dayNumber: current.getDate()
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [year, month]);

  // 週の分割は使用していない（SimpleCalendar は単純な月表示）

  // 日付にイベントがあるかチェック
  const hasEvent = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const dayCalendarEvents = events.filter(event => event.date.toISOString().startsWith(dateStr));
    return dayCalendarEvents.some(calendarEvent => calendarEvent.events && calendarEvent.events.length > 0);
  };

  // 日付から直接月齢を計算
  const calculateMoonAgeFromDate = (date: Date): number => {
    // 2000 年 1 月 6 日 18:14 UTC が新月の基準点
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const synodicMonth = 29.530588853; // 朔望月の長さ（日）
    
    // 指定日との差を計算（日数）
    const daysDiff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    
    // 朔望月で割った余りが月齢
    const moonAge = daysDiff % synodicMonth;
    
    // 負の値の場合は正の値に変換
    return moonAge < 0 ? moonAge + synodicMonth : moonAge;
  };

  // 日付の月齢を取得（日付から直接計算）
  const getMoonAge = (date: Date): number => {
    return calculateMoonAgeFromDate(date);
  };

  // 日付のイベント詳細を取得
  const getEventDetails = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const dayCalendarEvents = events.filter(event => event.date.toISOString().startsWith(dateStr));
    

    
    // CalendarEvent 内の FujiEvent をすべて取得
    const allFujiEvents = dayCalendarEvents.flatMap(calendarEvent => calendarEvent.events);
    
    const diamondCount = allFujiEvents.filter(event => event.type === 'diamond').length;
    const pearlCount = allFujiEvents.filter(event => event.type === 'pearl').length;
    
    return {
      total: allFujiEvents.length,
      diamond: diamondCount,
      pearl: pearlCount,
      events: allFujiEvents
    };
  };

  // 選択された日付かチェック
  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  // 今日かチェック
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {year}年{month}月
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((dayData, index) => (
          <div key={`${dayData.date.getTime()}-${index}`} className="h-24">
            <button
              onClick={() => onDateClick(dayData.date)}
              className={`w-full h-full flex flex-col items-center justify-center text-sm rounded-md transition-all duration-200 relative ${
                isSelected(dayData.date)
                  ? 'bg-blue-100 text-blue-800 font-semibold border-2 border-blue-400'
                  : isToday(dayData.date)
                  ? 'bg-yellow-100 text-yellow-800 font-semibold border-2 border-yellow-400'
                  : !dayData.isCurrentMonth
                  ? 'text-gray-400 bg-gray-100 opacity-60 hover:opacity-80'
                  : hasEvent(dayData.date)
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-sm font-medium">{dayData.dayNumber}</span>
              {(() => {
                const eventDetails = getEventDetails(dayData.date);
                const moonAge = getMoonAge(dayData.date);
                
                return (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {/* イベント表示 */}
                    {eventDetails.total > 0 && (
                      <div className={`flex flex-col items-center gap-1 mt-1 ${!dayData.isCurrentMonth ? 'opacity-100' : ''}`}>
                        <div className="flex items-center gap-1">
                          {eventDetails.diamond > 0 && (
                            <Icon name="sun" size={14} className="text-orange-500" />
                          )}
                          {eventDetails.pearl > 0 && (
                            <Icon name="moon" size={14} className="text-blue-500" />
                          )}
                        </div>
                        <span className="text-xs font-semibold bg-white px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-700">
                          {eventDetails.total}件
                        </span>
                      </div>
                    )}
                    {/* 月齢表示 */}
                    {moonAge !== undefined && (
                      <div className={`text-xs text-gray-500 ${!dayData.isCurrentMonth ? 'opacity-80' : ''}`} style={{ fontSize: '10px', lineHeight: 1 }}>
                        月齢{moonAge.toFixed(1)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </button>
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <Icon name="sun" size={16} className="text-orange-500" />
          <span>ダイヤモンド富士</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="moon" size={16} className="text-blue-500" />
          <span>パール富士</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>選択中</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleCalendar;