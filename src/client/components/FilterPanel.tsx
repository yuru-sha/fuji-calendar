import React from 'react';

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
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>🔍</span>
          撮影地点フィルター
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '0.25rem 0.5rem',
            borderRadius: '12px'
          }}>
            📍 {uniqueLocationCount}地点
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            backgroundColor: '#fef3c7',
            padding: '0.25rem 0.5rem',
            borderRadius: '12px'
          }}>
            📅 {eventCount}イベント
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* 距離フィルター */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            📏 距離範囲
          </label>
          <select
            value={filters.distance}
            onChange={(e) => updateFilter({ distance: e.target.value as any })}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151'
            }}
          >
            <option value="all">全ての距離</option>
            <option value="very_near">〜50km（とても近い）</option>
            <option value="near">〜100km（近い）</option>
            <option value="medium">〜200km（中距離）</option>
            <option value="far">〜300km（遠い）</option>
            <option value="very_far">300km〜（とても遠い）</option>
          </select>
        </div>

        {/* イベントタイプフィルター */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            🎯 イベントタイプ
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.diamondSunrise ? '#fef3c7' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.diamondSunrise}
                onChange={(e) => updateFilter({ diamondSunrise: e.target.checked })}
                style={{ margin: 0 }}
              />
              <span>☀️🌅 ダイヤ朝</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.diamondSunset ? '#fef3c7' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.diamondSunset}
                onChange={(e) => updateFilter({ diamondSunset: e.target.checked })}
                style={{ margin: 0 }}
              />
              <span>☀️🌆 ダイヤ夕</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.pearlMoonrise ? '#dbeafe' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.pearlMoonrise}
                onChange={(e) => updateFilter({ pearlMoonrise: e.target.checked })}
                style={{ margin: 0 }}
              />
              <span>🌙🌅 パール朝</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.pearlMoonset ? '#dbeafe' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.pearlMoonset}
                onChange={(e) => updateFilter({ pearlMoonset: e.target.checked })}
                style={{ margin: 0 }}
              />
              <span>🌙🌆 パール夕</span>
            </label>
          </div>
        </div>

        {/* 特別な天体イベント */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            ✨ 特別イベント
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.specialEvents.solarEclipse ? '#fee2e2' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.specialEvents.solarEclipse}
                onChange={(e) => updateSpecialEvent('solarEclipse', e.target.checked)}
                style={{ margin: 0 }}
              />
              <span>🌑 日食</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.specialEvents.lunarEclipse ? '#fee2e2' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.specialEvents.lunarEclipse}
                onChange={(e) => updateSpecialEvent('lunarEclipse', e.target.checked)}
                style={{ margin: 0 }}
              />
              <span>🌕 月食</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: filters.specialEvents.supermoon ? '#f3e8ff' : '#f9fafb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={filters.specialEvents.supermoon}
                onChange={(e) => updateSpecialEvent('supermoon', e.target.checked)}
                style={{ margin: 0 }}
              />
              <span>🌕✨ スーパームーン</span>
            </label>
          </div>
        </div>

        {/* フィルターリセット */}
        {hasActiveFilters() && (
          <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
            <button
              onClick={resetFilters}
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.25rem 0.5rem'
              }}
            >
              すべてのフィルターをリセット
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;