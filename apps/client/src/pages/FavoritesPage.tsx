import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { timeUtils } from "@fuji-calendar/utils";
import styles from "./FavoritesPage.module.css";
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

  return (
    <div className={styles.favoritesPage}>
      <div className="content-wide">
        {/* ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>お気に入り管理</h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.totalLocations}</span>
              <span className={styles.statLabel}>地点</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.upcomingEvents}</span>
              <span className={styles.statLabel}>今後のイベント</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{stats.pastEvents}</span>
              <span className={styles.statLabel}>過去のイベント</span>
            </div>
          </div>
        </div>

        {/* ツールバー */}
        <div className={styles.toolbar}>
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tab} ${activeTab === "upcoming" ? styles.active : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              今後のイベント ({stats.upcomingEvents})
            </button>
            <button
              className={`${styles.tab} ${activeTab === "past" ? styles.active : ""}`}
              onClick={() => setActiveTab("past")}
            >
              過去のイベント ({stats.pastEvents})
            </button>
            <button
              className={`${styles.tab} ${activeTab === "locations" ? styles.active : ""}`}
              onClick={() => setActiveTab("locations")}
            >
              お気に入り地点 ({stats.totalLocations})
            </button>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionButton} onClick={handleSelectAll}>
              全選択
            </button>
            <button className={styles.actionButton} onClick={handleDeselectAll}>
              選択解除
            </button>
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={handleDeleteSelected}
              disabled={selectedItems.size === 0}
            >
              選択削除 ({selectedItems.size})
            </button>
            <button className={styles.actionButton} onClick={handleExport}>
              エクスポート
            </button>
            <button
              className={styles.actionButton}
              onClick={() => setShowImportDialog(true)}
            >
              インポート
            </button>
            <button
              className={`${styles.actionButton} ${styles.dangerButton}`}
              onClick={() => {
                if (
                  confirm(
                    "全てのお気に入りデータを削除しますか？この操作は取り消せません。",
                  )
                ) {
                  clearAllFavorites();
                }
              }}
            >
              全削除
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className={styles.content}>
          {activeTab === "upcoming" && (
            <div className={styles.eventsList}>
              {upcomingFavoriteEvents.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>今後のお気に入りイベントはありません</p>
                </div>
              ) : (
                upcomingFavoriteEvents.map((event) => (
                  <div key={event.id} className={styles.eventItem}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(`event-${event.id}`)}
                      onChange={() => handleSelectItem(`event-${event.id}`)}
                      className={styles.checkbox}
                    />
                    <div className={styles.eventIcon}>
                      <Icon
                        name={event.type === "diamond" ? "sun" : "moon"}
                        size={32}
                        className={
                          event.type === "diamond"
                            ? "text-orange-500"
                            : "text-blue-500"
                        }
                      />
                    </div>
                    <div className={styles.eventInfo}>
                      <div className={styles.eventTitle}>
                        {event.type === "diamond"
                          ? "ダイヤモンド富士"
                          : "パール富士"}
                        {event.subType === "sunrise" ||
                        event.subType === "rising"
                          ? " (日の出)"
                          : " (日の入り)"}
                      </div>
                      <div className={styles.eventDate}>
                        {formatEventDate(event.time)}{" "}
                        {formatEventTime(event.time)}
                      </div>
                      <div className={styles.eventLocation}>
                        <Icon name="mapPin" size={14} className="inline mr-1" />{" "}
                        {event.locationName}
                      </div>
                    </div>
                    <div className={styles.eventActions}>
                      <button
                        className={styles.viewDetailButton}
                        onClick={() => handleViewEventDetail(event)}
                        title="詳細を見る"
                      >
                        <Icon
                          name="calendar"
                          size={14}
                          className="inline mr-1"
                        />{" "}
                        詳細を見る
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeEventFromFavorites(event.id)}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "past" && (
            <div className={styles.eventsList}>
              {pastEvents.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>過去のお気に入りイベントはありません</p>
                </div>
              ) : (
                pastEvents.map((event) => (
                  <div key={event.id} className={styles.eventItem}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(`event-${event.id}`)}
                      onChange={() => handleSelectItem(`event-${event.id}`)}
                      className={styles.checkbox}
                    />
                    <div className={styles.eventIcon}>
                      <Icon
                        name={event.type === "diamond" ? "sun" : "moon"}
                        size={32}
                        className={
                          event.type === "diamond"
                            ? "text-orange-500"
                            : "text-blue-500"
                        }
                      />
                    </div>
                    <div className={styles.eventInfo}>
                      <div className={styles.eventTitle}>
                        {event.type === "diamond"
                          ? "ダイヤモンド富士"
                          : "パール富士"}
                        {event.subType === "sunrise" ||
                        event.subType === "rising"
                          ? " (日の出)"
                          : " (日の入り)"}
                      </div>
                      <div className={styles.eventDate}>
                        {formatEventDate(event.time)}{" "}
                        {formatEventTime(event.time)}
                      </div>
                      <div className={styles.eventLocation}>
                        <Icon name="mapPin" size={14} className="inline mr-1" />{" "}
                        {event.locationName}
                      </div>
                    </div>
                    <div className={styles.eventActions}>
                      <button
                        className={styles.viewDetailButton}
                        onClick={() => handleViewEventDetail(event)}
                        title="詳細を見る"
                      >
                        <Icon
                          name="calendar"
                          size={14}
                          className="inline mr-1"
                        />{" "}
                        詳細を見る
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeEventFromFavorites(event.id)}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "locations" && (
            <div className={styles.locationsList}>
              {favoriteLocations.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>お気に入り地点はありません</p>
                </div>
              ) : (
                favoriteLocations.map((location) => (
                  <div key={location.id} className={styles.locationItem}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(`location-${location.id}`)}
                      onChange={() =>
                        handleSelectItem(`location-${location.id}`)
                      }
                      className={styles.checkbox}
                    />
                    <div className={styles.locationInfo}>
                      <div className={styles.locationName}>
                        <Icon name="star" size={16} className="inline mr-1" />{" "}
                        {location.name}
                      </div>
                      <div className={styles.locationPrefecture}>
                        <Icon name="mapPin" size={14} className="inline mr-1" />{" "}
                        {location.prefecture}
                      </div>
                      <div className={styles.locationCoords}>
                        座標: {location.latitude.toFixed(4)},{" "}
                        {location.longitude.toFixed(4)}
                      </div>
                      <div className={styles.locationAdded}>
                        追加日:{" "}
                        {new Date(location.addedAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <div className={styles.locationActions}>
                      <button
                        className={styles.viewDetailButton}
                        onClick={() => handleViewLocationDetail(location)}
                        title="詳細を見る"
                      >
                        <Icon name="map" size={14} className="inline mr-1" />{" "}
                        詳細を見る
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeLocationFromFavorites(location.id)}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* インポートダイアログ */}
        {showImportDialog && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>お気に入りデータのインポート</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowImportDialog(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.importSection}>
                  <label htmlFor="import-file" className={styles.label}>
                    ファイルから読み込み:
                  </label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className={styles.fileInput}
                  />
                </div>
                <div className={styles.importSection}>
                  <label htmlFor="import-text" className={styles.label}>
                    または JSON データを直接入力:
                  </label>
                  <textarea
                    id="import-text"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="JSON データをここに貼り付けてください..."
                    className={styles.importTextarea}
                    rows={10}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowImportDialog(false)}
                >
                  キャンセル
                </button>
                <button
                  className={styles.importButton}
                  onClick={handleImport}
                  disabled={!importData.trim()}
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
