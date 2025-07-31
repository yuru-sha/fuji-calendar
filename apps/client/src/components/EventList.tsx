import React from 'react';
import { FujiEvent } from '@fuji-calendar/types';
import { FujiIcon, Icon } from '@fuji-calendar/ui';

interface EventListProps {
  events: FujiEvent[];
  selectedLocationId?: number;
  onLocationSelect?: (locationId: number) => void;
  className?: string;
}

const EventList: React.FC<EventListProps> = ({
  events,
  selectedLocationId,
  onLocationSelect,
  className = ''
}) => {
  if (events.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-4xl mb-2">📅</div>
        <p>この日にはイベントがありません</p>
      </div>
    );
  }

  const formatEventTime = (time: Date) => {
    return time.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  const getEventTypeLabel = (event: FujiEvent) => {
    const baseType = event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
    const subTypeLabel = event.subType === 'sunrise' || event.subType === 'rising' 
      ? '日の出' 
      : '日の入り';
    return `${baseType} (${subTypeLabel})`;
  };

  const getQualityLabel = (score?: number) => {
    if (!score) return '未評価';
    if (score >= 0.9) return '最高';
    if (score >= 0.8) return '優秀';
    if (score >= 0.7) return '良好';
    if (score >= 0.6) return '普通';
    return '要注意';
  };

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-blue-600';
    if (score >= 0.7) return 'text-yellow-600';
    if (score >= 0.6) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event) => (
        <div
          key={event.id}
          className={`bg-white rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
            selectedLocationId === event.location.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start space-x-4">
            {/* イベントアイコン */}
            <div className="flex-shrink-0 mt-1">
              <FujiIcon type={event.type} size={32} />
            </div>

            {/* イベント情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {getEventTypeLabel(event)}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatEventTime(event.time)}
                  </p>
                </div>
                
                {/* 品質スコア */}
                {event.qualityScore && (
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getQualityColor(event.qualityScore)}`}>
                      {getQualityLabel(event.qualityScore)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(event.qualityScore * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>

              {/* 地点情報 */}
              <div
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedLocationId === event.location.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => onLocationSelect?.(event.location.id)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name="location" size={16} className="text-gray-600" />
                  <span className="font-medium text-gray-900">{event.location.name}</span>
                  <span className="text-sm text-gray-500">({event.location.prefecture})</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">標高:</span> {event.location.elevation.toFixed(0)}m
                  </div>
                  <div>
                    <span className="font-medium">方位角:</span> {event.azimuth.toFixed(1)}°
                  </div>
                  <div>
                    <span className="font-medium">仰角:</span> {event.elevation?.toFixed(1) || 'N/A'}°
                  </div>
                  {event.location.fujiDistance && (
                    <div>
                      <span className="font-medium">富士山まで:</span> {(event.location.fujiDistance / 1000).toFixed(1)}km
                    </div>
                  )}
                </div>

                {event.location.description && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {event.location.description}
                  </p>
                )}
              </div>

              {/* 月の情報（パール富士の場合） */}
              {event.type === 'pearl' && (event.moonPhase !== undefined || event.moonIllumination !== undefined) && (
                <div className="mt-3 p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center space-x-4 text-sm text-blue-800">
                    <div className="flex items-center space-x-1">
                      <span>🌙</span>
                      <span>月齢: {event.moonPhase?.toFixed(1) || 'N/A'}</span>
                    </div>
                    {event.moonIllumination !== undefined && (
                      <div>
                        照度: {(event.moonIllumination * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;