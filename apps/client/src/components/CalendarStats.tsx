import React, { useState, useEffect } from 'react';
import { Icon } from '@fuji-calendar/ui';

interface CalendarStatsProps {
  year: number;
  className?: string;
}

interface StatsData {
  year: number;
  totalEvents: number;
  diamondEvents: number;
  pearlEvents: number;
  monthlyBreakdown: Array<{
    month: number;
    totalEvents: number;
    diamondEvents: number;
    pearlEvents: number;
  }>;
}

const CalendarStats: React.FC<CalendarStatsProps> = ({ year, className = '' }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [year]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calendar/stats/${year}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('統計データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const getMonthName = (month: number) => {
    return `${month}月`;
  };

  const diamondPercentage = stats.totalEvents > 0 ? (stats.diamondEvents / stats.totalEvents) * 100 : 0;
  const pearlPercentage = stats.totalEvents > 0 ? (stats.pearlEvents / stats.totalEvents) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="dashboard" size={20} className="text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">{year}年 統計情報</h3>
      </div>

      {/* 年間サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
          <div className="text-sm text-gray-600">総イベント数</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.diamondEvents}</div>
          <div className="text-sm text-gray-600">ダイヤモンド富士</div>
          <div className="text-xs text-gray-500">{diamondPercentage.toFixed(1)}%</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.pearlEvents}</div>
          <div className="text-sm text-gray-600">パール富士</div>
          <div className="text-xs text-gray-500">{pearlPercentage.toFixed(1)}%</div>
        </div>
      </div>

      {/* 月別グラフ */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">月別イベント数</h4>
        <div className="space-y-2">
          {stats.monthlyBreakdown.map((monthData) => {
            const maxEvents = Math.max(...stats.monthlyBreakdown.map(m => m.totalEvents));
            const barWidth = maxEvents > 0 ? (monthData.totalEvents / maxEvents) * 100 : 0;
            
            return (
              <div key={monthData.month} className="flex items-center space-x-3">
                <div className="w-8 text-sm text-gray-600 text-right">
                  {getMonthName(monthData.month)}
                </div>
                <div className="flex-1 relative">
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    {monthData.totalEvents > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-blue-400 rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                    {monthData.totalEvents > 0 && monthData.totalEvents}
                  </div>
                </div>
                <div className="w-16 text-xs text-gray-500 text-right">
                  {monthData.diamondEvents > 0 && (
                    <span className="text-orange-600">💎{monthData.diamondEvents}</span>
                  )}
                  {monthData.diamondEvents > 0 && monthData.pearlEvents > 0 && ' '}
                  {monthData.pearlEvents > 0 && (
                    <span className="text-blue-600">🌙{monthData.pearlEvents}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-1">
            <span>💎</span>
            <span className="text-orange-600">ダイヤモンド富士</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🌙</span>
            <span className="text-blue-600">パール富士</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarStats;