import React, { memo, useState, useEffect } from "react";
import { FujiEvent, Location } from "@fuji-calendar/types";
import { timeUtils } from "@fuji-calendar/utils";
import { useFavorites } from "../hooks/useFavorites";
import { Icon } from "@fuji-calendar/ui";

interface EventDetailProps {
  date: Date;
  events: FujiEvent[];
  selectedLocationId?: number;
  onLocationSelect?: (location: Location | null) => void;
}

const EventDetail: React.FC<EventDetailProps> = memo(
  ({ date, events, selectedLocationId, onLocationSelect }) => {
    const {
      isEventFavorite,
      toggleEventFavorite,
      isLocationFavorite,
      toggleLocationFavorite,
    } = useFavorites();
    const [expandedLocationIds, setExpandedLocationIds] = useState<Set<number>>(
      () => {
        // selectedLocationId が指定されている場合はそれを展開、なければ最初の地点を展開
        if (selectedLocationId && events.some(e => e.location.id === selectedLocationId)) {
          return new Set([selectedLocationId]);
        } else if (events.length > 0) {
          const firstLocationId = events[0].location.id;
          return new Set([firstLocationId]);
        }
        return new Set();
      },
    );

    // selectedLocationId が変更された時にアコーディオンを更新
    useEffect(() => {
      if (selectedLocationId && events.some(e => e.location.id === selectedLocationId)) {
        // 選択された地点のみを展開し、他は閉じる
        setExpandedLocationIds(new Set([selectedLocationId]));
      } else if (!selectedLocationId) {
        // 地点が選択されていない場合は全て閉じる
        setExpandedLocationIds(new Set());
      }
    }, [selectedLocationId, events]);

    const formatTime = (time: Date): string => {
      return timeUtils.formatJstTime(time);
    };

    const getCompassDirection = (azimuth: number): string => {
      const directions = [
        "北",
        "北北東",
        "北東",
        "東北東",
        "東",
        "東南東",
        "南東",
        "南南東",
        "南",
        "南南西",
        "南西",
        "西南西",
        "西",
        "西北西",
        "北西",
        "北北西",
      ];

      // 方位角を 16 方位に変換
      const index = Math.round(azimuth / 22.5) % 16;
      return directions[index];
    };

    const getMoonPhaseName = (
      moonPhase: number,
    ): { name: string; icon: React.ReactNode } => {
      // moonPhase は 0-360 度の値なので正規化
      const normalizedPhase = ((moonPhase % 360) + 360) % 360;

      if (normalizedPhase < 22.5 || normalizedPhase >= 337.5)
        return {
          name: "新月",
          icon: <span className="text-base">🌑</span>,
        };
      if (normalizedPhase < 67.5)
        return {
          name: "三日月",
          icon: <span className="text-base">🌒</span>,
        };
      if (normalizedPhase < 112.5)
        return {
          name: "上弦の月",
          icon: <span className="text-base">🌓</span>,
        };
      if (normalizedPhase < 157.5)
        return {
          name: "十三夜月",
          icon: <span className="text-base">🌔</span>,
        };
      if (normalizedPhase < 202.5)
        return {
          name: "満月",
          icon: <span className="text-base">🌕</span>,
        };
      if (normalizedPhase < 247.5)
        return {
          name: "十六夜月",
          icon: <span className="text-base">🌖</span>,
        };
      if (normalizedPhase < 292.5)
        return {
          name: "下弦の月",
          icon: <span className="text-base">🌗</span>,
        };
      return {
        name: "二十六夜月",
        icon: <span className="text-base">🌘</span>,
      };
    };

    const getEventDisplayName = (event: FujiEvent): string => {
      const typeLabel = event.type === "diamond" ? "ダイヤモンド富士" : "パール富士";
      let subTypeLabel = "";

      if (event.type === "diamond") {
        subTypeLabel = event.subType === "sunrise" ? "昇る" : "沈む";
      } else {
        subTypeLabel = event.subType === "rising" ? "昇る" : "沈む";
      }

      return `${subTypeLabel}${typeLabel}`;
    };

    // 仰角の表示用フォーマット（-0.0 を 0.0 に統一）
    const formatElevation = (elevation: number): string => {
      const rounded = Math.round(elevation * 10) / 10;
      return rounded === 0 ? "0.0" : rounded.toFixed(1);
    };

    const getAccuracyDisplayName = (accuracy: string): string => {
      const accuracyMap = {
        perfect: "完全一致",
        excellent: "非常に高精度",
        good: "高精度",
        fair: "標準精度"
      };
      return accuracyMap[accuracy as keyof typeof accuracyMap] || accuracy;
    };

    // 折りたたみボタンで地図連携も含めて制御
    const handleLocationToggle = (locationId: number, location: Location) => {
      const isExpanded = expandedLocationIds.has(locationId);

      if (isExpanded) {
        // 折りたたみ：選択解除して地図から除去
        setExpandedLocationIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(locationId);
          return newSet;
        });
        if (onLocationSelect && selectedLocationId === locationId) {
          onLocationSelect(null);
        }
      } else {
        // 展開：この地点のみを選択して地図に表示（他は全て閉じる）
        setExpandedLocationIds(new Set([locationId]));
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* ヘッダー */}
        <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
          <Icon name="calendar" size={20} className="mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 m-0">
            {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}
            日の撮影情報
          </h3>
        </div>

        {/* イベント一覧 */}
        <div>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="searchX" size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">この日はダイヤモンド富士・パール富士は発生しません。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // 地点ごとにイベントをグループ化
                const eventsByLocation = events.reduce(
                  (acc, event) => {
                    const locationId = event.location.id;
                    if (!acc[locationId]) {
                      acc[locationId] = [];
                    }
                    acc[locationId].push(event);
                    return acc;
                  },
                  {} as Record<number, FujiEvent[]>,
                );

                return Object.entries(eventsByLocation).map(
                  ([locationIdStr, locationEvents]: [string, FujiEvent[]]) => {
                    const locationId = parseInt(locationIdStr);
                    const location = locationEvents[0].location;
                    const isExpanded = expandedLocationIds.has(locationId);
                    const isSelected = selectedLocationId === locationId;

                    return (
                      <div key={locationId} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* 地点ヘッダー */}
                        <div
                          className={`p-4 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-gray-50'} transition-colors`}
                          onClick={() => handleLocationToggle(locationId, location)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Icon
                                name="location"
                                size={16}
                                className="text-gray-600"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  {location.name}
                                </span>
                                {isSelected && (
                                  <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                    地図表示中
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {locationEvents.length}件のイベント
                              </span>
                              <Icon
                                name={isExpanded ? "chevronDown" : "chevronRight"}
                                size={14}
                                className="text-gray-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 撮影地データ（展開時のみ表示） */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            {/* 撮影地データ */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                  <Icon name="data" size={14} />
                                  撮影地データ
                                </h6>
                                <div className="flex gap-1">
                                  <button
                                    className={`px-2 py-1 text-xs rounded transition-colors border ${
                                      isLocationFavorite(location.id)
                                        ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
                                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLocationFavorite(location);
                                    }}
                                    title={
                                      isLocationFavorite(location.id)
                                        ? "お気に入り地点から削除"
                                        : "お気に入り地点に追加"
                                    }
                                  >
                                    <Icon 
                                      name={isLocationFavorite(location.id) ? "starFilled" : "star"} 
                                      size={12} 
                                      className="inline mr-1" 
                                    />
                                    {isLocationFavorite(location.id) ? "お気に入り済み" : "お気に入り"}
                                  </button>
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs transition-colors border border-green-200 flex items-center gap-1.5"
                                    title="Google Maps で経路案内"
                                  >
                                    <Icon name="route" size={14} className="inline" />
                                    経路案内
                                  </a>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <div className="text-gray-500 mb-1">緯度:</div>
                                    <div className="font-medium text-gray-900">{location.latitude.toFixed(6)}°</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">経度:</div>
                                    <div className="font-medium text-gray-900">{location.longitude.toFixed(6)}°</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">海抜標高:</div>
                                    <div className="font-medium text-gray-900">約{location.elevation.toFixed(1)}m</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">富士山の方角:</div>
                                    <div className="font-medium text-gray-900">
                                      {location.fujiAzimuth
                                        ? `${getCompassDirection(location.fujiAzimuth)} (${Math.round(location.fujiAzimuth)}°)`
                                        : "計算中"}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="text-gray-500 mb-1">富士山まで:</div>
                                  <div className="font-medium text-gray-900">
                                    {location.fujiDistance
                                      ? `約${(location.fujiDistance / 1000).toFixed(1)}km`
                                      : "計算中"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* イベント詳細（展開時のみ表示） */}
                        {isExpanded && (
                          <div className="border-t border-gray-100">
                            {locationEvents.map((event, index) => (
                              <div
                                key={event.id || index}
                                className="p-4 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        name={event.type === "diamond" ? "sun" : "moon"}
                                        size={16}
                                        className={event.type === "diamond" ? "text-yellow-500" : "text-blue-400"}
                                      />
                                      <span className="font-medium text-gray-900">
                                        {getEventDisplayName(event)}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                                      event.accuracy === "perfect" ? "bg-gray-100 text-gray-700 border border-gray-200" :
                                      event.accuracy === "excellent" ? "bg-gray-50 text-gray-600 border border-gray-200" :
                                        event.accuracy === "good" ? "bg-gray-50 text-gray-600 border border-gray-200" :
                                          "bg-gray-50 text-gray-500 border border-gray-200"
                                    }`}>
                                      {getAccuracyDisplayName(event.accuracy)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900">
                                      {event.time.toLocaleTimeString("ja-JP", {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-gray-600">
                                  <div className="flex items-center gap-4">
                                    <span>方位角 {getCompassDirection(event.azimuth)}（{event.azimuth.toFixed(1)}°）</span>
                                    <span>
                                      仰角 {formatElevation(event.elevation)}°
                                      {event.elevation < 0 && (
                                        <span className="text-xs text-gray-500 ml-1">（見下ろし）</span>
                                      )}
                                    </span>
                                    {event.moonPhase !== undefined && event.type === "pearl" && (
                                      <span>
                                        {getMoonPhaseName(event.moonPhase).icon} {getMoonPhaseName(event.moonPhase).name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEventFavorite(event);
                                      }}
                                      className={`px-2 py-1 text-xs rounded transition-colors ${
                                        isEventFavorite(event.id)
                                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                      }`}
                                    >
                                      <Icon name="calendar" size={12} className="inline mr-1" />
                                      {isEventFavorite(event.id) ? "予定済み" : "予定に追加"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  },
);

EventDetail.displayName = "EventDetail";

export default EventDetail;