import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, FujiEvent, FUJI_COORDINATES } from '../../shared/types';

// Leafletのアイコン設定を修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 画角計算ヘルパー関数
const getFieldOfViewAngle = (focalLength: number): number => {
  // フルフレーム（35mm）センサーでの水平画角を計算
  const sensorWidth = 36; // mm
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
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
  onLocationSelect?: (location: Location) => void;
  showCameraAngles?: boolean;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  locations,
  selectedDate,
  selectedEvents,
  selectedLocationId,
  onLocationSelect,
  showCameraAngles = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([35.3606, 138.7274], 9);
    
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

    // 富士山マーカー（標準の赤いマーカー）
    const fujiIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    L.marker([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude], { icon: fujiIcon })
      .addTo(map);

    // 撮影地点マーカー
    locations.forEach((location) => {
      const isSelected = selectedLocationId === location.id;
      const locationEvents = selectedEvents?.filter(event => event.location.id === location.id) || [];
      const hasEvents = locationEvents.length > 0;
      
      // マーカーの色を決定
      let markerColor = '#6b7280'; // デフォルト: グレー
      if (hasEvents) {
        const hasDiamond = locationEvents.some(e => e.type === 'diamond');
        const hasPearl = locationEvents.some(e => e.type === 'pearl');
        if (hasDiamond && hasPearl) {
          markerColor = '#8b5cf6'; // 両方: 紫
        } else if (hasDiamond) {
          markerColor = '#f59e0b'; // ダイヤモンド: オレンジ
        } else if (hasPearl) {
          markerColor = '#3b82f6'; // パール: 青
        }
      } else if (isSelected) {
        markerColor = '#10b981'; // 選択: 緑
      }
      
      const markerIcon = L.divIcon({
        html: `<div style="
          width: 26px; 
          height: 26px; 
          background: ${markerColor}; 
          border: 2px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 12px;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
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
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(map);

        // 画角表示
        if (showCameraAngles && location.fujiAzimuth) {
          const drawCameraAngle = (focalLength: number, color: string, opacity: number) => {
            const angle = getFieldOfViewAngle(focalLength);
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
              color: color,
              weight: 1,
              opacity: opacity,
              fillOpacity: opacity * 0.3
            }).addTo(map);
          };

          // 各焦点距離の画角を表示
          drawCameraAngle(14, '#ff6b6b', 0.6);   // 14mm
          drawCameraAngle(24, '#4ecdc4', 0.5);   // 24mm
          drawCameraAngle(35, '#45b7d1', 0.4);   // 35mm
          drawCameraAngle(50, '#f39c12', 0.3);   // 50mm
          drawCameraAngle(85, '#9b59b6', 0.2);   // 85mm
        }
      }
    });
  }, [locations, selectedLocationId, selectedEvents, onLocationSelect]);

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
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#ef4444',
                borderRadius: '50%'
              }}></div>
              <span>太陽/月の軌道</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#fbbf24',
                borderRadius: '50%'
              }}></div>
              <span>撮影可能地点</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;