import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@fuji-calendar/ui";

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
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 地図を初期化
    const map = L.map(mapContainerRef.current).setView(
      [initialLat, initialLng],
      10,
    );
    mapRef.current = map;

    // 国土地理院の淡色地図タイルを使用
    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
      maxZoom: 18,
    }).addTo(map);

    // 初期マーカーを配置
    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // マーカーのドラッグイベント
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationSelect(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
    });

    // 地図クリックイベント
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    // クリーンアップ
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialLat, initialLng, onLocationSelect]);

  // 座標が外部から変更された場合にマーカーを更新
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([initialLat, initialLng]);
      mapRef.current.setView(
        [initialLat, initialLng],
        mapRef.current.getZoom(),
      );
    }
  }, [initialLat, initialLng]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]" onClick={onClose}>
      <div className="bg-white rounded-xl w-[90%] max-w-[800px] h-[600px] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.2)] md:w-[95%] md:h-[80vh] md:max-h-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200 md:px-4 md:py-4">
          <h3 className="m-0 text-xl text-gray-800 md:text-lg">
            <Icon name="mapPin" size={18} className="inline mr-2" />{" "}
            地図から座標を選択
          </h3>
          <button 
            className="bg-transparent border-none text-2xl text-gray-500 cursor-pointer p-0 w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-gray-100 hover:text-gray-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 bg-sky-50 text-sky-800 text-sm border-b border-gray-200 md:px-4 md:py-3 md:text-[0.8125rem]">
          地図上をクリックするか、マーカーをドラッグして場所を選択してください
        </div>
        <div ref={mapContainerRef} className="flex-1 w-full relative" />
        <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-500 text-center bg-gray-50 font-mono md:px-4 md:py-3">
          緯度: {initialLat.toFixed(6)}, 経度: {initialLng.toFixed(6)}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
