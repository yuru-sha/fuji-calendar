import React from 'react';

export interface FilterOptions {
  distance: 'all' | 'near' | 'far'; // 全て | 近い（100km以内） | 遠い（100km以上）
  timeType: 'all' | 'morning' | 'evening'; // 全て | 朝（昇る） | 夕（沈む）
  eventType: 'all' | 'diamond' | 'pearl'; // 全て | ダイヤモンド富士 | パール富士
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  eventCount: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  eventCount
}) => {
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
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
        <span style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          padding: '0.25rem 0.5rem',
          borderRadius: '12px'
        }}>
          {eventCount}件
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem'
      }}>
        {/* 距離フィルター */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            📏 距離
          </label>
          <select
            value={filters.distance}
            onChange={(e) => updateFilter('distance', e.target.value)}
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
            <option value="all">全て</option>
            <option value="near">近い（〜100km）</option>
            <option value="far">遠い（100km〜）</option>
          </select>
        </div>

        {/* 時間帯フィルター */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            🕐 時間帯
          </label>
          <select
            value={filters.timeType}
            onChange={(e) => updateFilter('timeType', e.target.value)}
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
            <option value="all">全て</option>
            <option value="morning">朝（昇る）</option>
            <option value="evening">夕（沈む）</option>
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
            🎯 種類
          </label>
          <select
            value={filters.eventType}
            onChange={(e) => updateFilter('eventType', e.target.value)}
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
            <option value="all">全て</option>
            <option value="diamond">☀️ ダイヤモンド富士</option>
            <option value="pearl">🌙 パール富士</option>
          </select>
        </div>
      </div>

      {/* フィルターリセット */}
      {(filters.distance !== 'all' || filters.timeType !== 'all' || filters.eventType !== 'all') && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <button
            onClick={() => onFilterChange({ distance: 'all', timeType: 'all', eventType: 'all' })}
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            フィルターをリセット
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;