import React from 'react';
import { CalendarEvent } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';

interface SimpleCalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate?: Date;
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({
  year,
  month,
  events,
  onDateClick,
  onMonthChange,
  selectedDate
}) => {
  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // 月の最初の週の日曜日から開始
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // 月の最後の週の土曜日まで
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateString = timeUtils.formatDateString(current);
      const dayEvents = events.find(e => {
        // APIレスポンスのdate フィールドまたは event_date フィールドを確認
        const eventDate = (e as any).event_date || e.date;
        const eventDateString = eventDate instanceof Date 
          ? timeUtils.formatDateString(eventDate)
          : timeUtils.formatDateString(new Date(eventDate));
        return eventDateString === dateString;
      });
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month - 1,
        events: dayEvents || null
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const days = generateCalendarDays();

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

  const isSelectedDate = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <button
          onClick={handlePrevMonth}
          style={{
            border: 'none',
            background: '#e5e7eb',
            borderRadius: '4px',
            padding: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ‹
        </button>
        
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.25rem',
          fontWeight: '600'
        }}>
          {year}年 {month}月
        </h2>
        
        <button
          onClick={handleNextMonth}
          style={{
            border: 'none',
            background: '#e5e7eb',
            borderRadius: '4px',
            padding: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ›
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '1px',
        backgroundColor: '#e5e7eb'
      }}>
        {/* 曜日ヘッダー */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div key={day} style={{
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: index === 0 ? '#dc2626' : index === 6 ? '#2563eb' : '#374151'
          }}>
            {day}
          </div>
        ))}
        
        {/* 日付セル */}
        {days.map((day) => (
          <div
            key={day.date.getTime()}
            onClick={() => onDateClick(day.date)}
            style={{
              padding: '0.5rem',
              backgroundColor: day.events && day.events.events.length > 0 ? '#fef3c7' : 'white',
              textAlign: 'center',
              cursor: 'pointer',
              minHeight: '60px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: day.isCurrentMonth ? 1 : 0.5,
              border: isSelectedDate(day.date) ? '2px solid #2563eb' : 'none',
              boxShadow: isToday(day.date) ? 'inset 0 0 0 2px #10b981' : 'none'
            }}
          >
            <div style={{ 
              fontSize: '0.875rem',
              color: day.date.getDay() === 0 ? '#dc2626' : 
                    day.date.getDay() === 6 ? '#2563eb' : '#374151'
            }}>
              {day.date.getDate()}
            </div>
            
            {day.events && day.events.events.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                {day.events.events.some(e => e.type === 'diamond') && 
                  `☀️${day.events.events.filter(e => e.type === 'diamond').length}`}
                {day.events.events.some(e => e.type === 'pearl') && 
                  `🌙${day.events.events.filter(e => e.type === 'pearl').length}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleCalendar;