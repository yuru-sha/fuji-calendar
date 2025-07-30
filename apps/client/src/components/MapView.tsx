import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Location, FujiEvent } from '@fuji-calendar/types';
import { FujiIcon } from '@fuji-calendar/ui';
import 'leaflet/dist/leaflet.css';

// Leaflet のデフォルトアイコンを修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  locations: Location[];
  selectedEvents?: FujiEvent[];
  selectedLocationId?: number;
  onLocationSelect?: (location: Location) => void;
  className?: string;
}

// カスタムアイコンを作成
const createCustomIcon = (type: 'diamond' | 'pearl' | 'default') => {
  const iconHtml = type === 'diamond' 
    ? '<div style="background: #f97316; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">💎</div>'
    : type === 'pearl'
    ? '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">🌙</div>'
    : '<div style="background: #6b7280; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📍</div>';

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// 地図の中心を調整するコンポーネント
const MapController: React.FC<{ locations: Location[]; selectedLocationId?: number }> = ({ 
  locations, 
  selectedLocationId 
}) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    if (selectedLocationId) {
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
      if (selectedLocation) {
        map.setView([selectedLocation.latitude, selectedLocation.longitude], 12);
        return;
      }
    }

    // 全ての地点を含む範囲にフィット
    const bounds = L.latLngBounds(
      locations.map(loc => [loc.latitude, loc.longitude])
    );
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, locations, selectedLocationId]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({
  locations,
  selectedEvents = [],
  selectedLocationId,
  onLocationSelect,
  className = ''
}) => {
  // 富士山の位置（デフォルトの中心点）
  const fujiPosition: [number, number] = [35.3606, 138.7274];

  // 地点にイベント情報を付加
  const locationsWithEvents = locations.map(location => {
    const locationEvents = selectedEvents.filter(event => event.location.id === location.id);
    return {
      ...location,
      events: locationEvents
    };
  });

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={fujiPosition}
        zoom={8}
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg border border-gray-200"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController locations={locations} selectedLocationId={selectedLocationId} />

        {/* 富士山マーカー */}
        <Marker 
          position={fujiPosition}
          icon={L.divIcon({
            html: '<div style="background: #dc2626; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🗻</div>',
            className: 'fuji-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          })}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-bold text-lg">富士山</h3>
              <p className="text-sm text-gray-600">標高: 3,776m</p>
              <p className="text-xs text-gray-500">35.3606°N, 138.7274°E</p>
            </div>
          </Popup>
        </Marker>

        {/* 撮影地点マーカー */}
        {locationsWithEvents.map((location) => {
          const hasEvents = location.events.length > 0;
          const eventType = hasEvents 
            ? location.events[0].type 
            : 'default';
          
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createCustomIcon(eventType as 'diamond' | 'pearl' | 'default')}
              eventHandlers={{
                click: () => {
                  if (onLocationSelect) {
                    onLocationSelect(location);
                  }
                }
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{location.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">都道府県:</span> {location.prefecture}</p>
                    <p><span className="font-medium">標高:</span> {location.elevation}m</p>
                    <p><span className="font-medium">座標:</span> {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E</p>
                    {location.fujiDistance && (
                      <p><span className="font-medium">富士山まで:</span> {(location.fujiDistance / 1000).toFixed(1)}km</p>
                    )}
                  </div>
                  
                  {location.description && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{location.description}</p>
                    </div>
                  )}

                  {hasEvents && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <h4 className="font-medium text-sm mb-1">この日のイベント:</h4>
                      <div className="space-y-1">
                        {location.events.map((event, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <FujiIcon type={event.type} size={16} />
                            <span>
                              {event.type === 'diamond' ? 'ダイヤモンド富士' : 'パール富士'}
                              ({event.subType === 'sunrise' || event.subType === 'rising' ? '日の出' : '日の入り'})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* 地図の凡例 */}
      <div className="absolute top-2 right-2 bg-white rounded-lg shadow-md p-3 text-xs">
        <h4 className="font-medium mb-2">凡例</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">🗻</div>
            <span>富士山</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">💎</div>
            <span>ダイヤモンド富士</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">🌙</div>
            <span>パール富士</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs">📍</div>
            <span>撮影地点</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;