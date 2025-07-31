import React from 'react';
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
  // 月の日数を取得
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  // カレンダーの日付配列を生成
  const calendarDays = [];
  
  // 前月の空白日
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // 当月の日付
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 日付にイベントがあるかチェック
  const hasEvent = (day: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayCalendarEvents = events.filter(event => event.date.toISOString().startsWith(dateStr));
    return dayCalendarEvents.some(calendarEvent => calendarEvent.events && calendarEvent.events.length > 0);
  };

  // 月相から月齢を計算（0-360 度 → 0-29.5 日）
  const calculateMoonAge = (moonPhase: number): number => {
    const normalizedPhase = ((moonPhase % 360) + 360) % 360;
    return (normalizedPhase / 360) * 29.5;
  };

  // 日付の月齢を取得
  const getMoonAge = (day: number): number | null => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayCalendarEvents = events.filter(event => event.date.toISOString().startsWith(dateStr));
    
    for (const calendarEvent of dayCalendarEvents) {
      for (const event of calendarEvent.events) {
        if (event.type === 'pearl' && event.moonPhase !== undefined) {
          return calculateMoonAge(event.moonPhase);
        }
      }
    }
    return null;
  };

  // 日付のイベント詳細を取得
  const getEventDetails = (day: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year &&
           selectedDate.getMonth() + 1 === month &&
           selectedDate.getDate() === day;
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
        {calendarDays.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                onClick={() => onDateClick(new Date(year, month - 1, day))}
                className={`w-full h-full flex flex-col items-center justify-center text-sm rounded-md transition-all duration-200 relative ${
                  isSelected(day)
                    ? 'bg-blue-600 text-white font-semibold'
                    : hasEvent(day)
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-sm font-medium">{day}</span>
                {(() => {
                  const eventDetails = getEventDetails(day);
                  const moonAge = getMoonAge(day);
                  
                  return (
                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                      {/* イベントアイコン */}
                      {eventDetails.total > 0 && (
                        <div className="flex items-center gap-1">
                          {eventDetails.diamond > 0 && (
                            <div className="flex items-center">
                              <Icon name="sun" size={12} className="text-orange-500" />
                              <span className="text-xs font-bold ml-0.5 text-orange-600">{eventDetails.diamond}</span>
                            </div>
                          )}
                          {eventDetails.pearl > 0 && (
                            <div className="flex items-center">
                              <Icon name="moon" size={12} className="text-blue-500" />
                              <span className="text-xs font-bold ml-0.5 text-blue-600">{eventDetails.pearl}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* 月齢表示 */}
                      {moonAge !== null && (
                        <div className="text-xs text-gray-500" style={{ fontSize: '10px', lineHeight: 1 }}>
                          月齢{moonAge.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </button>
            )}
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