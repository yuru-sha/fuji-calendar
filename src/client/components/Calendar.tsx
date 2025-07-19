import React, { useMemo } from 'react';
import { CalendarEvent, FujiEvent } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import styles from './Calendar.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji.png';

interface CalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({
  year,
  month,
  events,
  onDateClick,
  onMonthChange,
  selectedDate
}) => {
  // カレンダーのデータを生成
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
      events: FujiEvent[];
      eventType?: 'diamond' | 'pearl' | 'both';
    }> = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateString = timeUtils.formatDateString(current);
      const dayEvents = events.find(e => 
        timeUtils.formatDateString(e.date) === dateString
      );
      
      const dayEventsList = dayEvents?.events || [];
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month - 1,
        events: dayEventsList,
        eventType: dayEventsList.length > 0 ? dayEvents?.type : undefined
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [year, month, events]);

  // 週の分割
  const weeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      weeks.push(calendarData.slice(i, i + 7));
    }
    return weeks;
  }, [calendarData]);

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

  const handleDateClick = (date: Date) => {
    onDateClick(date);
  };

  const isSelectedDate = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventIcon = (eventType?: 'diamond' | 'pearl' | 'both'): JSX.Element | string => {
    switch (eventType) {
      case 'diamond':
        return <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIcon} />;
      case 'pearl':
        return <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIcon} />;
      case 'both':
        return (
          <div className={styles.bothIcons}>
            <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconSmall} />
            <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconSmall} />
          </div>
        );
      default:
        return '';
    }
  };

  const formatEventCount = (events: FujiEvent[]): string => {
    if (events.length === 0) return '';
    if (events.length === 1) return '1件';
    return `${events.length}件`;
  };

  return (
    <div className={styles.calendar}>
      {/* カレンダーヘッダー */}
      <div className={styles.header}>
        <button 
          className={styles.navButton} 
          onClick={handlePrevMonth}
          aria-label="前の月"
        >
          ‹
        </button>
        
        <h2 className={styles.title}>
          {year}年 {month}月
        </h2>
        
        <button 
          className={styles.navButton} 
          onClick={handleNextMonth}
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className={styles.weekdays}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div 
            key={day} 
            className={`${styles.weekday} ${
              index === 0 ? styles.sunday : index === 6 ? styles.saturday : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダー本体 */}
      <div className={styles.weeks}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.week}>
            {week.map((day, dayIndex) => (
              <div
                key={day.date.getTime()}
                className={`${styles.day} ${
                  !day.isCurrentMonth ? styles.otherMonth : ''
                } ${
                  isToday(day.date) ? styles.today : ''
                } ${
                  isSelectedDate(day.date) ? styles.selected : ''
                } ${
                  day.events.length > 0 ? styles.hasEvents : ''
                } ${
                  dayIndex === 0 ? styles.sunday : dayIndex === 6 ? styles.saturday : ''
                }`}
                onClick={() => handleDateClick(day.date)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDateClick(day.date);
                  }
                }}
                aria-label={`${day.date.getDate()}日${
                  day.events.length > 0 ? ` - ${formatEventCount(day.events)}` : ''
                }`}
              >
                <div className={styles.dateNumber}>
                  {day.date.getDate()}
                </div>
                
                {day.eventType && day.events.length > 0 && (
                  <div className={styles.eventIndicator}>
                    <span className={styles.eventIcon}>
                      {getEventIcon(day.eventType)}
                    </span>
                    <span className={styles.eventCount}>
                      {formatEventCount(day.events)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;