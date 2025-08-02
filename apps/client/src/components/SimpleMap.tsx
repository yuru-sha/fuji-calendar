import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as Astronomy from "astronomy-engine";
import { Location, FujiEvent, FUJI_COORDINATES } from "@fuji-calendar/types";
import { CameraSettings } from "./CameraPanel";

// Leaflet のアイコン設定を修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 画角計算ヘルパー関数
const getFieldOfViewAngle = (
  focalLength: number,
  sensorType: string,
  aspectRatio: string = "3:2",
  orientation: string = "landscape",
): number => {
  const sensorDimensions = {
    fullframe: { width: 36, height: 24 }, // mm
    apsc: { width: 23.5, height: 15.6 }, // mm (Canon APS-C)
    micro43: { width: 17.3, height: 13 }, // mm
  };

  const sensor =
    sensorDimensions[sensorType as keyof typeof sensorDimensions] ||
    sensorDimensions.fullframe;

  const aspectRatios = {
    "3:2": 3 / 2,
    "4:3": 4 / 3,
    "16:9": 16 / 9,
    "1:1": 1 / 1,
  };

  const ratio =
    aspectRatios[aspectRatio as keyof typeof aspectRatios] ||
    aspectRatios["3:2"];

  let actualWidth = sensor.width;
  let actualHeight = sensor.height;

  if (ratio > sensor.width / sensor.height) {
    actualHeight = sensor.width / ratio;
  } else {
    actualWidth = sensor.height * ratio;
  }

  // 撮影向きに応じて水平画角を計算（地図表示用）
  if (orientation === "portrait") {
    [actualWidth, actualHeight] = [actualHeight, actualWidth];
  }

  return 2 * Math.atan(actualWidth / (2 * focalLength)) * (180 / Math.PI);
};

// 指定した方位角と距離の地点を計算
const getPointAtDistance = (
  lat: number,
  lng: number,
  bearing: number,
  distance: number,
): [number, number] => {
  const R = 6371000; // 地球の半径（メートル）
  const bearingRad = bearing * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
      Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad),
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
      Math.cos(distance / R) - Math.sin(latRad) * Math.sin(newLatRad),
    );

  return [newLatRad * (180 / Math.PI), newLngRad * (180 / Math.PI)];
};

// Astronomy Engine を使用した高精度な天体位置計算
const calculateSunPosition = (
  date: Date,
  latitude: number,
  longitude: number,
  elevation: number = 0,
): { azimuth: number; elevation: number } => {
  const observer = new Astronomy.Observer(latitude, longitude, elevation);
  const sunEquatorial = Astronomy.Equator(
    Astronomy.Body.Sun,
    date,
    observer,
    true,
    true,
  );
  const sunHorizontal = Astronomy.Horizon(
    date,
    observer,
    sunEquatorial.ra,
    sunEquatorial.dec,
    "normal",
  );

  return {
    azimuth: sunHorizontal.azimuth,
    elevation: sunHorizontal.altitude,
  };
};

const calculateMoonPosition = (
  date: Date,
  latitude: number,
  longitude: number,
  elevation: number = 0,
): { azimuth: number; elevation: number } => {
  const observer = new Astronomy.Observer(latitude, longitude, elevation);
  const moonEquatorial = Astronomy.Equator(
    Astronomy.Body.Moon,
    date,
    observer,
    true,
    true,
  );
  const moonHorizontal = Astronomy.Horizon(
    date,
    observer,
    moonEquatorial.ra,
    moonEquatorial.dec,
    "normal",
  );

  return {
    azimuth: moonHorizontal.azimuth,
    elevation: moonHorizontal.altitude,
  };
};

interface SimpleMapProps {
  locations: Location[];
  selectedDate?: Date;
  selectedEvents?: FujiEvent[];
  selectedLocationId?: number;
  selectedEventId?: string;
  onLocationSelect?: (location: Location) => void;
  cameraSettings: CameraSettings;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  locations: _locations,
  selectedEvents,
  selectedLocationId,
  selectedEventId,
  onLocationSelect,
  cameraSettings,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([35.3606, 138.7274], 7);

    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // マーカーの更新
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // 既存のマーカーをクリア
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // 富士山マーカー（赤色）
    const fujiIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.marker([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude], {
      icon: fujiIcon,
    }).addTo(map);

    // その日にイベントがある地点のみを表示
    const eventLocations = selectedEvents?.map((event) => event.location) || [];
    const uniqueEventLocations = eventLocations.filter(
      (location, index, self) =>
        index === self.findIndex((l) => l.id === location.id),
    );

