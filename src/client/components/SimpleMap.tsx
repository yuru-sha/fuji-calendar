import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, FujiEvent, FUJI_COORDINATES } from '../../shared/types';
import { CameraSettings } from './CameraPanel';

// Leafletのアイコン設定を修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 画角計算ヘルパー関数
const getFieldOfViewAngle = (focalLength: number, sensorType: string, aspectRatio: string = '3:2', orientation: string = 'landscape'): number => {
  const sensorDimensions = {
    fullframe: { width: 36, height: 24 },   // mm
    apsc: { width: 23.5, height: 15.6 },    // mm (Canon APS-C)
    micro43: { width: 17.3, height: 13 }    // mm
  };
  
  const sensor = sensorDimensions[sensorType as keyof typeof sensorDimensions] || sensorDimensions.fullframe;
  
  const aspectRatios = {
    '3:2': 3/2,
    '4:3': 4/3,
    '16:9': 16/9,
    '1:1': 1/1
  };
  
  const ratio = aspectRatios[aspectRatio as keyof typeof aspectRatios] || aspectRatios['3:2'];
  
  let actualWidth = sensor.width;
  let actualHeight = sensor.height;
  
  if (ratio > sensor.width / sensor.height) {
    actualHeight = sensor.width / ratio;
  } else {
    actualWidth = sensor.height * ratio;
  }
  
  // 撮影向きに応じて水平画角を計算（地図表示用）
  if (orientation === 'portrait') {
    [actualWidth, actualHeight] = [actualHeight, actualWidth];
  }
  
  return 2 * Math.atan(actualWidth / (2 * focalLength)) * (180 / Math.PI);
};

