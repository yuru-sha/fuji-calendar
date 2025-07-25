import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, FujiEvent, FUJI_COORDINATES } from '../../shared/types';
import styles from './MapView.module.css';
import diamondFujiIcon from '../assets/icons/diamond_fuji_small.png';
import pearlFujiIcon from '../assets/icons/pearl_fuji_small.png';

// Leafletのアイコン設定を修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
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
  dayEvents?: FujiEvent[];
  selectedLocationId?: number;
  showDirection?: boolean;
  onLocationClick?: (location: Location) => void;
  onLocationSelect?: (location: Location | null) => void;
  onClose?: () => void;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({
  center = [35.3606, 138.7274], // 富士山の座標
  zoom = 10,
  locations,
  fujiEvent,
  dayEvents,
  selectedLocationId,
  showDirection = false,
  onLocationClick,
  onLocationSelect,
  onClose,
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const directionLineRef = useRef<L.Polyline | null>(null);
  const dayEventLinesRef = useRef<L.Polyline[]>([]);

  const createFujiIcon = () => {
    return L.divIcon({
      html: `<div class="${styles.fujiMarker}" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.7), -1px -1px 2px rgba(255,255,255,0.8);">🗻</div>`,
      className: styles.customDivIcon,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -44]
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

  const createLocationIcon = (isHighlighted: boolean = false, isSelected: boolean = false, isDimmed: boolean = false) => {
    let markerClass = styles.locationMarker;
    
    if (isSelected) {
      markerClass = styles.selectedLocationMarker;
    } else if (isHighlighted) {
      markerClass = styles.highlightedLocationMarker;
    } else if (isDimmed) {
      markerClass = styles.dimmedLocationMarker;
    }
    
    return L.divIcon({
      html: `<div class="${markerClass}">📍</div>`,
      className: styles.customDivIcon,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
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
    
    // 撮影地点マーカーを追加
    if (locations && locations.length > 0) {
      console.log('MapView: Adding location markers', locations.length);
      
      // 選択された日のイベント地点のIDセットを作成
      const dayEventLocationIds = new Set(
        dayEvents?.map(event => event.location.id) || []
      );
      
      locations.forEach((location) => {
        const isHighlighted = dayEventLocationIds.has(location.id);
        const isSelected = selectedLocationId === location.id;
        const isDimmed = selectedLocationId !== undefined && selectedLocationId !== location.id;
        
        const locationMarker = L.marker(
          [location.latitude, location.longitude],
          { icon: createLocationIcon(isHighlighted, isSelected, isDimmed) }
        ).addTo(mapInstanceRef.current!);

        // クリックイベントを追加
        locationMarker.on('click', () => {
          if (onLocationSelect) {
            onLocationSelect(isSelected ? null : location);
          }
          if (onLocationClick) {
            onLocationClick(location);
          }
        });

        // 選択された日のイベント情報を含めるかどうか
        const locationEvents = dayEvents?.filter(event => event.location.id === location.id) || [];
        
        locationMarker.bindPopup(`
          <div class="${styles.popup}">
            <h4>${location.name}</h4>
            <p><strong>都道府県:</strong> ${location.prefecture}</p>
            <p><strong>標高:</strong> ${location.elevation.toFixed(1)}m</p>
            ${locationEvents.length > 0 ? `
              <div class="${styles.eventInfo}">
                <strong>📅 選択された日のイベント:</strong>
                ${locationEvents.map(event => {
                  const eventType = event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
                  const subType = event.subType === 'rising' ? '昇る' : '沈む';
                  return `<p>• ${subType}${eventType} ${event.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>`;
                }).join('')}
              </div>
            ` : ''}
            ${location.description ? `<p><strong>説明:</strong> ${location.description}</p>` : ''}
            ${location.accessInfo ? `<p><strong>アクセス:</strong> ${location.accessInfo}</p>` : ''}
            ${location.warnings ? `<p class="${styles.warning}"><strong>⚠️ 注意:</strong> ${location.warnings}</p>` : ''}
            <div class="${styles.popupButtons}">
              <button onclick="window.selectLocation(${location.id})" class="${styles.selectButton}">
                ${isSelected ? '選択解除' : '地点を選択'}
              </button>
            </div>
          </div>
        `);
      });
    }
    
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
      
      // 地図の表示範囲を調整（イベントがある場合）
      const bounds = L.latLngBounds([
        [fujiEvent.location.latitude, fujiEvent.location.longitude],
        [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (locations && locations.length > 0) {
      // イベントがない場合は全ての撮影地点を表示
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      bounds.extend([FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // 選択された地点と富士山を通る太陽のライン（日の出・日の入り方向）を描画
    if (selectedLocationId && locations && showDirection) {
      console.log('MapView: Adding sun direction line for selected location', selectedLocationId);
      
      // 既存の太陽線をクリア
      dayEventLinesRef.current.forEach(line => {
        mapInstanceRef.current?.removeLayer(line);
      });
      dayEventLinesRef.current = [];

      // 選択された地点を取得
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      if (selectedLocation) {
        // 選択された地点と富士山の位置
        const locationPoint: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
        const fujiPoint: [number, number] = [FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude];
        
        // 地点から富士山への方位角を計算
        const dx = FUJI_COORDINATES.longitude - selectedLocation.longitude;
        const dy = FUJI_COORDINATES.latitude - selectedLocation.latitude;
        const fujiAzimuth = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
        
        // 太陽のライン（選択地点から富士山を通って延長）を計算
        // 富士山から更に延長した点を計算
        const extensionDistance = 0.3; // 約30km相当
        const extendedLat = FUJI_COORDINATES.latitude + (FUJI_COORDINATES.latitude - selectedLocation.latitude) * extensionDistance;
        const extendedLng = FUJI_COORDINATES.longitude + (FUJI_COORDINATES.longitude - selectedLocation.longitude) * extensionDistance;
        const extendedPoint: [number, number] = [extendedLat, extendedLng];
        
        // 太陽の軌道線を描画（選択地点 → 富士山 → 延長点）
        const sunLine = L.polyline([locationPoint, fujiPoint, extendedPoint], {
          color: '#ffd700', // 金色（太陽の色）
          weight: 4,
          opacity: 0.8,
          dashArray: '12, 6'
        }).addTo(mapInstanceRef.current!);

        sunLine.bindPopup(`
          <div class="${styles.popup}">
            <h4>☀️ 太陽の軌道線</h4>
            <p><strong>撮影地点:</strong> ${selectedLocation.name}</p>
            <p><strong>方位角:</strong> ${fujiAzimuth.toFixed(1)}°</p>
            <p>この線上を太陽が移動します</p>
            <p>富士山頂で太陽が重なる瞬間がダイヤモンド富士です</p>
          </div>
        `);
        
        dayEventLinesRef.current.push(sunLine);
        
        // カメラの画角範囲をセクター（扇形）で表示
        const cameraAngles = [
          { name: '超広角 (14mm)', angle: 90, color: '#ff6b35', opacity: 0.15 },
          { name: '広角 (24mm)', angle: 60, color: '#ffa500', opacity: 0.2 },
          { name: '標準 (50mm)', angle: 35, color: '#ffd700', opacity: 0.25 },
          { name: '中望遠 (85mm)', angle: 20, color: '#32cd32', opacity: 0.3 },
          { name: '望遠 (200mm)', angle: 8, color: '#4169e1', opacity: 0.35 }
        ];

        cameraAngles.forEach(camera => {
          // 富士山方向を中心とした画角の扇形を作成
          const sectorPoints: [number, number][] = [locationPoint];
          const startAngle = fujiAzimuth - camera.angle / 2;
          const endAngle = fujiAzimuth + camera.angle / 2;
          
          // 扇形の円弧を描画するための点を生成
          const radius = selectedLocation.fujiDistance ? selectedLocation.fujiDistance * 0.3 : 30; // km
          const radiusInDegrees = radius / 111; // 1度 ≈ 111km
          
          for (let angle = startAngle; angle <= endAngle; angle += 2) {
            const radians = (angle * Math.PI) / 180;
            const lat = selectedLocation.latitude + radiusInDegrees * Math.cos(radians);
            const lng = selectedLocation.longitude + radiusInDegrees * Math.sin(radians);
            sectorPoints.push([lat, lng]);
          }
          
          sectorPoints.push(locationPoint); // 扇形を閉じる
          
          const sector = L.polygon(sectorPoints, {
            color: camera.color,
            weight: 2,
            opacity: 0.8,
            fillColor: camera.color,
            fillOpacity: camera.opacity
          }).addTo(mapInstanceRef.current!);

          sector.bindPopup(`
            <div class="${styles.popup}">
              <h4>📷 ${camera.name}</h4>
              <p><strong>画角:</strong> 約${camera.angle}°</p>
              <p><strong>撮影地点:</strong> ${selectedLocation.name}</p>
              <p>この範囲が写真に写ります</p>
            </div>
          `);
          
          dayEventLinesRef.current.push(sector as any);
        });
        
        // 選択された日のイベントがある場合、その時刻の太陽位置をマーク
        if (dayEvents && dayEvents.length > 0) {
          const locationEvents = dayEvents.filter(event => event.location.id === selectedLocationId);
          
          locationEvents.forEach((event) => {
            // 太陽のマーカーを富士山位置に配置
            const sunMarker = L.marker(fujiPoint, {
              icon: L.divIcon({
                html: `<div class="${styles.sunMarker}">☀️</div>`,
                className: styles.customDivIcon,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
              })
            }).addTo(mapInstanceRef.current!);

            const eventType = event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士';
            const subType = event.subType === 'rising' ? '昇る' : '沈む';
            
            sunMarker.bindPopup(`
              <div class="${styles.popup}">
                <h4>☀️ ${subType}${eventType}</h4>
                <p><strong>時刻:</strong> ${event.time.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</p>
                <p><strong>方位角:</strong> ${event.azimuth?.toFixed(1) || fujiAzimuth.toFixed(1)}°</p>
                <p>この時刻に太陽が富士山頂に重なります</p>
              </div>
            `);
          });
        }
      }
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
        
        // 日イベント線をクリア
        dayEventLinesRef.current.forEach(line => {
          mapInstanceRef.current?.removeLayer(line);
        });
        dayEventLinesRef.current = [];
        
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);


  // 中心位置とズームレベルの更新
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(center, zoom);
  }, [center, zoom]);

  // マーカーの更新
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    console.log('MapView: Updating markers due to props change');
    addMarkersToMap();
  }, [locations, selectedLocationId, dayEvents, showDirection]);

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
      
      {/* 凡例は特定の条件でのみ表示 */}
      {(showDirection && (selectedLocationId || (dayEvents && dayEvents.length > 0))) && (
        <div className={styles.legend}>
          <h4 className={styles.legendTitle}>凡例</h4>
          <div className={styles.legendItem}>
            <span className={styles.legendIcon}>🗻</span>
            <span>富士山</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendIcon}>📍</span>
            <span>撮影地点</span>
          </div>
          {dayEvents && dayEvents.length > 0 && (
            <div className={styles.legendItem}>
              <span className={styles.legendIcon} style={{color: '#ff6b35', fontSize: '18px'}}>📍</span>
              <span>選択日のイベント地点</span>
            </div>
          )}
          {showDirection && selectedLocationId && (
            <>
              <div className={styles.legendItem}>
                <span className={styles.legendLine} style={{
                  borderColor: '#ffd700',
                  borderStyle: 'dashed'
                }}></span>
                <span>太陽の軌道線</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendIcon} style={{color: '#4169e1'}}>📷</span>
                <span>カメラ画角範囲</span>
              </div>
            </>
          )}
          {showDirection && dayEvents && dayEvents.some(e => selectedLocationId === e.location.id) && (
            <div className={styles.legendItem}>
              <span className={styles.legendIcon}>☀️</span>
              <span>太陽の位置</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;