    uniqueEventLocations.forEach((location) => {
      const isSelected = selectedLocationId === location.id;
      const locationEvents =
        selectedEvents?.filter((event) => event.location.id === location.id) ||
        [];
      const hasEvents = locationEvents.length > 0;

      // マーカーの色を決定（距離ベース）
      let markerColor = "#6b7280"; // デフォルト: グレー

      if (isSelected) {
        markerColor = "#10b981"; // 選択: 緑
      } else {
        const distance = (location.fujiDistance || 0) / 1000; // メートルからキロメートルに変換

        // 距離に応じた色分け
        if (distance <= 50) {
          markerColor = "#dc2626"; // 〜50km: 赤（とても近い）
        } else if (distance <= 100) {
          markerColor = "#ea580c"; // 〜100km: オレンジレッド（近い）
        } else if (distance <= 200) {
          markerColor = "#f59e0b"; // 〜200km: オレンジ（中距離）
        } else if (distance <= 300) {
          markerColor = "#3b82f6"; // 〜300km: 青（遠い）
        } else {
          markerColor = "#6366f1"; // 300km〜: インディゴ（とても遠い）
        }
      }

      // イベントタイプによる境界線の色を決定
      const hasDiamond = locationEvents.some((e) => e.type === "diamond");
      const hasPearl = locationEvents.some((e) => e.type === "pearl");
      let borderColor = "white";
      let borderWidth = "2px";

      if (hasDiamond && hasPearl) {
        borderColor = "#fbbf24"; // 両方: 金色
        borderWidth = "3px";
      } else if (hasDiamond) {
        borderColor = "#fcd34d"; // ダイヤモンド: 黄色
        borderWidth = "3px";
      } else if (hasPearl) {
        borderColor = "#e5e7eb"; // パール: 薄グレー
        borderWidth = "3px";
      }

      // 選択された地点がある場合、他の地点を半透明にする
      const opacity = selectedLocationId && !isSelected ? 0.3 : 1.0;

      const markerIcon = L.divIcon({
        html: `<div style="
          width: 26px; 
          height: 26px; 
          background: ${markerColor}; 
          border: ${borderWidth} solid ${borderColor}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 12px;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          opacity: ${opacity};
        ">📷</div>`,
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([location.latitude, location.longitude], {
        icon: markerIcon,
      }).addTo(map);

      if (onLocationSelect) {
        marker.on("click", () => {
          onLocationSelect(location);
        });
      }

      // 選択された地点の方位角ラインのみ表示
      if (isSelected && hasEvents) {
        // 同日に複数イベントがある場合は全て表示
        const eventsToShow = selectedEventId
          ? locationEvents.filter((e) => e.id === selectedEventId)
          : locationEvents;

        // まず撮影地→富士山の線を 1 本だけ描画（赤色）
        L.polyline(
          [
            [location.latitude, location.longitude],
            [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude],
          ],
          {
            color: "#ef4444", // 赤色
            weight: 4,
            opacity: 0.9,
            dashArray: "10, 5",
          },
        ).addTo(map);

        // 各イベントごとに太陽・月への線を描画
        eventsToShow.forEach((event, _index) => {
          // const locationToFujiAzimuth = location.fujiAzimuth || 0; // 撮影地点から富士山への方位角
          // const observerToSunMoonAzimuth = event.azimuth; // 撮影地点から見た太陽・月の方位角（イベントデータから取得）

          // Astronomy Engine を使用したリアルタイム天体位置計算（高精度）
          const calculatedSun = calculateSunPosition(
            event.time,
            location.latitude,
            location.longitude,
            location.elevation,
          );
          const calculatedMoon = calculateMoonPosition(
            event.time,
            location.latitude,
            location.longitude,
            location.elevation,
          );
          const calculatedCelestial =
            event.type === "diamond" ? calculatedSun : calculatedMoon;

          // Astronomy Engine による高精度計算の適用

          // 撮影地→太陽・月方向の線（ゴールド/紫）
          const celestialAzimuth = calculatedCelestial.azimuth; // Astronomy Engine 計算値を使用
          const celestialDistance = 350000; // 撮影地点から 350km 先まで

          const celestialPoint = getPointAtDistance(
            location.latitude,
            location.longitude,
            celestialAzimuth,
            celestialDistance,
          );

          // 太陽の場合はゴールド、月の場合は薄い紫
          const celestialColor =
            event.type === "diamond" ? "#fbbf24" : "#c084fc";

          L.polyline(
            [[location.latitude, location.longitude], celestialPoint],
            {
              color: celestialColor,
              weight: 4,
              opacity: event.type === "diamond" ? 0.9 : 0.7,
              dashArray: event.type === "diamond" ? "15, 5" : "8, 8",
            },
          ).addTo(map);
        });

        // 画角表示
        if (cameraSettings.showAngles && location.fujiAzimuth) {
          const angle = getFieldOfViewAngle(
            cameraSettings.focalLength,
            cameraSettings.sensorType,
            cameraSettings.aspectRatio,
            cameraSettings.orientation,
          );
          const distance = location.fujiDistance
            ? location.fujiDistance
            : 50000; // meters (既にメートル単位)

          const startAzimuth = (location.fujiAzimuth! - angle / 2) % 360;
          const endAzimuth = (location.fujiAzimuth! + angle / 2) % 360;

          const startPoint = getPointAtDistance(
            location.latitude,
            location.longitude,
            startAzimuth,
            distance,
          );
          const endPoint = getPointAtDistance(
            location.latitude,
            location.longitude,
            endAzimuth,
            distance,
          );

          L.polygon(
            [[location.latitude, location.longitude], startPoint, endPoint],
            {
              color: "#3b82f6",
              weight: 3,
              opacity: 0.9,
              fillOpacity: 0.3,
            },
          ).addTo(map);
        }
      }
    });

    // 地図の表示範囲とズームレベルを調整
    if (uniqueEventLocations.length > 0) {
      if (selectedLocationId) {
        // 特定の地点が選択されている場合
        const selectedLocation = uniqueEventLocations.find(
          (loc) => loc.id === selectedLocationId,
        );
        if (selectedLocation) {
          // 撮影設定が ON の場合はズームしない
          if (cameraSettings.showAngles) {
            // 撮影設定表示中は現在のビューを維持
            return;
          }

          // 富士山と撮影地点の両方が入るように fitBounds を使用
          const bounds = L.latLngBounds([]);
          bounds.extend([
            FUJI_COORDINATES.latitude,
            FUJI_COORDINATES.longitude,
          ]);
          bounds.extend([
            selectedLocation.latitude,
            selectedLocation.longitude,
          ]);

          // 適切なズームレベルで表示（パディングを追加）
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 12, // 最大ズーム制限で詳細すぎる表示を防ぐ
          });
        }
      } else {
        // 地点が選択されていない場合は全体を表示
        const bounds = L.latLngBounds([]);

        // 富士山も含める
        bounds.extend([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]);

        // イベントがある撮影地点を含める
        uniqueEventLocations.forEach((location) => {
          bounds.extend([location.latitude, location.longitude]);
        });

        // 適切なズームレベルで表示（パディングを追加）
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [
    selectedLocationId,
    selectedEventId,
    selectedEvents,
    onLocationSelect,
    cameraSettings,
  ]);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "600" }}>
          撮影地点
        </h3>
      </div>

      <div
        ref={mapRef}
        style={{
          height: "400px",
          width: "100%",
        }}
      />

      {selectedEvents && selectedEvents.length > 0 && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              fontSize: "0.875rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  backgroundColor: "#ef4444",
                  border: "1px dashed #ef4444",
                  borderStyle: "dashed",
                }}
              ></div>
              <span>撮影地点→富士山</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  backgroundColor: "#fbbf24",
                  border: "1px dashed #fbbf24",
                  borderStyle: "dashed",
                }}
              ></div>
              <span>撮影地点→太陽</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  backgroundColor: "#a855f7",
                  border: "1px dashed #a855f7",
                  borderStyle: "dashed",
                }}
              ></div>
              <span>撮影地点→月</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#dc2626",
                  borderRadius: "50%",
                }}
              ></div>
              <span>〜50km</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#ea580c",
                  borderRadius: "50%",
                }}
              ></div>
              <span>〜100km</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#f59e0b",
                  borderRadius: "50%",
                }}
              ></div>
              <span>〜200km</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                }}
              ></div>
              <span>〜300km</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#6366f1",
                  borderRadius: "50%",
                }}
              ></div>
              <span>300km〜</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#6b7280",
                  border: "2px solid #fcd34d",
                  borderRadius: "50%",
                }}
              ></div>
              <span>ダイヤモンド富士</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#6b7280",
                  border: "2px solid #e5e7eb",
                  borderRadius: "50%",
                }}
              ></div>
              <span>パール富士</span>
            </div>
            {cameraSettings.showAngles && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: "#3b82f6",
                    opacity: 0.3,
                  }}
                ></div>
                <span>画角範囲 ({cameraSettings.focalLength}mm)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;