// 指定した方位角と距離の地点を計算
const getPointAtDistance = (lat: number, lng: number, bearing: number, distance: number): [number, number] => {
  const R = 6371000; // 地球の半径（メートル）
  const bearingRad = bearing * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
    Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
    Math.cos(distance / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return [newLatRad * (180 / Math.PI), newLngRad * (180 / Math.PI)];
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
  locations,
  selectedDate,
  selectedEvents,
  selectedLocationId,
  selectedEventId,
  onLocationSelect,
  cameraSettings
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([35.3606, 138.7274], 7);
    
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>'
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
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    L.marker([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude], { icon: fujiIcon })
      .addTo(map);

    // その日のイベントがある撮影地点のみを表示
    const eventLocations = selectedEvents?.map(event => event.location) || [];
    const uniqueEventLocations = eventLocations.filter((location, index, self) => 
      index === self.findIndex(l => l.id === location.id)
    );

    uniqueEventLocations.forEach((location) => {
      const isSelected = selectedLocationId === location.id;
      const locationEvents = selectedEvents?.filter(event => event.location.id === location.id) || [];
      const hasEvents = locationEvents.length > 0;
      
      // マーカーの色を決定（距離ベース）
      let markerColor = '#6b7280'; // デフォルト: グレー
      
      if (isSelected) {
        markerColor = '#10b981'; // 選択: 緑
      } else {
        const distance = location.fujiDistance || 0;
        
        // 距離に応じた色分け
        if (distance <= 50) {
          markerColor = '#dc2626'; // 〜50km: 赤（とても近い）
        } else if (distance <= 100) {
          markerColor = '#ea580c'; // 〜100km: オレンジレッド（近い）
        } else if (distance <= 200) {
          markerColor = '#f59e0b'; // 〜200km: オレンジ（中距離）
        } else if (distance <= 300) {
          markerColor = '#3b82f6'; // 〜300km: 青（遠い）
        } else {
          markerColor = '#6366f1'; // 300km〜: インディゴ（とても遠い）
        }
        
      }
      
      // イベントタイプによる境界線の色を決定
      const hasDiamond = locationEvents.some(e => e.type === 'diamond');
      const hasPearl = locationEvents.some(e => e.type === 'pearl');
      let borderColor = 'white';
      let borderWidth = '2px';
      
      if (hasDiamond && hasPearl) {
        borderColor = '#fbbf24'; // 両方: 金色
        borderWidth = '3px';
      } else if (hasDiamond) {
        borderColor = '#fcd34d'; // ダイヤモンド: 黄色
        borderWidth = '3px';
      } else if (hasPearl) {
        borderColor = '#e5e7eb'; // パール: 薄グレー
        borderWidth = '3px';
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
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([location.latitude, location.longitude], { icon: markerIcon })
        .addTo(map);

      if (onLocationSelect) {
        marker.on('click', () => {
          onLocationSelect(location);
        });
      }

      // 選択された地点から富士山への線を描画
      if (isSelected && hasEvents) {
        const line = L.polyline([
          [location.latitude, location.longitude],
          [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]
        ], {
          color: '#ef4444',
          weight: 4,
          opacity: 1.0,
          dashArray: '5, 10'
        }).addTo(map);

        // 選択されたイベントIDがある場合はそのイベントのみ、なければ最初のイベント
        const targetEvent = selectedEventId 
          ? locationEvents.find(e => e.id === selectedEventId)
          : locationEvents[0];
        
        if (targetEvent) {
          const event = targetEvent;
          const locationToFujiAzimuth = location.fujiAzimuth || 0; // 撮影地点から富士山への方位角
          const observerToSunMoonAzimuth = event.azimuth; // 撮影地点から見た太陽・月の方位角（イベントデータから取得）
          
          const lineDistance = 700000; // 700km in meters
          
          // イベントタイプによる色分け
          const lineColor = event.type === 'diamond' ? '#fbbf24' : '#a855f7'; // 金色（太陽）、紫（月）
          const lineOpacity = event.type === 'diamond' ? 0.8 : 0.6;
          
          // 撮影地点から太陽・月方向への線
          const sunMoonSidePoint = getPointAtDistance(
            location.latitude,
            location.longitude,
            observerToSunMoonAzimuth,
            lineDistance // 700km（撮影地点から）
          );
          
          // 撮影地点から太陽・月への方位角ライン
          L.polyline([
            [location.latitude, location.longitude],
            sunMoonSidePoint
          ], {
            color: lineColor,
            weight: 3,
            opacity: lineOpacity,
            dashArray: event.type === 'diamond' ? '8, 4' : '4, 8'
          }).addTo(map);
          
          // 太陽・月の方位角ラベル（撮影地点から太陽・月方向に、富士山の少し先）
          const labelDistance = (location.fujiDistance || 50) * 1000 + 50000; // 富士山の50km先
          const sunMoonLabelPoint = getPointAtDistance(
            location.latitude,
            location.longitude,
            observerToSunMoonAzimuth,
            labelDistance
          );
          
          const eventTypeIcon = event.type === 'diamond' ? '☀️' : '🌙';
          const eventTime = event.time.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          // 方位角の差を計算してラベルに含める（ダイヤモンド富士の精度を示す）
          const azimuthDifference = Math.abs(observerToSunMoonAzimuth - locationToFujiAzimuth);
          const normalizedDifference = azimuthDifference > 180 ? 360 - azimuthDifference : azimuthDifference;
          
          L.marker(sunMoonLabelPoint, {
            icon: L.divIcon({
              html: `<div style="
                background: rgba(255,255,255,0.95);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                color: #1f2937;
                border: 2px solid ${lineColor};
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">${eventTypeIcon} ${observerToSunMoonAzimuth.toFixed(0)}° ${eventTime}<br/>
              <span style="font-size: 9px; color: #6b7280;">富士山方位との差: ${normalizedDifference.toFixed(1)}°</span></div>`,
              className: '',
              iconSize: [100, 30],
              iconAnchor: [50, 15]
            })
          }).addTo(map);
        }

        // 画角表示
        if (cameraSettings.showAngles && location.fujiAzimuth) {
          const angle = getFieldOfViewAngle(cameraSettings.focalLength, cameraSettings.sensorType, cameraSettings.aspectRatio, cameraSettings.orientation);
          const distance = location.fujiDistance ? location.fujiDistance * 1000 : 50000; // meters
          
          const startAzimuth = (location.fujiAzimuth! - angle / 2) % 360;
          const endAzimuth = (location.fujiAzimuth! + angle / 2) % 360;
          
          const startPoint = getPointAtDistance(location.latitude, location.longitude, startAzimuth, distance);
          const endPoint = getPointAtDistance(location.latitude, location.longitude, endAzimuth, distance);
          
          L.polygon([
            [location.latitude, location.longitude],
            startPoint,
            endPoint
          ], {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.9,
            fillOpacity: 0.3
          }).addTo(map);
        }
      }
    });

    // イベントがある撮影地点がある場合、すべてが見えるように表示範囲を調整
    if (uniqueEventLocations.length > 0) {
      const bounds = L.latLngBounds([]);
      
      // 富士山も含める
      bounds.extend([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]);
      
      // イベントがある撮影地点を含める
      uniqueEventLocations.forEach(location => {
        bounds.extend([location.latitude, location.longitude]);
      });
      
      // 適切なズームレベルで表示（パディングを追加）
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [selectedLocationId, selectedEventId, selectedEvents, onLocationSelect, cameraSettings]);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
          撮影地点マップ
        </h3>
        {selectedDate && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            {selectedDate.toLocaleDateString('ja-JP')}の撮影可能地点
          </p>
        )}
      </div>
      
      <div 
        ref={mapRef}
        style={{ 
          height: '400px',
          width: '100%'
        }}
      />
      
      {selectedEvents && selectedEvents.length > 0 && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.875rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '2px', 
                backgroundColor: '#ef4444',
                border: '1px dashed #ef4444',
                borderStyle: 'dashed'
              }}></div>
              <span>撮影地点→富士山</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '2px', 
                backgroundColor: '#fbbf24',
                border: '1px dashed #fbbf24',
                borderStyle: 'dashed'
              }}></div>
              <span>撮影地点→太陽</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '2px', 
                backgroundColor: '#a855f7',
                border: '1px dashed #a855f7',
                borderStyle: 'dashed'
              }}></div>
              <span>撮影地点→月</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#dc2626',
                borderRadius: '50%'
              }}></div>
              <span>〜50km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#ea580c',
                borderRadius: '50%'
              }}></div>
              <span>〜100km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#f59e0b',
                borderRadius: '50%'
              }}></div>
              <span>〜200km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#3b82f6',
                borderRadius: '50%'
              }}></div>
              <span>〜300km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#6366f1',
                borderRadius: '50%'
              }}></div>
              <span>300km〜</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#6b7280',
                border: '2px solid #fcd34d',
                borderRadius: '50%'
              }}></div>
              <span>ダイヤモンド富士</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '50%'
              }}></div>
              <span>パール富士</span>
            </div>
            {cameraSettings.showAngles && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: '#3b82f6',
                  opacity: 0.3
                }}></div>
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