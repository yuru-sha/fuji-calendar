import React, { memo, useState } from "react";
import { FujiEvent, Location } from "@fuji-calendar/types";
import { timeUtils } from "@fuji-calendar/utils";
import { useFavorites } from "../hooks/useFavorites";
import { Icon } from "@fuji-calendar/ui";
import styles from "./EventDetail.module.css";

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
        // 初期状態では一番上（最初）の地点のみ展開
        if (events.length > 0) {
          const firstLocationId = events[0].location.id;
          return new Set([firstLocationId]);
        }
        return new Set();
      },
    );

    // HomePage 側で選択管理されるため、ここでの自動選択は不要
    // （HomePage の handleDateClick で最初の地点が自動選択される）
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

    const formatEventTitle = (event: FujiEvent): string => {
      const typeLabel =
        event.type === "diamond" ? "ダイヤモンド富士" : "パール富士";
      let subTypeLabel = "";

      if (event.type === "diamond") {
        subTypeLabel = event.subType === "sunrise" ? "昇る" : "沈む";
      } else {
        subTypeLabel = event.subType === "rising" ? "昇る" : "沈む";
      }

      return `【${subTypeLabel}${typeLabel}】`;
    };

    const getEventIcon = (event: FujiEvent): JSX.Element => {
      return event.type === "diamond" ? (
        <Icon name="sun" className={`${styles.eventIcon} text-orange-500`} />
      ) : (
        <Icon name="moon" className={`${styles.eventIcon} text-blue-500`} />
      );
    };



    const getAccuracyText = (
      accuracy: "perfect" | "excellent" | "good" | "fair",
    ): string => {
      switch (accuracy) {
        case "perfect":
          return "完全一致";
        case "excellent":
          return "非常に高精度";
        case "good":
          return "高精度";
        case "fair":
          return "標準精度";
        default:
          return "";
      }
    };

    const getAccuracyBadge = (
      accuracy: "perfect" | "excellent" | "good" | "fair",
    ): string => {
      switch (accuracy) {
        case "perfect":
          return styles.accuracyPerfect;
        case "excellent":
          return styles.accuracyExcellent;
        case "good":
          return styles.accuracyGood;
        case "fair":
          return styles.accuracyFair;
        default:
          return "";
      }
    };

    const handleGoogleMapsClick = (event: FujiEvent) => {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.location.latitude},${event.location.longitude}`;
      window.open(googleMapsUrl, "_blank");
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

    // 不要になった関数を削除

    return (
      <div className={styles.eventDetail}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}
            日の撮影情報
          </h3>
        </div>



        {/* イベント一覧 */}
        <div className={styles.events}>
          {events.length === 0 ? (
            <div className={styles.noEvents}>
              <p>この日はダイヤモンド富士・パール富士は発生しません。</p>
            </div>
          ) : (
            <div className={styles.eventsList}>
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
                      <div key={locationId} className={styles.locationGroup}>
                        {/* 地点ヘッダー */}
                        <div
                          className={`${styles.locationHeader} ${isSelected ? styles.selectedLocation : ""}`}
                        >
                          <div className={styles.locationInfo}>
                            <Icon
                              name="location"
                              size={16}
                              className={styles.locationIcon}
                            />
                            <span className={styles.locationText}>
                              {location.prefecture}・{location.name}
                            </span>
                            {isSelected && (
                              <span className={styles.selectedBadge}>
                                地図表示中
                              </span>
                            )}
                            <button
                              className={`${styles.locationFavoriteButton} ${isLocationFavorite(location.id) ? styles.favorited : styles.unfavorited}`}
                              onClick={() => toggleLocationFavorite(location)}
                              title={
                                isLocationFavorite(location.id)
                                  ? "お気に入り地点から削除"
                                  : "お気に入り地点に追加"
                              }
                            >
                              {isLocationFavorite(location.id)
                                ? "お気に入り済み"
                                : "お気に入りに追加"}
                            </button>
                          </div>

                          <div className={styles.locationActions}>
                            <button
                              className={`${styles.expandButton} ${isExpanded ? styles.expanded : styles.collapsed}`}
                              onClick={() =>
                                handleLocationToggle(locationId, location)
                              }
                              title={
                                isExpanded
                                  ? "詳細を折りたたむ（地図から除去）"
                                  : "詳細を表示（地図に表示）"
                              }
                            >
                              {isExpanded ? "▼ 折りたたみ" : "▶ 表示"}
                            </button>
                          </div>
                        </div>

                        {/* イベント詳細（展開時のみ表示） */}
                        {isExpanded &&
                          locationEvents.map((event, index) => (
                            <div
                              key={event.id || index}
                              className={styles.eventItem}
                            >
                              <div className={styles.eventMainInfo}>
                                <div className={styles.eventBasicInfo}>
                                  <div className={styles.eventTitleSection}>
                                    <span className={styles.eventIcon}>
                                      {getEventIcon(event)}
                                    </span>
                                    <div className={styles.eventTitleGroup}>
                                      <h5 className={styles.eventTitle}>
                                        {formatEventTitle(event)}
                                      </h5>
                                      <span className={styles.eventTime}>
                                        {formatTime(event.time)}頃
                                      </span>
                                    </div>
                                  </div>

                                  <div className={styles.eventActions}>
                                    <button
                                      className={`${styles.eventScheduleButton} ${isEventFavorite(event.id) ? styles.scheduled : styles.unscheduled}`}
                                      onClick={() => toggleEventFavorite(event)}
                                      title={
                                        isEventFavorite(event.id)
                                          ? "撮影予定から削除"
                                          : "撮影予定に追加"
                                      }
                                    >
                                      {isEventFavorite(event.id) ? (
                                        <>
                                          <Icon name="calendar" size={14} />
                                          予定済み
                                        </>
                                      ) : (
                                        <>
                                          <Icon name="calendar" size={14} />
                                          予定に追加
                                        </>
                                      )}
                                    </button>
                                    <button
                                      className={styles.googleMapsButton}
                                      onClick={() =>
                                        handleGoogleMapsClick(event)
                                      }
                                      title="Google Maps でルート検索"
                                    >
                                      <Icon name="map" size={14} />
                                      ルート検索
                                    </button>
                                  </div>
                                </div>

                                {/* イベント固有の詳細データ */}
                                <div className={styles.eventSpecificDetails}>
                                  {event.elevation !== undefined && (
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>
                                        高度:
                                      </span>
                                      <span className={styles.detailValue}>
                                        {Math.round(event.elevation)}°
                                      </span>
                                    </div>
                                  )}
                                  {event.type === "pearl" &&
                                  event.moonPhase !== undefined ? (
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>
                                        月相:
                                      </span>
                                      <span className={styles.detailValue}>
                                        {getMoonPhaseName(event.moonPhase).icon}{" "}
                                        {getMoonPhaseName(event.moonPhase).name}
                                        {event.moonIllumination !==
                                          undefined && (
                                          <small
                                            style={{
                                              marginLeft: "8px",
                                              opacity: 0.7,
                                            }}
                                          >
                                            (
                                            {Math.round(
                                              event.moonIllumination * 100,
                                            )}
                                            %)
                                          </small>
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className={styles.detailItem}>
                                      {/* ダイヤモンド富士用の空カラム（レイアウト統一のため） */}
                                    </div>
                                  )}
                                  {event.accuracy && (
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailLabel}>
                                        精度:
                                      </span>
                                      <span
                                        className={getAccuracyBadge(
                                          event.accuracy,
                                        )}
                                      >
                                        {getAccuracyText(event.accuracy)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                        {/* 地点共通情報（展開時のみ表示） */}
                        {isExpanded && (
                          <div className={styles.locationDetails}>
                            {location.description && (
                              <div className={styles.locationDescription}>
                                <p>{location.description}</p>
                              </div>
                            )}

                            {/* 撮影地データ */}
                            <div className={styles.locationDataSection}>
                              <h6 className={styles.sectionTitle}>
                                <Icon name="data" size={14} />
                                撮影地データ
                              </h6>
                              <div className={styles.locationDataGrid}>
                                <div className={styles.detailItem}>
                                  <span className={styles.detailLabel}>
                                    緯度:
                                  </span>
                                  <span className={styles.detailValue}>
                                    {location.latitude.toFixed(6)}°
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span className={styles.detailLabel}>
                                    経度:
                                  </span>
                                  <span className={styles.detailValue}>
                                    {location.longitude.toFixed(6)}°
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span className={styles.detailLabel}>
                                    海抜標高:
                                  </span>
                                  <span className={styles.detailValue}>
                                    約{location.elevation.toFixed(1)}m
                                  </span>
                                </div>
                                {location.fujiAzimuth !== undefined && (
                                  <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                      富士山の方角:
                                    </span>
                                    <span className={styles.detailValue}>
                                      {location.fujiAzimuth
                                        ? `${getCompassDirection(location.fujiAzimuth)}（${Math.round(location.fujiAzimuth)}°）`
                                        : "計算中"}
                                    </span>
                                  </div>
                                )}
                                {location.fujiDistance && (
                                  <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                      富士山まで:
                                    </span>
                                    <span className={styles.detailValue}>
                                      約
                                      {(location.fujiDistance / 1000).toFixed(
                                        1,
                                      )}
                                      km
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* アクセス情報セクション */}
                            <div className={styles.accessSection}>
                              {location.accessInfo && (
                                <div className={styles.accessInfo}>
                                  <h6 className={styles.accessTitle}>
                                    <Icon name="car" size={14} />
                                    アクセス情報
                                  </h6>
                                  <p>{location.accessInfo}</p>
                                </div>
                              )}

                              {location.parkingInfo && (
                                <div className={styles.parkingInfo}>
                                  <h6 className={styles.parkingTitle}>
                                    <Icon name="parking" size={14} />
                                    駐車場情報
                                  </h6>
                                  <p>{location.parkingInfo}</p>
                                </div>
                              )}

                              {location.description && (
                                <div className={styles.warnings}>
                                  <h6 className={styles.warningsTitle}>
                                    <Icon name="warning" size={14} />
                                    注意事項
                                  </h6>
                                  <p>{location.description}</p>
                                </div>
                              )}
                            </div>
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
