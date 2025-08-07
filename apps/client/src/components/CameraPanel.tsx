import React, { useState } from "react";
import { Icon } from "@fuji-calendar/ui";

// よく使われる焦点距離
export const COMMON_FOCAL_LENGTHS = [
  { value: 14, name: "14mm (超広角)" },
  { value: 24, name: "24mm (広角)" },
  { value: 35, name: "35mm (準広角)" },
  { value: 50, name: "50mm (標準)" },
  { value: 85, name: "85mm (中望遠)" },
  { value: 135, name: "135mm (望遠)" },
  { value: 200, name: "200mm (望遠)" },
  { value: 300, name: "300mm (超望遠)" },
  { value: 400, name: "400mm (超望遠)" },
  { value: 600, name: "600mm (超望遠)" },
];

export interface CameraSettings {
  showAngles: boolean;
  focalLength: number;
  sensorType: "fullframe" | "apsc" | "micro43";
  aspectRatio: "3:2" | "4:3" | "16:9" | "1:1";
  orientation: "landscape" | "portrait";
}

interface CameraPanelProps {
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  cameraSettings,
  onCameraSettingsChange,
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
        {/* 左側：アイコン + タイトル + 折りたたみアイコン + 設定情報 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "撮影設定を閉じる" : "撮影設定を開く"}
            aria-expanded={isExpanded}
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
            <Icon name="camera" size={14} />
            撮影設定
          </button>
          
          {/* 設定情報 */}
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
              📷 {cameraSettings.focalLength}mm
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
              {cameraSettings.sensorType === "fullframe" ? "FF" : 
               cameraSettings.sensorType === "apsc" ? "APS-C" : "m43"}
            </span>
          </div>
        </div>
        
        {/* 右側：ON/OFF トグル */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

          <button
            onClick={() => {
              const newShowAngles = !cameraSettings.showAngles;
              updateSettings({ showAngles: newShowAngles });
              setIsExpanded(newShowAngles);
            }}
            aria-label="撮影角度表示の切り替え"
            aria-pressed={cameraSettings.showAngles}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.65rem",
              fontWeight: "500",
              border: "1px solid",
              borderColor: cameraSettings.showAngles ? "#3b82f6" : "#d1d5db",
              borderRadius: "4px",
              backgroundColor: cameraSettings.showAngles ? "#3b82f6" : "white",
              color: cameraSettings.showAngles ? "white" : "#374151",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {cameraSettings.showAngles ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* カメラ設定 */}
      {isExpanded && cameraSettings.showAngles && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginTop: "0.75rem",
          }}
        >
          {/* 焦点距離と撮影向きの横並び */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "0.75rem",
            }}
          >
            {/* 焦点距離（2 カラム） */}
            <div>
              <label
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "0.25rem",
                  display: "block",
                }}
              >
                焦点距離
              </label>
              
              {/* 1 行目：14, 24, 35, 50, 85 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.25rem",
                  marginBottom: "0.25rem",
                }}
              >
                {[14, 24, 35, 50, 85].map((focal) => (
                  <button
                    key={focal}
                    onClick={() => updateSettings({ focalLength: focal })}
                    aria-label={`焦点距離${focal}mm を選択`}
                    style={{
                      padding: "0.25rem 0.125rem",
                      fontSize: "0.65rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      backgroundColor:
                        cameraSettings.focalLength === focal
                          ? "#3b82f6"
                          : "white",
                      color:
                        cameraSettings.focalLength === focal
                          ? "white"
                          : "#374151",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "all 0.2s",
                    }}
                  >
                    {focal}
                  </button>
                ))}
              </div>
              
              {/* 2 行目：135, 200, 300, 400, 600 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.25rem",
                  marginBottom: "0.5rem",
                }}
              >
                {[135, 200, 300, 400, 600].map((focal) => (
                  <button
                    key={focal}
                    onClick={() => updateSettings({ focalLength: focal })}
                    aria-label={`焦点距離${focal}mm を選択`}
                    style={{
                      padding: "0.25rem 0.125rem",
                      fontSize: "0.65rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      backgroundColor:
                        cameraSettings.focalLength === focal
                          ? "#3b82f6"
                          : "white",
                      color:
                        cameraSettings.focalLength === focal
                          ? "white"
                          : "#374151",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "all 0.2s",
                    }}
                  >
                    {focal}
                  </button>
                ))}
              </div>
              
              {/* 直接入力フィールド */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="number"
                  value={cameraSettings.focalLength}
                  onChange={(e) => handleFocalLengthChange(e.target.value)}
                  placeholder="50"
                  min="1"
                  max="2000"
                  aria-label="焦点距離を直接入力"
                  style={{
                    width: "60px",
                    padding: "0.25rem",
                    fontSize: "0.7rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  mm
                </span>
              </div>
            </div>

            {/* 撮影向き（1 カラム） */}
            <div>
              <label
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "500",
                  color: "#6b7280",
                  marginBottom: "0.25rem",
                  display: "block",
                }}
              >
                撮影向き
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <button
                  onClick={() => updateSettings({ orientation: "landscape" })}
                  aria-label="横向き撮影を選択"
                  style={{
                    padding: "0.375rem",
                    fontSize: "0.65rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    backgroundColor:
                      cameraSettings.orientation === "landscape"
                        ? "#3b82f6"
                        : "white",
                    color:
                      cameraSettings.orientation === "landscape"
                        ? "white"
                        : "#374151",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Icon name="camera" size={12} />
                  横
                </button>
                <button
                  onClick={() => updateSettings({ orientation: "portrait" })}
                  aria-label="縦向き撮影を選択"
                  style={{
                    padding: "0.375rem",
                    fontSize: "0.65rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    backgroundColor:
                      cameraSettings.orientation === "portrait"
                        ? "#3b82f6"
                        : "white",
                    color:
                      cameraSettings.orientation === "portrait"
                        ? "white"
                        : "#374151",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Icon name="smartphone" size={12} />
                  縦
                </button>
              </div>
            </div>
          </div>

          {/* センサーサイズ（単独配置） */}
          <div>
            <label
              style={{
                fontSize: "0.7rem",
                fontWeight: "500",
                color: "#6b7280",
                marginBottom: "0.25rem",
                display: "block",
              }}
            >
              センサーサイズ
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "0.5rem",
              }}
            >
              {[
                { value: "fullframe", label: "フルサイズ" },
                { value: "apsc", label: "APS-C" },
                { value: "micro43", label: "マイクロフォーサーズ" },
              ].map((sensor) => (
                <label
                  key={sensor.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    cursor: "pointer",
                    fontSize: "0.65rem",
                    color: "#374151",
                    padding: "0.125rem",
                  }}
                >
                  <input
                    type="radio"
                    name="sensorType"
                    value={sensor.value}
                    checked={cameraSettings.sensorType === sensor.value}
                    onChange={(e) =>
                      updateSettings({
                        sensorType: e.target.value as "fullframe" | "apsc" | "micro43",
                      })
                    }
                    aria-label={`${sensor.label}センサーを選択`}
                    style={{
                      width: "12px",
                      height: "12px",
                      accentColor: "#3b82f6",
                    }}
                  />
                  {sensor.label}
                </label>
              ))}
            </div>
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

export default CameraPanel;