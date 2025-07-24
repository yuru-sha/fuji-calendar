import React from 'react';

export interface CameraSettings {
  showAngles: boolean;
  focalLength: number;
  sensorType: 'fullframe' | 'apsc' | 'micro43';
  customFocalLength: string;
}

interface CameraPanelProps {
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  cameraSettings,
  onCameraSettingsChange
}) => {
  const presetFocalLengths = [24, 35, 50, 100, 200, 400, 600];
  const isCustom = !presetFocalLengths.includes(cameraSettings.focalLength);

  const updateSettings = (updates: Partial<CameraSettings>) => {
    onCameraSettingsChange({ ...cameraSettings, ...updates });
  };

  const handleFocalLengthChange = (value: string) => {
    if (value === 'custom') {
      updateSettings({ 
        focalLength: parseInt(cameraSettings.customFocalLength) || 85,
        customFocalLength: cameraSettings.customFocalLength || '85'
      });
    } else {
      const focalLength = parseInt(value);
      updateSettings({ focalLength, customFocalLength: value });
    }
  };

  const handleCustomFocalLengthChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    updateSettings({ 
      focalLength: numValue,
      customFocalLength: value
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
            <select
              value={isCustom ? 'custom' : cameraSettings.focalLength.toString()}
              onChange={(e) => handleFocalLengthChange(e.target.value)}
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
              {presetFocalLengths.map(fl => (
                <option key={fl} value={fl}>{fl}mm</option>
              ))}
              <option value="custom">自由入力</option>
            </select>
          </div>

          {/* カスタム焦点距離入力 */}
          {isCustom && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                📝 カスタム焦点距離
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={cameraSettings.customFocalLength}
                  onChange={(e) => handleCustomFocalLengthChange(e.target.value)}
                  placeholder="85"
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
          )}

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
              水平画角: {calculateFieldOfView(cameraSettings.focalLength, cameraSettings.sensorType).toFixed(1)}°
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

const calculateFieldOfView = (focalLength: number, sensorType: string): number => {
  const sensorWidths = {
    fullframe: 36,   // mm
    apsc: 23.5,      // mm (Canon APS-C)
    micro43: 17.3    // mm
  };
  
  const sensorWidth = sensorWidths[sensorType as keyof typeof sensorWidths] || 36;
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
};

export default CameraPanel;