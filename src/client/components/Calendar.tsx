import React, { useMemo, memo } from 'react';
import { CalendarEvent, FujiEvent } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import styles from './Calendar.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji_small.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

interface CalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate?: Date;
}

const Calendar: React.FC<CalendarProps> = memo(({
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

  const handlePrevYear = () => {
    onMonthChange(year - 1, month);
  };

  const handleNextYear = () => {
    onMonthChange(year + 1, month);
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(event.target.value);
    onMonthChange(newYear, month);
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(event.target.value);
    onMonthChange(year, newMonth);
  };

  const handleDateClick = (date: Date) => {
    onDateClick(date);
  };

  const handleTodayClick = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // 現在表示されている年月と異なる場合のみ月を変更
    if (year !== currentYear || month !== currentMonth) {
      onMonthChange(currentYear, currentMonth);
      // カレンダーデータの更新を待ってから日付を選択
      setTimeout(() => {
        onDateClick(today);
      }, 200);
    } else {
      // 同じ月の場合は即座に日付を選択
      onDateClick(today);
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

  const getEventIcon = (eventType?: 'diamond' | 'pearl' | 'both'): JSX.Element | string => {
    switch (eventType) {
      case 'diamond':
        return <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIcon} loading="lazy" />;
      case 'pearl':
        return <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIcon} loading="lazy" />;
      case 'both':
        return (
          <div className={styles.bothIcons}>
            <img src={diamondFujiIcon} alt="ダイヤモンド富士" className={styles.eventIconSmall} loading="lazy" />
            <img src={pearlFujiIcon} alt="パール富士" className={styles.eventIconSmall} loading="lazy" />
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

  // 年の選択肢を生成（現在年から前後10年）
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // 月の選択肢を生成
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  return (
    <div className={styles.calendar}>
      {/* カレンダーヘッダー */}
      <div className={styles.header}>
        <div className={styles.yearNavigation}>
          <button 
            className={styles.navButton} 
            onClick={handlePrevYear}
            aria-label="前の年"
            title="前の年"
          >
            ‹‹
          </button>
          <button 
            className={styles.navButton} 
            onClick={handlePrevMonth}
            aria-label="前の月"
            title="前の月"
          >
            ‹
          </button>
        </div>
        
        <div className={styles.titleSection}>
          <select 
            className={styles.yearSelect}
            value={year}
            onChange={handleYearChange}
            aria-label="年を選択"
          >
            {generateYearOptions().map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          
          <select 
            className={styles.monthSelect}
            value={month}
            onChange={handleMonthChange}
            aria-label="月を選択"
          >
            {monthNames.map((name, index) => (
              <option key={index + 1} value={index + 1}>{name}</option>
            ))}
          </select>
          
          <button 
            className={styles.todayButton}
            onClick={handleTodayClick}
            aria-label="今日に移動"
            title="今日に移動"
          >
            今日
          </button>
        </div>
        
        <div className={styles.yearNavigation}>
          <button 
            className={styles.navButton} 
            onClick={handleNextMonth}
            aria-label="次の月"
            title="次の月"
          >
            ›
          </button>
          <button 
            className={styles.navButton} 
            onClick={handleNextYear}
            aria-label="次の年"
            title="次の年"
          >
            ››
          </button>
        </div>
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
});

Calendar.displayName = 'Calendar';

export default Calendar;