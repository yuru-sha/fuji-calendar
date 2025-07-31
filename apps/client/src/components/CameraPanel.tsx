import React, { useState } from 'react';
import { Icon } from './icons/IconMap';

// よく使われる焦点距離
export const COMMON_FOCAL_LENGTHS = [
  { value: 14, name: '14mm (超広角)' },
  { value: 24, name: '24mm (広角)' },
  { value: 35, name: '35mm (準広角)' },
  { value: 50, name: '50mm (標準)' },
  { value: 85, name: '85mm (中望遠)' },
  { value: 135, name: '135mm (望遠)' },
  { value: 200, name: '200mm (望遠)' },
  { value: 300, name: '300mm (超望遠)' },
  { value: 400, name: '400mm (超望遠)' },
  { value: 600, name: '600mm (超望遠)' },
];

export interface CameraSettings {
  showAngles: boolean;
  focalLength: number;
  sensorType: 'fullframe' | 'apsc' | 'micro43';
  aspectRatio: '3:2' | '4:3' | '16:9' | '1:1';
  orientation: 'landscape' | 'portrait';
}

interface CameraPanelProps {
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  cameraSettings,
  onCameraSettingsChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const updateSettings = (updates: Partial<CameraSettings>) => {
    onCameraSettingsChange({ ...cameraSettings, ...updates });
  };

