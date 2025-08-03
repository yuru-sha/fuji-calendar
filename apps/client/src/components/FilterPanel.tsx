import React, { useState } from "react";
import { Icon } from "@fuji-calendar/ui";

export interface FilterOptions {
  distance: "all" | "very_near" | "near" | "medium" | "far" | "very_far"; // 全て | 50km 以内 | 100km 以内 | 200km 以内 | 300km 以内 | 300km 以上
  diamondSunrise: boolean; // ダイヤモンド富士（朝）
  diamondSunset: boolean; // ダイヤモンド富士（夕）
  pearlMoonrise: boolean; // パール富士（朝）
  pearlMoonset: boolean; // パール富士（夕）
  specialEvents: {
    solarEclipse: boolean; // 日食
    lunarEclipse: boolean; // 月食
    supermoon: boolean; // スーパームーン
  };
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  eventCount: number;
  uniqueLocationCount?: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  eventCount,
  uniqueLocationCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateFilter = (updates: Partial<FilterOptions>) => {
    onFilterChange({ ...filters, ...updates });
  };

  const updateSpecialEvent = (
    key: keyof FilterOptions["specialEvents"],
    value: boolean,
  ) => {
    onFilterChange({
      ...filters,
      specialEvents: {
        ...filters.specialEvents,
        [key]: value,
      },
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.distance !== "all" ||
      filters.diamondSunrise ||
      filters.diamondSunset ||
      filters.pearlMoonrise ||
      filters.pearlMoonset ||
      filters.specialEvents.solarEclipse ||
      filters.specialEvents.lunarEclipse ||
      filters.specialEvents.supermoon
    );
  };

  const resetFilters = () => {
    onFilterChange({
      distance: "all",
      diamondSunrise: false,
      diamondSunset: false,
      pearlMoonrise: false,
      pearlMoonset: false,
      specialEvents: {
        solarEclipse: false,
        lunarEclipse: false,
        supermoon: false,
      },
    });
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "6px",
        padding: "0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* ヘッダー部分 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: "0.5rem",
        }}
      >
        {/* 左側：アイコン + タイトル + 折りたたみアイコン + 統計情報 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            <Icon name="search" size={14} />
            撮影地点フィルター
            <Icon 
              name="chevronDown" 
              size={12}
              style={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>
          
          {/* 統計情報 */}
          <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "#6b7280",
                backgroundColor: "#f3f4f6",
                padding: "0.125rem 0.375rem",
                borderRadius: "8px",
              }}
            >
              <Icon
                name="location"
                size={12}
                style={{ display: "inline", marginRight: "2px" }}
              />
              {uniqueLocationCount}地点
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                color: "#6b7280",
                backgroundColor: "#fef3c7",
                padding: "0.125rem 0.375rem",
                borderRadius: "8px",
              }}
            >
              <Icon
                name="calendar"
                size={12}
                style={{ display: "inline", marginRight: "2px" }}
              />
              {eventCount}イベント
            </span>
          </div>
        </div>
        
        {/* 右側：フィルター中表示 */}
        {hasActiveFilters() && (
          <span
            style={{
              fontSize: "0.65rem",
              color: "#dc2626",
              backgroundColor: "#fee2e2",
              padding: "0.125rem 0.375rem",
              borderRadius: "8px",
            }}
          >
            フィルター中
          </span>
        )}
      </div>

      {isExpanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginTop: "0.75rem",
          }}
        >
          {/* 距離フィルター */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: "500",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              距離
            </label>
            <select
              value={filters.distance}
              onChange={(e) =>
                updateFilter({ distance: e.target.value as any })
              }
              style={{
                width: "100%",
                padding: "0.375rem",
                fontSize: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: "white",
                color: "#374151",
              }}
            >
              <option value="all">全て</option>
              <option value="very_near">〜50km</option>
              <option value="near">〜100km</option>
              <option value="medium">〜200km</option>
              <option value="far">〜300km</option>
              <option value="very_far">300km〜</option>
            </select>
          </div>

          {/* イベントタイプフィルター */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: "500",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              種類
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.25rem",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  backgroundColor: filters.diamondSunrise
                    ? "#fef3c7"
                    : "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.diamondSunrise}
                  onChange={(e) =>
                    updateFilter({ diamondSunrise: e.target.checked })
                  }
                  style={{ margin: 0, width: "10px", height: "10px" }}
                />
                昇るダイヤモンド富士
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  backgroundColor: filters.diamondSunset
                    ? "#fef3c7"
                    : "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.diamondSunset}
                  onChange={(e) =>
                    updateFilter({ diamondSunset: e.target.checked })
                  }
                  style={{ margin: 0, width: "10px", height: "10px" }}
                />
                沈むダイヤモンド富士
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  backgroundColor: filters.pearlMoonrise
                    ? "#dbeafe"
                    : "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.pearlMoonrise}
                  onChange={(e) =>
                    updateFilter({ pearlMoonrise: e.target.checked })
                  }
                  style={{ margin: 0, width: "10px", height: "10px" }}
                />
                昇るパール富士
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  backgroundColor: filters.pearlMoonset ? "#dbeafe" : "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.pearlMoonset}
                  onChange={(e) =>
                    updateFilter({ pearlMoonset: e.target.checked })
                  }
                  style={{ margin: 0, width: "10px", height: "10px" }}
                />
                沈むパール富士
              </label>
            </div>
          </div>

          {/* 特別な天体イベント - コンパクト */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                fontWeight: "500",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              特別
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.25rem",
              }}
            >
              <button
                onClick={() =>
                  updateSpecialEvent("solarEclipse", !filters.specialEvents.solarEclipse)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.375rem",
                  backgroundColor: filters.specialEvents.solarEclipse
                    ? "#fee2e2"
                    : "#f9fafb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  fontWeight: "500",
                  border: filters.specialEvents.solarEclipse
                    ? "2px solid #ef4444"
                    : "2px solid #e5e7eb",
                  transition: "all 0.2s",
                  background: "none",
                  color: filters.specialEvents.solarEclipse ? "#991b1b" : "#374151",
                }}
                title="日食"
              >
                日食
              </button>

              <button
                onClick={() =>
                  updateSpecialEvent("lunarEclipse", !filters.specialEvents.lunarEclipse)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.375rem",
                  backgroundColor: filters.specialEvents.lunarEclipse
                    ? "#fef3c7"
                    : "#f9fafb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  fontWeight: "500",
                  border: filters.specialEvents.lunarEclipse
                    ? "2px solid #f59e0b"
                    : "2px solid #e5e7eb",
                  transition: "all 0.2s",
                  background: "none",
                  color: filters.specialEvents.lunarEclipse ? "#92400e" : "#374151",
                }}
                title="月食"
              >
                月食
              </button>

              <button
                onClick={() =>
                  updateSpecialEvent("supermoon", !filters.specialEvents.supermoon)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.375rem",
                  backgroundColor: filters.specialEvents.supermoon
                    ? "#f3e8ff"
                    : "#f9fafb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  fontWeight: "500",
                  border: filters.specialEvents.supermoon
                    ? "2px solid #8b5cf6"
                    : "2px solid #e5e7eb",
                  transition: "all 0.2s",
                  background: "none",
                  color: filters.specialEvents.supermoon ? "#6b21a8" : "#374151",
                }}
                title="スーパームーン"
              >
                スーパームーン
              </button>
            </div>
          </div>

          {/* フィルターリセット */}
          {hasActiveFilters() && (
            <div style={{ textAlign: "center", paddingTop: "0.25rem" }}>
              <button
                onClick={resetFilters}
                style={{
                  fontSize: "0.65rem",
                  color: "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "0.125rem 0.25rem",
                }}
              >
                リセット
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
