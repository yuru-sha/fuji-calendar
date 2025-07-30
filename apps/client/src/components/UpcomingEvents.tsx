import React, { useState, useEffect } from 'react';
import { FujiEvent } from '@fuji-calendar/types';
import { FujiIcon, Icon } from '@fuji-calendar/ui';

interface UpcomingEventsProps {
  limit?: number;
  className?: string;
  onEventClick?: (event: FujiEvent) => void;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  limit = 10,
  className = '',
  onEventClick
}) => {
  const [events, setEvents] = useState<FujiEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUpcomingEvents();
  }, [limit]);

  const loadUpcomingEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/upcoming?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        // 時刻文字列を Date オブジェクトに変換
        const formattedEvents = data.events.map((event: any) => ({
          ...event,
          time: new Date(event.time)
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('今後のイベント取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays <= 7) return `${diffDays}日後`;
    
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatEventTime = (time: Date) => {
    return time.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Icon name="clock" size={20} className="text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">今後のイベント</h3>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm">今後のイベントはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex-shrink-0">
                <FujiIcon type={event.type} size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.location.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.location.prefecture}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-medium text-blue-600">
                      {formatEventDate(event.time)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatEventTime(event.time)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-600">
                    {event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'}
                    {' '}({event.subType === 'sunrise' || event.subType === 'rising' ? '日の出' : '日の入り'})
                  </p>
                  
                  {event.qualityScore && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        event.qualityScore >= 0.8 ? 'bg-green-500' :
                        event.qualityScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs text-gray-500">
                        {(event.qualityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={loadUpcomingEvents}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            更新
          </button>
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;