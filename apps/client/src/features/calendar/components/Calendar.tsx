import React, { useMemo, memo } from "react";
import { CalendarEvent, FujiEvent } from "@fuji-calendar/types";
import { timeUtils } from "@fuji-calendar/utils";
import { Sun, Moon } from "lucide-react";

interface CalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate?: Date;
}

const Calendar: React.FC<CalendarProps> = memo(
  ({ year, month, events, onDateClick, onMonthChange, selectedDate }) => {
    // カレンダーのデータを生成
    const calendarData = useMemo(() => {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const startDate = new Date(firstDay);
      const endDate = new Date(lastDay);

      // 月の最初の週の日曜日から開始
      startDate.setDate(startDate.getDate() - startDate.getDay());

      // 月末が含まれる週の土曜日まで
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

      // カレンダーは 5 行（35 日）または 6 行（42 日）になる

      const days: Array<{
        date: Date;
        isCurrentMonth: boolean;
        events: FujiEvent[];
        eventType?: "diamond" | "pearl" | "both";
      }> = [];

      const current = new Date(startDate);
      while (current <= endDate) {
        const dateString = timeUtils.formatDateString(current);
        const dayEvents = events.find(
          (e) => timeUtils.formatDateString(e.date) === dateString,
        );

        const dayEventsList = dayEvents?.events || [];
        days.push({
          date: new Date(current),
          isCurrentMonth: current.getMonth() === month - 1,
          events: dayEventsList,
          eventType: dayEventsList.length > 0 ? dayEvents?.type : undefined,
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

    const getEventIcon = (
      eventType?: "diamond" | "pearl" | "both",
    ): JSX.Element | string => {
      switch (eventType) {
        case "diamond":
          return <Sun className="w-[18px] h-[18px] text-orange-500 drop-shadow-sm" />;
        case "pearl":
          return <Moon className="w-[18px] h-[18px] text-blue-500 drop-shadow-sm" />;
        case "both":
          return (
            <div className="flex items-center justify-center gap-0.5">
              <Sun className="w-3.5 h-3.5 mx-0.5 text-orange-500 drop-shadow-sm" />
              <Moon className="w-3.5 h-3.5 mx-0.5 text-blue-500 drop-shadow-sm" />
            </div>
          );
        default:
          return "";
      }
    };

    const formatEventCount = (events: FujiEvent[]): string => {
      if (events.length === 0) return "";
      if (events.length === 1) return "1 件";
      return `${events.length}件`;
    };

    // 年の選択肢を生成（現在年から前後 10 年）
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
      "1 月",
      "2 月",
      "3 月",
      "4 月",
      "5 月",
      "6 月",
      "7 月",
      "8 月",
      "9 月",
      "10 月",
      "11 月",
      "12 月",
    ];

    return (
      <div className="bg-white rounded-2xl shadow-[0_10px_20px_rgba(8,145,178,0.19),0_6px_6px_rgba(8,145,178,0.23)] overflow-hidden select-none border border-cyan-700/20 backdrop-blur-sm">
        {/* カレンダーヘッダー */}
        <div className="relative overflow-hidden flex items-center justify-between px-8 py-6 bg-gradient-to-br from-cyan-600 to-cyan-800 text-white gap-4">
          <div className="flex gap-1">
            <button
              className="bg-transparent border-none text-white text-2xl font-bold p-2 cursor-pointer rounded min-w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/10 focus:outline focus:outline-2 focus:outline-white/50 focus:outline-offset-2"
              onClick={handlePrevYear}
              aria-label="前の年"
              title="前の年"
            >
              ‹‹
            </button>
            <button
              className="bg-transparent border-none text-white text-2xl font-bold p-2 cursor-pointer rounded min-w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/10 focus:outline focus:outline-2 focus:outline-white/50 focus:outline-offset-2"
              onClick={handlePrevMonth}
              aria-label="前の月"
              title="前の月"
            >
              ‹
            </button>
          </div>

          <div className="relative z-10 flex items-center justify-center flex-1 gap-3">
            <select
              className="bg-white/20 border border-white/30 rounded-xl text-white px-4 py-3 text-base font-semibold cursor-pointer transition-all duration-300 ease-out min-w-[100px] w-[100px] text-center backdrop-blur-lg shadow-[0_4px_8px_rgba(3,36,51,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-white/30 hover:border-white/50 hover:shadow-[0_8px_16px_rgba(3,36,51,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:scale-[1.02] focus:outline focus:outline-2 focus:outline-white/80 focus:outline-offset-2 focus:bg-white/25 focus:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              value={year}
              onChange={handleYearChange}
              aria-label="年を選択"
            >
              {generateYearOptions().map((y) => (
                <option key={y} value={y} className="bg-cyan-600 text-white">
                  {y}年
                </option>
              ))}
            </select>

            <select
              className="bg-white/20 border border-white/30 rounded-xl text-white px-4 py-3 text-base font-semibold cursor-pointer transition-all duration-300 ease-out min-w-[80px] w-[80px] text-center backdrop-blur-lg shadow-[0_4px_8px_rgba(3,36,51,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-white/30 hover:border-white/50 hover:shadow-[0_8px_16px_rgba(3,36,51,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:scale-[1.02] focus:outline focus:outline-2 focus:outline-white/80 focus:outline-offset-2 focus:bg-white/25 focus:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              value={month}
              onChange={handleMonthChange}
              aria-label="月を選択"
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1} className="bg-cyan-600 text-white">
                  {name}
                </option>
              ))}
            </select>

            <button
              className="bg-white/90 border border-white/40 rounded-md text-cyan-600 px-3 py-2 text-sm font-semibold cursor-pointer transition-all duration-200 min-w-[60px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.1)] ml-2 hover:bg-white hover:border-white/60 hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] hover:-translate-y-px focus:outline focus:outline-2 focus:outline-white/80 focus:outline-offset-2 focus:bg-white focus:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              onClick={handleTodayClick}
              aria-label="今日に移動"
              title="今日に移動"
            >
              今日
            </button>
          </div>

          <div className="flex gap-1">
            <button
              className="bg-transparent border-none text-white text-2xl font-bold p-2 cursor-pointer rounded min-w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/10 focus:outline focus:outline-2 focus:outline-white/50 focus:outline-offset-2"
              onClick={handleNextMonth}
              aria-label="次の月"
              title="次の月"
            >
              ›
            </button>
            <button
              className="bg-transparent border-none text-white text-2xl font-bold p-2 cursor-pointer rounded min-w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/10 focus:outline focus:outline-2 focus:outline-white/50 focus:outline-offset-2"
              onClick={handleNextYear}
              aria-label="次の年"
              title="次の年"
            >
              ››
            </button>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <div
              key={day}
              className={`py-3 px-2 text-center font-semibold text-sm ${
                index === 0 ? "text-red-500" : index === 6 ? "text-cyan-500" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダー本体 */}
        <div className="flex flex-col">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
              {week.map((day, dayIndex) => {
                const dayClasses = [
                  "relative min-h-[70px] p-1.5 border-r border-gray-200 last:border-r-0 cursor-pointer transition-all duration-200 flex flex-col bg-white hover:bg-gray-50 focus:outline focus:outline-2 focus:outline-cyan-600 focus:-outline-offset-2 focus:z-10",
                ];

                if (!day.isCurrentMonth) {
                  dayClasses.push("text-gray-400 bg-gray-50 opacity-100 border border-gray-200 hover:bg-gray-100 hover:opacity-80");
                }

                if (isToday(day.date)) {
                  dayClasses.push("bg-gradient-to-br from-yellow-100 to-yellow-200 font-bold border-2 border-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] relative z-[3] before:content-['今日'] before:absolute before:top-0.5 before:right-1 before:text-[0.6rem] before:font-bold before:text-amber-500 before:bg-white/95 before:px-1 before:py-0.5 before:rounded before:leading-none before:z-10 before:border before:border-amber-300");
                }

                if (isSelectedDate(day.date)) {
                  dayClasses.push("bg-gradient-to-br from-sky-100 to-sky-200 text-cyan-900 border-2 border-cyan-600 shadow-[0_4px_14px_rgba(8,145,178,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] scale-105 z-[2]");
                }

                if (day.events.length > 0) {
                  dayClasses.push("bg-gradient-to-br from-yellow-50 to-yellow-100 border border-amber-300/40 shadow-[0_2px_8px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-yellow-100 hover:to-yellow-200 hover:border-amber-300/60 hover:shadow-[0_4px_12px_rgba(251,191,36,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] hover:-translate-y-px");
                }

                if (isSelectedDate(day.date) && day.events.length > 0) {
                  dayClasses.push("!bg-gradient-to-br !from-cyan-600 !to-cyan-800 !border-white/40 !shadow-[0_6px_16px_rgba(30,107,150,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]");
                }

                if (!day.isCurrentMonth && day.events.length > 0) {
                  dayClasses.push("!bg-gray-50 !border !border-gray-300 !shadow-[0_1px_3px_rgba(0,0,0,0.1)] !opacity-80 hover:!bg-gray-100 hover:!opacity-100 hover:!transform-none");
                }

                return (
                  <div
                    key={day.date.getTime()}
                    className={dayClasses.join(" ")}
                    onClick={() => handleDateClick(day.date)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDateClick(day.date);
                      }
                    }}
                    aria-label={`${day.date.getDate()}日${
                      day.events.length > 0
                        ? ` - ${formatEventCount(day.events)}`
                        : ""
                    }`}
                  >
                    <div className={`text-sm font-medium leading-tight mb-0.5 ${
                      isToday(day.date) && !isSelectedDate(day.date) ? "text-amber-500 font-extrabold text-base drop-shadow-[0_1px_3px_rgba(245,158,11,0.3)]" :
                      isSelectedDate(day.date) && !day.isCurrentMonth ? "text-cyan-900 font-bold text-base drop-shadow-[0_1px_2px_rgba(15,56,71,0.3)]" :
                      isSelectedDate(day.date) ? "text-cyan-900 font-bold text-base drop-shadow-[0_1px_2px_rgba(15,56,71,0.3)]" :
                      !day.isCurrentMonth && (dayIndex === 0 || dayIndex === 6) ? "text-gray-400" :
                      !day.isCurrentMonth ? "text-gray-400 font-medium text-sm" :
                      dayIndex === 0 ? "text-red-500" :
                      dayIndex === 6 ? "text-cyan-500" :
                      ""
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {day.events.length > 0 && day.eventType && (
                      <div className="mt-auto flex items-center justify-center gap-0.5 flex-wrap min-h-4">
                        <span className={`text-xl leading-none ${
                          isSelectedDate(day.date) ? "brightness-130 drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : ""
                        } ${
                          !day.isCurrentMonth ? "opacity-70" : ""
                        }`}>
                          {getEventIcon(day.eventType)}
                        </span>
                        <span className={`text-xs font-semibold text-slate-700 leading-none bg-white rounded-[10px] px-1.5 py-0.5 border border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${
                          isSelectedDate(day.date) ? "text-slate-800 bg-white border-slate-200 font-bold shadow-[0_2px_4px_rgba(0,0,0,0.2)]" : ""
                        } ${
                          !day.isCurrentMonth ? "opacity-80 bg-white text-gray-500 border-gray-300 text-[0.7rem]" : ""
                        }`}>
                          {formatEventCount(day.events)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

Calendar.displayName = "Calendar";

export default Calendar;