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

interface SimpleMapProps {
  locations: Location[];
  selectedDate?: Date;
  selectedEvents?: FujiEvent[];
  selectedLocationId?: number;
  onLocationSelect?: (location: Location) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  locations,
  selectedDate,
  selectedEvents,
  selectedLocationId,
  onLocationSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([35.3606, 138.7274], 9);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
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

    // 富士山マーカー
    const fujiIcon = L.divIcon({
      html: '<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #fff8dc 0%, #faf0e6 50%, #f0f8ff 100%); border: 3px solid #e74c3c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🗻</div>',
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude], { icon: fujiIcon })
      .addTo(map)
      .bindPopup('🗻 富士山');

    // 撮影地点マーカー
    locations.forEach((location) => {
      const isSelected = selectedLocationId === location.id;
      const hasEvents = selectedEvents?.some(event => event.location.id === location.id);
      
      const markerIcon = L.divIcon({
        html: `<div style="
          width: 24px; 
          height: 24px; 
          background: ${hasEvents ? '#fbbf24' : isSelected ? '#3b82f6' : '#6b7280'}; 
          border: 2px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 12px;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">📷</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([location.latitude, location.longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${location.name}</h4>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${location.prefecture}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">⛰️ 標高: ${location.elevation}m</p>
            ${location.fujiDistance ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">🗻 富士山まで: ${location.fujiDistance.toFixed(1)}km</p>` : ''}
          </div>
        `);

      if (onLocationSelect) {
        marker.on('click', () => {
          onLocationSelect(location);
        });
      }

      // 選択された地点から富士山への線を描画
      if (selectedLocationId === location.id && selectedEvents && selectedEvents.length > 0) {
        const line = L.polyline([
          [location.latitude, location.longitude],
          [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]
        ], {
          color: '#ef4444',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(map);
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