  const handleFocalLengthChange = (value: string) => {
    const focalLength = parseInt(value) || 50;
    updateSettings({ focalLength });
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
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="camera" size={16} />
          撮影設定
        </div>
        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {/* 画角表示切り替え - 常に表示 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        marginTop: '0.5rem'
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '500',
          color: '#374151'
        }}>
          📐 画角表示
        </div>
        
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '36px',
          height: '20px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={cameraSettings.showAngles}
            onChange={(e) => updateSettings({ showAngles: e.target.checked })}
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
            backgroundColor: cameraSettings.showAngles ? '#3b82f6' : '#d1d5db',
            borderRadius: '10px',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
          }}>
            <span style={{
              position: 'absolute',
              content: '',
              height: '14px',
              width: '14px',
              left: cameraSettings.showAngles ? '19px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
      </div>

      {/* カメラ設定 */}
      {isExpanded && cameraSettings.showAngles && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {/* コンパクトな設定項目 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                センサー
              </label>
              <select
                value={cameraSettings.sensorType}
                onChange={(e) => updateSettings({ sensorType: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.375rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="fullframe">FF</option>
                <option value="apsc">APS-C</option>
                <option value="micro43">m43</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                縦横比
              </label>
              <select
                value={cameraSettings.aspectRatio}
                onChange={(e) => updateSettings({ aspectRatio: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.375rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="3:2">3:2</option>
                <option value="4:3">4:3</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
              </select>
            </div>
          </div>

          {/* 撮影向き */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
              向き
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
              <button
                onClick={() => updateSettings({ orientation: 'landscape' })}
                style={{
                  padding: '0.375rem',
                  fontSize: '0.7rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: cameraSettings.orientation === 'landscape' ? '#3b82f6' : 'white',
                  color: cameraSettings.orientation === 'landscape' ? 'white' : '#374151',
                  cursor: 'pointer'
                }}
              >
                横
              </button>
              <button
                onClick={() => updateSettings({ orientation: 'portrait' })}
                style={{
                  padding: '0.375rem',
                  fontSize: '0.7rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: cameraSettings.orientation === 'portrait' ? '#3b82f6' : 'white',
                  color: cameraSettings.orientation === 'portrait' ? 'white' : '#374151',
                  cursor: 'pointer'
                }}
              >
                縦
              </button>
            </div>
          </div>

          {/* 焦点距離選択 */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
              焦点距離
            </label>
            
            {/* よく使われる焦点距離のボタン（2 行表示） */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.125rem',
              marginBottom: '0.25rem'
            }}>
              {COMMON_FOCAL_LENGTHS.slice(0, 5).map(fl => (
                <button
                  key={fl.value}
                  onClick={() => updateSettings({ focalLength: fl.value })}
                  style={{
                    padding: '0.125rem',
                    fontSize: '0.65rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '3px',
                    backgroundColor: cameraSettings.focalLength === fl.value ? '#3b82f6' : 'white',
                    color: cameraSettings.focalLength === fl.value ? 'white' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {fl.value}
                </button>
              ))}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.125rem',
              marginBottom: '0.375rem'
            }}>
              {COMMON_FOCAL_LENGTHS.slice(5, 10).map(fl => (
                <button
                  key={fl.value}
                  onClick={() => updateSettings({ focalLength: fl.value })}
                  style={{
                    padding: '0.125rem',
                    fontSize: '0.65rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '3px',
                    backgroundColor: cameraSettings.focalLength === fl.value ? '#3b82f6' : 'white',
                    color: cameraSettings.focalLength === fl.value ? 'white' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {fl.value}
                </button>
              ))}
            </div>
            
            {/* 直接入力フィールド */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                value={cameraSettings.focalLength}
                onChange={(e) => handleFocalLengthChange(e.target.value)}
                placeholder="50"
                min="1"
                max="2000"
                style={{
                  flex: 1,
                  padding: '0.25rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>mm</span>
            </div>
          </div>

          {/* 現在の画角情報 - コンパクト */}
          <div style={{
            padding: '0.5rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '4px',
            fontSize: '0.65rem',
            color: '#475569'
          }}>
            画角: {calculateFieldOfView(cameraSettings.focalLength, cameraSettings.sensorType, cameraSettings.aspectRatio, cameraSettings.orientation).horizontal.toFixed(1)}° × {calculateFieldOfView(cameraSettings.focalLength, cameraSettings.sensorType, cameraSettings.aspectRatio, cameraSettings.orientation).vertical.toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
};

// ヘルパー関数（未使用だが将来的に使用予定）
// const getSensorName = (sensorType: string): string => {
//   switch (sensorType) {
//     case 'fullframe': return 'フルサイズ';
//     case 'apsc': return 'APS-C';
//     case 'micro43': return 'マイクロフォーサーズ';
//     default: return '';
//   }
// };

const calculateFieldOfView = (focalLength: number, sensorType: string, aspectRatio: string, orientation: string = 'landscape') => {
  const sensorDimensions = {
    fullframe: { width: 36, height: 24 },   // mm
    apsc: { width: 23.5, height: 15.6 },    // mm (Canon APS-C)
    micro43: { width: 17.3, height: 13 }    // mm
  };
  
  const sensor = sensorDimensions[sensorType as keyof typeof sensorDimensions] || sensorDimensions.fullframe;
  
  // 縦横比に応じて実際の撮影領域を計算
  let actualWidth = sensor.width;
  let actualHeight = sensor.height;
  
  const aspectRatios = {
    '3:2': 3/2,
    '4:3': 4/3,
    '16:9': 16/9,
    '1:1': 1/1
  };
  
  const ratio = aspectRatios[aspectRatio as keyof typeof aspectRatios] || aspectRatios['3:2'];
  
  // センサーの縦横比と設定した縦横比の違いを調整
  if (ratio > sensor.width / sensor.height) {
    // 横長の場合、高さを調整
    actualHeight = sensor.width / ratio;
  } else {
    // 縦長の場合、幅を調整
    actualWidth = sensor.height * ratio;
  }
  
  // 撮影向きに応じて幅と高さを入れ替え
  if (orientation === 'portrait') {
    [actualWidth, actualHeight] = [actualHeight, actualWidth];
  }
  
  const horizontalFOV = 2 * Math.atan(actualWidth / (2 * focalLength)) * (180 / Math.PI);
  const verticalFOV = 2 * Math.atan(actualHeight / (2 * focalLength)) * (180 / Math.PI);
  
  return {
    horizontal: horizontalFOV,
    vertical: verticalFOV
  };
};

export default CameraPanel;