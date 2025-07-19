import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationPicker.module.css';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationSelect, 
  initialLat = 35.3606, 
  initialLng = 138.7274,
  onClose 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 地図を初期化
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 10);
    mapRef.current = map;

    // 国土地理院の淡色地図タイルを使用
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
      maxZoom: 18,
    }).addTo(map);

    // 初期マーカーを配置
    const marker = L.marker([initialLat, initialLng], {
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    // マーカーのドラッグイベント
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationSelect(
        Number(pos.lat.toFixed(6)), 
        Number(pos.lng.toFixed(6))
      );
    });

    // 地図クリックイベント
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationSelect(
        Number(lat.toFixed(6)), 
        Number(lng.toFixed(6))
      );
    });

    // クリーンアップ
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 座標が外部から変更された場合にマーカーを更新
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([initialLat, initialLng]);
      mapRef.current.setView([initialLat, initialLng], mapRef.current.getZoom());
    }
  }, [initialLat, initialLng]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>📍 地図から座標を選択</h3>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.instructions}>
          地図上をクリックするか、マーカーをドラッグして場所を選択してください
        </div>
        <div ref={mapContainerRef} className={styles.mapContainer} />
        <div className={styles.coordinates}>
          緯度: {initialLat.toFixed(6)}, 経度: {initialLng.toFixed(6)}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;