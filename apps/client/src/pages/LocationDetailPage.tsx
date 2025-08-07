import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Location, FujiEvent } from "@fuji-calendar/types";
import { apiClient } from "../services/apiClient";
import { timeUtils } from "@fuji-calendar/utils";
import { useFavorites } from "../hooks/useFavorites";
import SimpleMap from "../components/SimpleMap";
import { Icon } from "@fuji-calendar/ui";

const LocationDetailPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const {
    isLocationFavorite,
    toggleLocationFavorite,
    isEventFavorite,
    toggleEventFavorite,
  } = useFavorites();

  const [location, setLocation] = useState<Location | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<FujiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocationDetail = async () => {
      if (!locationId) return;

      setLoading(true);
      setError(null);

      try {
        // 地点情報を取得
        const locationsResponse = await apiClient.getLocations();
        const foundLocation = locationsResponse.locations.find(
          (loc) => loc.id === parseInt(locationId),
        );

        if (!foundLocation) {
          setError("地点が見つかりませんでした");
          return;
        }

        setLocation(foundLocation);

        // 今後 3 ヶ月間のイベントを取得
        const today = new Date();
        const events: FujiEvent[] = [];

        for (let i = 0; i < 3; i++) {
          const targetDate = new Date(
            today.getFullYear(),
            today.getMonth() + i,
            1,
          );
          try {
            const calendarResponse = await apiClient.getMonthlyCalendar(
              targetDate.getFullYear(),
              targetDate.getMonth() + 1,
            );

            // この地点のイベントのみフィルタリング（FujiEvent の型のみ）
            const locationEvents = calendarResponse.events.filter(
              (event) =>
                "location" in event &&
                (event as any).location.id === foundLocation.id,
            ) as unknown as FujiEvent[];

            events.push(...locationEvents);
          } catch (error) {
            console.warn(
              `Failed to load events for ${targetDate.getFullYear()}-${targetDate.getMonth() + 1}:`,
              error,
            );
          }
        }

        // 今日以降のイベントのみ、時刻順にソート
        const futureEvents = events
          .filter((event) => new Date(event.time) >= today)
          .sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
          );

        setUpcomingEvents(futureEvents);
      } catch (error) {
        console.error("Failed to load location detail:", error);
        setError("地点情報の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadLocationDetail();
  }, [locationId]);

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

    const index = Math.round(azimuth / 22.5) % 16;
    return directions[index];
  };

  const formatEventDate = (time: string | Date) => {
    const date = typeof time === "string" ? new Date(time) : time;
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatEventTime = (time: string | Date) => {
    const date = typeof time === "string" ? new Date(time) : time;
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewEventDetail = (event: FujiEvent) => {
    const eventDate = new Date(event.time);
    const dateString = timeUtils.formatDateString(eventDate);

    navigate(`/?date=${dateString}`, {
      state: {
        selectedDate: eventDate,
        selectedLocationId: event.location.id,
        selectedEventId: event.id,
      },
    });
  };

  const handleGoogleMapsClick = () => {
    if (!location) return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(googleMapsUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-red-600">
        <h2>エラー</h2>
        <p>{error || "地点情報が見つかりませんでした"}</p>
        <Link to="/favorites" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          お気に入りに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="content-wide">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              ホーム
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <Link to="/favorites" className="hover:text-blue-600 transition-colors">
              お気に入り
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <span className="font-medium text-gray-900">地点詳細</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Icon name="mapPin" size={20} className="inline mr-2" />{" "}
              {location.name}
            </h1>
            <div className="text-lg text-gray-600">{location.prefecture}</div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${isLocationFavorite(location.id) ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`}
              onClick={() => toggleLocationFavorite(location)}
            >
              {isLocationFavorite(location.id) ? (
                <>
                  <Icon name="star" size={16} className="inline mr-1" />{" "}
                  お気に入り済み
                </>
              ) : (
                <>
                  <Icon name="star" size={16} className="inline mr-1" />{" "}
                  お気に入り追加
                </>
              )}
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              onClick={handleGoogleMapsClick}
            >
              <Icon name="route" size={16} className="inline mr-1" /> 経路案内
            </button>
          </div>
        </div>

        {/* 2 カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: 地点情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="barChart" size={18} className="inline mr-2" />{" "}
                基本情報
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm font-medium text-gray-600">所在地:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {location.prefecture}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm font-medium text-gray-600">緯度:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {location.latitude.toFixed(6)}°
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm font-medium text-gray-600">経度:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {location.longitude.toFixed(6)}°
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm font-medium text-gray-600">標高:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    約{location.elevation.toFixed(1)}m
                  </span>
                </div>
                {location.fujiDistance && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">富士山まで:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      約{(location.fujiDistance / 1000).toFixed(1)}km
                    </span>
                  </div>
                )}
                {location.fujiAzimuth !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">富士山の方角:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {location.fujiAzimuth
                        ? `${getCompassDirection(location.fujiAzimuth)}（${Math.round(location.fujiAzimuth)}°）`
                        : "計算中"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* アクセス情報 */}
            {(location.accessInfo ||
              location.parkingInfo ||
              location.description) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Icon name="info" size={18} className="inline mr-2" />{" "}
                  アクセス・注意事項
                </h2>

                {location.accessInfo && (
                  <div className="mb-4">
                    <h3 className="text-base font-medium text-gray-900 mb-2 flex items-center">
                      <Icon
                        name="navigation"
                        size={16}
                        className="inline mr-1"
                      />{" "}
                      アクセス情報
                    </h3>
                    <p>{location.accessInfo}</p>
                  </div>
                )}

                {location.parkingInfo && (
                  <div className="mb-4">
                    <h3 className="text-base font-medium text-gray-900 mb-2 flex items-center">
                      <Icon name="parking" size={16} className="inline mr-1" />{" "}
                      駐車場情報
                    </h3>
                    <p>{location.parkingInfo}</p>
                  </div>
                )}

                {location.description && (
                  <div className="mb-4">
                    <h3 className="text-base font-medium text-gray-900 mb-2 flex items-center">
                      <Icon name="warning" size={16} className="inline mr-1" />{" "}
                      注意事項
                    </h3>
                    <p>{location.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* 今後のイベント */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="calendar" size={18} className="inline mr-2" />{" "}
                今後の撮影チャンス
              </h2>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>
                    今後 3
                    ヶ月間に撮影可能なダイヤモンド富士・パール富士はありません。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <div key={event.id || index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm">
                        <Icon
                          name={event.type === "diamond" ? "sun" : "moon"}
                          size={32}
                          className={
                            event.type === "diamond"
                              ? "text-orange-500"
                              : "text-blue-500"
                          }
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          {event.type === "diamond"
                            ? "ダイヤモンド富士"
                            : "パール富士"}
                          {event.subType === "sunrise" ||
                          event.subType === "rising"
                            ? " (日の出)"
                            : " (日の入り)"}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {formatEventDate(event.time)}{" "}
                          {formatEventTime(event.time)}
                        </div>
                        {event.elevation !== undefined && (
                          <div className="text-sm text-gray-500">
                            高度: {Math.round(event.elevation)}°
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center ${isEventFavorite(event.id) ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'}`}
                          onClick={() => toggleEventFavorite(event)}
                        >
                          {isEventFavorite(event.id) ? (
                            <>
                              <Icon
                                name="calendar"
                                size={14}
                                className="inline mr-1"
                              />{" "}
                              予定済み
                            </>
                          ) : (
                            <>
                              <Icon
                                name="calendar"
                                size={14}
                                className="inline mr-1"
                              />{" "}
                              予定追加
                            </>
                          )}
                        </button>
                        <button
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => handleViewEventDetail(event)}
                        >
                          詳細を見る
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: 地図 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="map" size={18} className="inline mr-2" /> 位置情報
              </h2>
              <div className="w-full">
                <SimpleMap
                  locations={[location]}
                  selectedEvents={upcomingEvents}
                  selectedLocationId={location.id}
                  onLocationSelect={() => {}}
                  cameraSettings={{
                    showAngles: true,
                    focalLength: 50,
                    sensorType: "fullframe",
                    aspectRatio: "3:2",
                    orientation: "landscape",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetailPage;
