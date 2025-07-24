import React from 'react';

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
        撮影設定
      </h3>

      {/* 画角表示切り替え */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem'
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
            borderRadius: '12px',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
          }}>
            <span style={{
              position: 'absolute',
              content: '',
              height: '18px',
              width: '18px',
              left: cameraSettings.showAngles ? '23px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
      </div>

      {/* カメラ設定 */}
      {cameraSettings.showAngles && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* センサーサイズ選択 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              📱 センサーサイズ
            </label>
            <select
              value={cameraSettings.sensorType}
              onChange={(e) => updateSettings({ sensorType: e.target.value as any })}
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
              <option value="fullframe">フルサイズ</option>
              <option value="apsc">APS-C</option>
              <option value="micro43">マイクロフォーサーズ</option>
            </select>
          </div>

          {/* 縦横比選択 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              📐 縦横比
            </label>
            <select
              value={cameraSettings.aspectRatio}
              onChange={(e) => updateSettings({ aspectRatio: e.target.value as any })}
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
              <option value="3:2">3:2 (一般的なカメラ)</option>
              <option value="4:3">4:3 (マイクロフォーサーズ)</option>
              <option value="16:9">16:9 (ワイド)</option>
              <option value="1:1">1:1 (スクエア)</option>
            </select>
          </div>

          {/* 撮影向き選択 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              📱 撮影向き
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => updateSettings({ orientation: 'landscape' })}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: cameraSettings.orientation === 'landscape' ? '#3b82f6' : 'white',
                  color: cameraSettings.orientation === 'landscape' ? 'white' : '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>📷</span>
                <span>横</span>
              </button>
              <button
                onClick={() => updateSettings({ orientation: 'portrait' })}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: cameraSettings.orientation === 'portrait' ? '#3b82f6' : 'white',
                  color: cameraSettings.orientation === 'portrait' ? 'white' : '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>📱</span>
                <span>縦</span>
              </button>
            </div>
          </div>

          {/* 焦点距離選択 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              🔍 焦点距離
            </label>
            
            {/* よく使われる焦点距離のボタン */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              {COMMON_FOCAL_LENGTHS.map(fl => (
                <button
                  key={fl.value}
                  onClick={() => updateSettings({ focalLength: fl.value })}
                  style={{
                    padding: '0.25rem',
                    fontSize: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: cameraSettings.focalLength === fl.value ? '#3b82f6' : 'white',
                    color: cameraSettings.focalLength === fl.value ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {fl.value}
                </button>
              ))}
            </div>
            
            {/* 直接入力フィールド */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                value={cameraSettings.focalLength}
                onChange={(e) => handleFocalLengthChange(e.target.value)}
                placeholder="50"
                min="1"
                max="2000"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151'
                }}
              />
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                mm
              </span>
            </div>
          </div>

          {/* 現在の画角情報 */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#e0f2fe',
            borderRadius: '6px',
            border: '1px solid #b3e5fc'
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#0277bd',
              fontWeight: '500'
            }}>
              📊 計算結果: {cameraSettings.focalLength}mm ({getSensorName(cameraSettings.sensorType)})
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#0288d1',
              marginTop: '0.25rem'
            }}>
              水平画角: {calculateFieldOfView(cameraSettings.focalLength, cameraSettings.sensorType, cameraSettings.aspectRatio, cameraSettings.orientation).horizontal.toFixed(1)}°
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#0288d1',
              marginTop: '0.25rem'
            }}>
              垂直画角: {calculateFieldOfView(cameraSettings.focalLength, cameraSettings.sensorType, cameraSettings.aspectRatio, cameraSettings.orientation).vertical.toFixed(1)}°
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#0288d1',
              marginTop: '0.25rem'
            }}>
              設定: {cameraSettings.aspectRatio} {cameraSettings.orientation === 'portrait' ? '縦' : '横'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ヘルパー関数
const getSensorName = (sensorType: string): string => {
  switch (sensorType) {
    case 'fullframe': return 'フルサイズ';
    case 'apsc': return 'APS-C';
    case 'micro43': return 'マイクロフォーサーズ';
    default: return '';
  }
};

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