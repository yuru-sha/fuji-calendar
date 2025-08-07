import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { timeUtils } from "@fuji-calendar/utils";
import { Icon } from "@fuji-calendar/ui";

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    favoriteLocations,
    favoriteEvents,
    upcomingFavoriteEvents,
    stats,
    removeLocationFromFavorites,
    removeEventFromFavorites,
    clearAllFavorites,
    exportFavorites,
    importFavorites,
  } = useFavorites();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "locations">(
    "upcoming",
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState("");

  // 過去のイベントを取得
  const pastEvents = favoriteEvents
    .filter((event) => new Date(event.time) <= new Date())
    .reverse(); // 最新から順番に

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (activeTab === "locations") {
      const allIds = favoriteLocations.map((loc) => `location-${loc.id}`);
      setSelectedItems(new Set(allIds));
    } else if (activeTab === "upcoming") {
      const allIds = upcomingFavoriteEvents.map((event) => `event-${event.id}`);
      setSelectedItems(new Set(allIds));
    } else {
      const allIds = pastEvents.map((event) => `event-${event.id}`);
      setSelectedItems(new Set(allIds));
    }
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleDeleteSelected = () => {
    selectedItems.forEach((id) => {
      if (id.startsWith("location-")) {
        const locationId = parseInt(id.replace("location-", ""));
        removeLocationFromFavorites(locationId);
      } else if (id.startsWith("event-")) {
        const eventId = id.replace("event-", "");
        removeEventFromFavorites(eventId);
      }
    });
    setSelectedItems(new Set());
  };

  const handleExport = () => {
    const data = exportFavorites();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuji-calendar-favorites-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const success = importFavorites(importData);
      if (success) {
        alert("お気に入りデータのインポートに成功しました！");
        setShowImportDialog(false);
        setImportData("");
      } else {
        alert("インポートに失敗しました。データ形式を確認してください。");
      }
    } catch (error) {
      alert("インポートに失敗しました。JSON データが正しくありません。");
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setImportData(data);
      };
      reader.readAsText(file);
    }
  };

  const formatEventDate = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatEventTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // イベントの詳細を見るためにホーム画面に遷移
  const handleViewEventDetail = (event: any) => {
    const eventDate = new Date(event.time);
    const dateString = timeUtils.formatDateString(eventDate);

    // ホーム画面に遷移し、該当日付を選択状態にする
    navigate(`/?date=${dateString}`, {
      state: {
        selectedDate: eventDate,
        selectedLocationId: event.locationId,
        selectedEventId: event.id,
      },
    });
  };

  // 地点専用の詳細ページに遷移
  const handleViewLocationDetail = (location: any) => {
    navigate(`/location/${location.id}`);
  };

  const handleGoogleMapsClick = (lat: number, lng: number) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(googleMapsUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* ヘッダーカード */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <Icon name="star" size={24} className="mr-3 text-yellow-500" />
                お気に入り管理
              </h1>
              <p className="text-gray-600">保存済みの撮影地点とイベントを管理します</p>
            </div>
            
            {/* 統計情報 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalLocations}</div>
                <div className="text-sm text-gray-500">保存地点</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.upcomingEvents}</div>
                <div className="text-sm text-gray-500">今後のイベント</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.pastEvents}</div>
                <div className="text-sm text-gray-500">過去のイベント</div>
              </div>
            </div>
          </div>

          {/* タブとアクション */}
          <div className="flex justify-between items-center border-t border-gray-200 pt-6">
            <div className="flex gap-1">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "upcoming"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                今後のイベント ({stats.upcomingEvents})
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "past"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("past")}
              >
                過去のイベント ({stats.pastEvents})
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "locations"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("locations")}
              >
                保存地点 ({stats.totalLocations})
              </button>
            </div>

            <div className="flex gap-2">
              <button 
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                onClick={handleSelectAll}
              >
                全選択
              </button>
              <button 
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                onClick={handleDeselectAll}
              >
                選択解除
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDeleteSelected}
                disabled={selectedItems.size === 0}
              >
                <Icon name="trash" size={14} className="mr-1 inline" />
                選択削除 ({selectedItems.size})
              </button>
              <button 
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                onClick={handleExport}
              >
                <Icon name="download" size={14} className="mr-1 inline" />
                エクスポート
              </button>
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                onClick={() => setShowImportDialog(true)}
              >
                <Icon name="upload" size={14} className="mr-1 inline" />
                インポート
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
                onClick={() => {
                  if (
                    confirm(
                      "全てのお気に入りデータを削除します。この操作は取り消せません。本当に削除しますか？",
                    )
                  ) {
                    clearAllFavorites();
                  }
                }}
              >
                <Icon name="trash" size={14} className="mr-1 inline" />
                全削除
              </button>
            </div>
          </div>
        </div>

        {/* コンテンツカード */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === "upcoming" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="calendar" size={18} className="mr-2 text-blue-600" />
                今後のイベント
              </h2>
              {upcomingFavoriteEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="calendar" size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">今後のお気に入りイベントはありません</p>
                  <p className="text-sm mt-2">ホームページから撮影イベントをお気に入りに追加してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingFavoriteEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`event-${event.id}`)}
                          onChange={() => handleSelectItem(`event-${event.id}`)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-shrink-0">
                          <Icon
                            name={event.type === "diamond" ? "sun" : "moon"}
                            size={40}
                            className={`${
                              event.type === "diamond" ? "text-orange-500" : "text-blue-500"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {event.subType === "sunrise" || event.subType === "rising" ? "昇る" : "沈む"}
                                {event.type === "diamond" ? "ダイヤモンド富士" : "パール富士"}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatEventDate(event.time)} {formatEventTime(event.time)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 flex items-center">
                                <Icon name="mapPin" size={14} className="mr-1" />
                                {event.locationName}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <button
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                                onClick={() => handleViewEventDetail(event)}
                              >
                                <Icon name="eye" size={14} className="mr-1 inline" />
                                詳細
                              </button>
                              <button
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                                onClick={() => removeEventFromFavorites(event.id)}
                              >
                                <Icon name="trash" size={14} className="mr-1 inline" />
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "past" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="calendar" size={18} className="mr-2 text-blue-600" />
                過去のイベント
              </h2>
              {pastEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="history" size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">過去のお気に入りイベントはありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`event-${event.id}`)}
                          onChange={() => handleSelectItem(`event-${event.id}`)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-shrink-0">
                          <Icon
                            name={event.type === "diamond" ? "sun" : "moon"}
                            size={40}
                            className={`${
                              event.type === "diamond" ? "text-orange-500" : "text-blue-500"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {event.subType === "sunrise" || event.subType === "rising" ? "昇る" : "沈む"}
                                {event.type === "diamond" ? "ダイヤモンド富士" : "パール富士"}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatEventDate(event.time)} {formatEventTime(event.time)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 flex items-center">
                                <Icon name="mapPin" size={14} className="mr-1" />
                                {event.locationName}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <button
                                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                                onClick={() => handleViewEventDetail(event)}
                              >
                                <Icon name="eye" size={14} className="mr-1 inline" />
                                詳細
                              </button>
                              <button
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                                onClick={() => removeEventFromFavorites(event.id)}
                              >
                                <Icon name="trash" size={14} className="mr-1 inline" />
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "locations" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="mapPin" size={18} className="mr-2 text-green-600" />
                保存地点
              </h2>
              {favoriteLocations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="mapPin" size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">お気に入り地点はありません</p>
                  <p className="text-sm mt-2">地図から地点をお気に入りに追加してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {favoriteLocations.map((location) => (
                    <div key={location.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`location-${location.id}`)}
                          onChange={() => handleSelectItem(`location-${location.id}`)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                <Icon name="mapPin" size={16} className="mr-2 text-black" />
                                {location.name}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 flex items-center">
                                {location.prefecture}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                座標: {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                追加日: {new Date(location.addedAt).toLocaleDateString("ja-JP")}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <button
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                                onClick={() => handleViewLocationDetail(location)}
                              >
                                <Icon name="eye" size={14} className="mr-1 inline" />
                                詳細
                              </button>
                              <button
                                className="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors border border-green-200"
                                onClick={() => handleGoogleMapsClick(location.latitude, location.longitude)}
                              >
                                <Icon name="route" size={14} className="mr-1 inline" />
                                経路案内
                              </button>
                              <button
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                                onClick={() => removeLocationFromFavorites(location.id)}
                              >
                                <Icon name="trash" size={14} className="mr-1 inline" />
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* インポートダイアログ */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">データインポート</h3>
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ファイルから読み込み
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onChange={handleFileImport}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    または直接貼り付け
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="JSON 形式のデータを貼り付けてください"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-vertical"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  インポート
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
