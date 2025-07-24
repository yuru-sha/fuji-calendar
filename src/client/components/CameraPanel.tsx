import React from 'react';

interface CameraPanelProps {
  showCameraAngles: boolean;
  onToggleCameraAngles: (show: boolean) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  showCameraAngles,
  onToggleCameraAngles
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        margin: '0 0 1rem 0',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>📷</span>
        撮影情報
      </h3>

      {/* 画角表示切り替え */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            📐 画角表示
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            レンズの撮影範囲を表示
          </div>
        </div>
        
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '44px',
          height: '24px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={showCameraAngles}
            onChange={(e) => onToggleCameraAngles(e.target.checked)}
            style={{
              opacity: 0,
              width: 0,
              height: 0
            }}
          />
          <span style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: showCameraAngles ? '#3b82f6' : '#d1d5db',
            borderRadius: '12px',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
          }}>
            <span style={{
              position: 'absolute',
              content: '',
              height: '18px',
              width: '18px',
              left: showCameraAngles ? '23px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
      </div>

      {/* 画角表示が有効な場合の凡例 */}
      {showCameraAngles && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            📖 画角凡例
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.25rem',
            fontSize: '0.7rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#ff6b6b',
                borderRadius: '2px',
                opacity: 0.6
              }} />
              <span style={{ color: '#6b7280' }}>14mm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#4ecdc4',
                borderRadius: '2px',
                opacity: 0.5
              }} />
              <span style={{ color: '#6b7280' }}>24mm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#45b7d1',
                borderRadius: '2px',
                opacity: 0.4
              }} />
              <span style={{ color: '#6b7280' }}>35mm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#f39c12',
                borderRadius: '2px',
                opacity: 0.3
              }} />
              <span style={{ color: '#6b7280' }}>50mm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#9b59b6',
                borderRadius: '2px',
                opacity: 0.2
              }} />
              <span style={{ color: '#6b7280' }}>85mm</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPanel;