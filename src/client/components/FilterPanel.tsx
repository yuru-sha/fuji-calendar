import React, { useState } from 'react';

export interface FilterOptions {
  distance: 'all' | 'very_near' | 'near' | 'medium' | 'far' | 'very_far'; // 全て | 50km以内 | 100km以内 | 200km以内 | 300km以内 | 300km以上
  diamondSunrise: boolean; // ダイヤモンド富士（朝）
  diamondSunset: boolean;  // ダイヤモンド富士（夕）
  pearlMoonrise: boolean;  // パール富士（朝）
  pearlMoonset: boolean;   // パール富士（夕）
  specialEvents: {
    solarEclipse: boolean;    // 日食
    lunarEclipse: boolean;    // 月食
    supermoon: boolean;       // スーパームーン
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
  uniqueLocationCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateFilter = (updates: Partial<FilterOptions>) => {
    onFilterChange({ ...filters, ...updates });
  };

  const updateSpecialEvent = (key: keyof FilterOptions['specialEvents'], value: boolean) => {
    onFilterChange({
      ...filters,
      specialEvents: {
        ...filters.specialEvents,
        [key]: value
      }
    });
  };

  const hasActiveFilters = () => {
    return filters.distance !== 'all' ||
           filters.diamondSunrise || filters.diamondSunset ||
           filters.pearlMoonrise || filters.pearlMoonset ||
           filters.specialEvents.solarEclipse ||
           filters.specialEvents.lunarEclipse ||
           filters.specialEvents.supermoon;
  };

  const resetFilters = () => {
    onFilterChange({
      distance: 'all',
      diamondSunrise: false,
      diamondSunset: false,
      pearlMoonrise: false,
      pearlMoonset: false,
      specialEvents: {
        solarEclipse: false,
        lunarEclipse: false,
        supermoon: false
      }
    });
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '6px',
      padding: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          marginBottom: '0.5rem'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          <span>🔍</span>
          撮影地点フィルター
        </div>
        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>
      
      {/* 常に表示される統計情報 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? '0.75rem' : 0 }}>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '0.125rem 0.375rem',
            borderRadius: '8px'
          }}>
            📍 {uniqueLocationCount}地点
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            backgroundColor: '#fef3c7',
            padding: '0.125rem 0.375rem',
            borderRadius: '8px'
          }}>
            📅 {eventCount}イベント
          </span>
        </div>
        {hasActiveFilters() && (
          <span style={{
            fontSize: '0.65rem',
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            padding: '0.125rem 0.375rem',
            borderRadius: '8px'
          }}>
            フィルター中
          </span>
        )}
      </div>

      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {/* 距離フィルター */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              📏 距離
            </label>
            <select
              value={filters.distance}
              onChange={(e) => updateFilter({ distance: e.target.value as any })}
              style={{
                width: '100%',
                padding: '0.375rem',
                fontSize: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#374151'
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
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              🎯 種類
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.25rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem',
                backgroundColor: filters.diamondSunrise ? '#fef3c7' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.diamondSunrise}
                  onChange={(e) => updateFilter({ diamondSunrise: e.target.checked })}
                  style={{ margin: 0, width: '10px', height: '10px' }}
                />
                <span>☀️🌅</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem',
                backgroundColor: filters.diamondSunset ? '#fef3c7' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.diamondSunset}
                  onChange={(e) => updateFilter({ diamondSunset: e.target.checked })}
                  style={{ margin: 0, width: '10px', height: '10px' }}
                />
                <span>☀️🌆</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem',
                backgroundColor: filters.pearlMoonrise ? '#dbeafe' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.pearlMoonrise}
                  onChange={(e) => updateFilter({ pearlMoonrise: e.target.checked })}
                  style={{ margin: 0, width: '10px', height: '10px' }}
                />
                <span>🌙🌅</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem',
                backgroundColor: filters.pearlMoonset ? '#dbeafe' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.pearlMoonset}
                  onChange={(e) => updateFilter({ pearlMoonset: e.target.checked })}
                  style={{ margin: 0, width: '10px', height: '10px' }}
                />
                <span>🌙🌆</span>
              </label>
            </div>
          </div>

          {/* 特別な天体イベント - コンパクト */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              ✨ 特別
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.25rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
                backgroundColor: filters.specialEvents.solarEclipse ? '#fee2e2' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.6rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.specialEvents.solarEclipse}
                  onChange={(e) => updateSpecialEvent('solarEclipse', e.target.checked)}
                  style={{ margin: 0, width: '8px', height: '8px', marginRight: '2px' }}
                />
                <span>🌑</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
                backgroundColor: filters.specialEvents.lunarEclipse ? '#fee2e2' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.6rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.specialEvents.lunarEclipse}
                  onChange={(e) => updateSpecialEvent('lunarEclipse', e.target.checked)}
                  style={{ margin: 0, width: '8px', height: '8px', marginRight: '2px' }}
                />
                <span>🌕</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
                backgroundColor: filters.specialEvents.supermoon ? '#f3e8ff' : '#f9fafb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.6rem',
                border: '1px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={filters.specialEvents.supermoon}
                  onChange={(e) => updateSpecialEvent('supermoon', e.target.checked)}
                  style={{ margin: 0, width: '8px', height: '8px', marginRight: '2px' }}
                />
                <span>🌕✨</span>
              </label>
            </div>
          </div>

          {/* フィルターリセット */}
          {hasActiveFilters() && (
            <div style={{ textAlign: 'center', paddingTop: '0.25rem' }}>
              <button
                onClick={resetFilters}
                style={{
                  fontSize: '0.65rem',
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0.125rem 0.25rem'
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