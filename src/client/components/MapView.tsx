import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, FujiEvent, FUJI_COORDINATES } from '../../shared/types';
import styles from './MapView.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

// Leafletのアイコン設定を修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  locations?: Location[];
  fujiEvent?: FujiEvent;
  showDirection?: boolean;
  onLocationClick?: (location: Location) => void;
  onClose?: () => void;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({
  center = [35.3606, 138.7274], // 富士山の座標
  zoom = 10,
  locations = [],
  fujiEvent,
  showDirection = false,
  onLocationClick,
  onClose,
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const directionLineRef = useRef<L.Polyline | null>(null);

  // カスタムアイコンの作成
  const createLocationIcon = (location: Location) => {
    return L.divIcon({
      html: `<div class="${styles.locationMarker}">📍</div>`,
      className: styles.customDivIcon,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
  };

  const createFujiIcon = () => {
    return L.divIcon({
      html: `<div class="${styles.fujiMarker}">🗻</div>`,
      className: styles.customDivIcon,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  const createEventIcon = (event: FujiEvent) => {
    const iconSrc = event.type === 'diamond' ? diamondFujiIcon : pearlFujiIcon;
    const altText = event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
    return L.divIcon({
      html: `<div class="${styles.eventMarker}"><img src="${iconSrc}" alt="${altText}" class="${styles.markerIcon}" /></div>`,
      className: styles.customDivIcon,
      iconSize: [35, 35],
      iconAnchor: [17.5, 35],
      popupAnchor: [0, -35]
    });
  };

  // マーカーを追加する関数
  const addMarkersToMap = () => {
    if (!mapInstanceRef.current) return;
    
    console.log('MapView: Adding all markers to map');
    
    // 富士山マーカーを追加
    console.log('MapView: Adding Fuji marker');
    const fujiMarker = L.marker(
      [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude],
      { icon: createFujiIcon() }
    ).addTo(mapInstanceRef.current);

    fujiMarker.bindPopup(`
      <div class="${styles.popup}">
        <h4>富士山</h4>
        <p>標高: ${FUJI_COORDINATES.elevation.toFixed(1)}m</p>
        <p>緯度: ${FUJI_COORDINATES.latitude}°</p>
        <p>経度: ${FUJI_COORDINATES.longitude}°</p>
      </div>
    `);
    
    // イベントマーカーを追加
    if (fujiEvent) {
      console.log('MapView: Adding event marker');
      const eventMarker = L.marker(
        [fujiEvent.location.latitude, fujiEvent.location.longitude],
        { icon: createEventIcon(fujiEvent) }
      ).addTo(mapInstanceRef.current);

      const eventType = fujiEvent.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
      const subType = fujiEvent.subType === 'rising' ? '昇る' : '沈む';
      
      eventMarker.bindPopup(`
        <div class="${styles.popup}">
          <h4>${subType}${eventType}</h4>
          <p><strong>時刻:</strong> ${fujiEvent.time.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
          <p><strong>地点:</strong> ${fujiEvent.location.name}</p>
          <p><strong>方位角:</strong> ${Math.round(fujiEvent.azimuth)}°</p>
          ${fujiEvent.elevation !== undefined ? 
            `<p><strong>高度:</strong> ${Math.round(fujiEvent.elevation)}°</p>` : ''
          }
        </div>
      `);
      
      // 方向線の表示
      if (showDirection) {
        const startPoint: [number, number] = [fujiEvent.location.latitude, fujiEvent.location.longitude];
        const endPoint: [number, number] = [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude];
        
        const directionLine = L.polyline([startPoint, endPoint], {
          color: fujiEvent.type === 'diamond' ? '#ff6b35' : '#4a90e2',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5'
        }).addTo(mapInstanceRef.current);

        directionLine.bindPopup(`
          <div class="${styles.popup}">
            <h4>撮影方向</h4>
            <p>この線の方向に${fujiEvent.type === 'diamond' ? '太陽' : '月'}が見えます</p>
          </div>
        `);
        
        directionLineRef.current = directionLine;
      }
      
      // 地図の表示範囲を調整
      const bounds = L.latLngBounds([
        [fujiEvent.location.latitude, fujiEvent.location.longitude],
        [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
    
    console.log('MapView: All markers added successfully');
  };

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current) {
      console.log('MapView: mapRef.current is null');
      return;
    }

    console.log('MapView: Initializing map...');

    // 既存の地図インスタンスがある場合は削除
    if (mapInstanceRef.current) {
      console.log('MapView: Removing existing map instance');
      mapInstanceRef.current.remove();
    }

    // 少し遅延を入れてDOMの準備を待つ
    const timer = setTimeout(() => {
      try {
        // 新しい地図インスタンスを作成
        const map = L.map(mapRef.current!).setView(center, zoom);
        console.log('MapView: Map instance created');

        // 国土地理院 淡色タイルレイヤーを追加
        L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
          maxZoom: 18,
        }).addTo(map);
        console.log('MapView: Tile layer added');

        mapInstanceRef.current = map;
        console.log('MapView: Map initialization complete');
        
        // マップサイズを再計算（複数回実行して確実にサイズを認識させる）
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
        setTimeout(() => {
          map.invalidateSize();
        }, 1000);
        
        // マップが初期化された後にマーカーを追加
        setTimeout(() => {
          addMarkersToMap();
        }, 200);
      } catch (error) {
        console.error('MapView: Error initializing map:', error);
      }
    }, 100);

    // クリーンアップ関数
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        console.log('MapView: Cleaning up map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);


  // 中心位置とズームレベルの更新
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(center, zoom);
  }, [mapInstanceRef.current, center, zoom]);

  return (
    <div className={`${styles.mapContainer} ${className || ''}`}>
      {onClose && (
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="地図を閉じる"
        >
          ×
        </button>
      )}
      <div 
        ref={mapRef} 
        className={styles.map}
        style={{ 
          height: '100%', 
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}
      />
      
      {fujiEvent && (
        <div className={styles.legend}>
          <h4 className={styles.legendTitle}>凡例</h4>
          <div className={styles.legendItem}>
            <span className={styles.legendIcon}>🗻</span>
            <span>富士山</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendIcon}>
              <img src={fujiEvent.type === 'diamond' ? diamondFujiIcon : pearlFujiIcon} 
                   alt={fujiEvent.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'} 
                   className={styles.legendIconImg} />
            </span>
            <span>撮影地点</span>
          </div>
          {showDirection && (
            <div className={styles.legendItem}>
              <span className={styles.legendLine} style={{
                borderColor: fujiEvent.type === 'diamond' ? '#ff6b35' : '#4a90e2'
              }}></span>
              <span>撮影方向</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;