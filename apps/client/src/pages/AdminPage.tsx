import React, { useState, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Location } from "@fuji-calendar/types";
import { Icon } from "@fuji-calendar/ui";
import { authService } from "../services/authService";
import QueueManager from "../components/admin/QueueManager";
import SystemSettingsManager from "../components/admin/SystemSettingsManager";
import AdminLayout from "../components/admin/AdminLayout";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import Dashboard from "../components/admin/Dashboard";
import LocationManager from "../components/admin/LocationManager";
import LocationFormModal from "../components/admin/LocationFormModal";
import PasswordChangeModal from "../components/admin/PasswordChangeModal";
import Placeholder from "../components/admin/Placeholder";

// Types
interface LocationFormData {
  name: string;
  prefecture: string;
  latitude: number | "";
  longitude: number | "";
  elevation: number | "";
  description: string;
  accessInfo: string;
  parkingInfo: string;
  // 富士山関連（任意入力）
  fujiAzimuth: number | "";
  fujiElevation: number | "";
  fujiDistance: number | "";
  measurementNotes: string;
}

const initialFormData: LocationFormData = {
  name: "",
  prefecture: "",
  latitude: "",
  longitude: "",
  elevation: "",
  description: "",
  accessInfo: "",
  parkingInfo: "",
  // 富士山関連（任意入力）
  fujiAzimuth: "",
  fujiElevation: "",
  fujiDistance: "",
  measurementNotes: "",
};


// Main Admin Page Component
const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrefecture, setFilterPrefecture] = useState("");
  const [activeView, setActiveView] = useState<
    | "dashboard"
    | "locations"
    | "events"
    | "queue"
    | "users"
    | "data"
    | "settings"
  >("dashboard");
  const [queueStats, setQueueStats] = useState<any>(null);

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Check authentication and load locations on mount
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const authState = authService.getAuthState();
      // Debug: Auth state check

      if (!authState.isAuthenticated) {
        navigate("/admin/login");
        return;
      }

      // Verify token
      const verifyResult = await authService.verifyToken();
      console.log("トークン検証結果:", verifyResult);

      if (!verifyResult.success) {
        console.log("トークン検証失敗、ログインページにリダイレクト");
        navigate("/admin/login");
        return;
      }

      // Load locations if authenticated
      loadLocations();
    };

    checkAuthAndLoadData();
  }, [navigate]);

  // キュー統計を取得
  useEffect(() => {
    const fetchQueueStats = async () => {
      try {
        const response = await authService.authenticatedFetch(
          "/api/admin/queue/stats",
        );
        if (response.ok) {
          const data = await response.json();
          setQueueStats(data);
        }
      } catch (error) {
        console.error("キュー統計取得エラー:", error);
        setQueueStats(null);
      }
    };

    // ダッシュボード表示時のみ統計を取得
    if (activeView === "dashboard") {
      fetchQueueStats();
      // 5 秒間隔で更新
      const interval = setInterval(fetchQueueStats, 5000);
      return () => clearInterval(interval);
    }
  }, [activeView]);


  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("新しいパスワードが一致しません。");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("新しいパスワードは 6 文字以上で入力してください。");
      return;
    }

    try {
      setLoading(true);
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );

      if (result.success) {
        alert(result.message);
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Password change error:", error);
      alert("パスワード変更中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error("API response format error:", data);
          setLocations([]);
        }
      } else {
        console.error("Failed to load locations:", response.status);
        setLocations([]);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
      setLocations([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingLocation
        ? `/api/admin/locations/${editingLocation.id}`
        : "/api/admin/locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadLocations();
        resetForm();
        // React の状態更新を同期的に実行し、適切な状態管理を行う
        flushSync(() => {
          setShowLocationForm(false);
          setActiveView("locations");
        });
      } else if (response.status === 401) {
        navigate("/admin/login");
      } else {
        const errorData = await response.text();
        console.error(
          "地点保存エラー:",
          response.status,
          response.statusText,
          errorData,
        );
      }
    } catch (error) {
      console.error("地点保存エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`「${location.name}」を削除しますか？`)) return;

    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: "DELETE",
        headers: {
          ...authService.getAuthHeaders(),
        },
        credentials: "include",
      });

      if (response.ok) {
        await loadLocations();
        // 削除後は撮影地点管理画面に留まる
        setActiveView("locations");
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (error) {
      console.error("Failed to delete location:", error);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      prefecture: location.prefecture,
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
      description: location.description || "",
      accessInfo: location.accessInfo || "",
      parkingInfo: location.parkingInfo || "",
      // 富士山関連（既存値または空文字）
      fujiAzimuth: location.fujiAzimuth || "",
      fujiElevation: location.fujiElevation || "",
      fujiDistance: location.fujiDistance || "",
      measurementNotes: "", // 新規フィールドなので空文字
    });
    setShowLocationForm(true);
  };

  const handleRecalculate = async (location: Location) => {
    if (
      !confirm(
        `「${location.name}」の 2025 年データを再計算しますか？\n\n 処理に時間がかかる場合があります。`,
      )
    )
      return;

    try {
      setLoading(true);
      const response = await authService.authenticatedFetch(
        "/api/admin/queue/recalculate-location",
        {
          method: "POST",
          body: JSON.stringify({
            locationId: location.id,
            startYear: 2025,
            endYear: 2025,
            priority: "high",
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `再計算ジョブを追加しました！\n\n ジョブ ID: ${data.jobId}\n\n キュー管理画面で進行状況を確認できます。`,
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "再計算ジョブの追加に失敗しました",
        );
      }
    } catch (error) {
      console.error("再計算エラー:", error);
      alert(
        `再計算中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingLocation(null);
  };

  const handleFormDataChange = (
    field: keyof LocationFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  const handleExportLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/locations/export", {
        method: "GET",
        headers: {
          ...authService.getAuthHeaders(),
        },
        credentials: "include",
      });

      if (response.status === 401) {
        authService.clearAuth();
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("エクスポートに失敗しました");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `locations_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("エクスポートエラー:", error);
      alert("エクスポートに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleImportLocations = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("無効なファイル形式です。配列形式の JSON が必要です。");
      }

      const response = await fetch("/api/admin/locations/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        // 認証エラーの場合はログインページにリダイレクト
        authService.clearAuth();
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: インポートに失敗しました`,
        );
      }

      const result = await response.json();

      if (result.success) {
        const { createdCount, updatedCount, errorCount } = result.summary;
        let message = `インポートが完了しました。
`;
        message += `新規作成: ${createdCount}件
`;
        message += `更新: ${updatedCount}件
`;
        if (errorCount > 0) {
          message += `エラー: ${errorCount}件`;
        }
        alert(message);
        await loadLocations(); // リストを更新
        // インポート後は撮影地点管理画面に留まる
        setActiveView("locations");
      } else {
        throw new Error(result.message || "インポートに失敗しました");
      }
    } catch (error) {
      console.error("インポートエラー:", error);
      alert(
        `インポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setLoading(false);
      // ファイル入力をリセット
      event.target.value = "";
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    if (!Array.isArray(locations)) {
      return {
        totalLocations: 0,
        prefectures: 0,
        avgDistance: "0.0",
        recentAdditions: 0,
      };
    }

    const totalLocations = locations.length;
    const prefectures = new Set(locations.map((l) => l.prefecture)).size;
    const avgDistance =
      locations.length > 0
        ? locations.reduce((sum, l) => sum + (l.fujiDistance || 0), 0) /
          locations.length /
          1000
        : 0;

    return {
      totalLocations,
      prefectures,
      avgDistance: avgDistance.toFixed(1),
      recentAdditions: locations.filter((l) => {
        const createdAt = new Date(l.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length,
    };
  }, [locations]);


  return (
    <AdminLayout>
      <AdminHeader onPasswordChangeClick={() => setShowPasswordModal(true)} />
      
      <div className="flex">
        <AdminSidebar 
          activeView={activeView} 
          onViewChange={setActiveView} 
        />

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Dashboard View */}
          {activeView === "dashboard" && (
            <Dashboard stats={stats} queueStats={queueStats} />
          )}

          {/* Locations View */}
          {activeView === "locations" && (
            <LocationManager
              locations={locations}
              searchTerm={searchTerm}
              filterPrefecture={filterPrefecture}
              loading={loading}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterPrefecture}
              onAddLocation={() => {
                resetForm();
                setShowLocationForm(true);
              }}
              onEditLocation={handleEdit}
              onDeleteLocation={handleDelete}
              onRecalculateLocation={handleRecalculate}
              onExportLocations={handleExportLocations}
              onImportLocations={handleImportLocations}
            />
          )}

          {/* Data Management View */}
          {activeView === "data" && (
            <Placeholder 
              title="データ管理" 
              description="システムデータの管理を行います"
              iconName="data"
            />
          )}

          {/* Settings View */}
          {activeView === "settings" && (
            <div className="space-y-6">
              <SystemSettingsManager />

              {/* キュー管理セクション */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    バックグラウンド処理管理
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    データ再計算とキュー管理を統合して行います
                  </p>
                </div>
                <div className="p-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex">
                      <Icon
                        name="info"
                        size={20}
                        className="text-blue-600 mt-0.5 mr-3"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">
                          キュー管理について
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          データ再計算、キュー統計、失敗したジョブの管理を専用画面で行えます。重い処理は自動的にバックグラウンドで実行されます。
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveView("queue")}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Icon name="settings" size={16} className="mr-2" />
                    キュー管理を開く
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Queue Management View */}
          {activeView === "queue" && (
            <div>
              <QueueManager />
            </div>
          )}



          {/* Other views placeholder */}
          {activeView !== "dashboard" &&
            activeView !== "locations" &&
            activeView !== "data" &&
            activeView !== "settings" &&
            activeView !== "queue" && (
              <Placeholder title={activeView} />
            )}
        </div>
      </div>

      {/* Location Form Modal */}
      <LocationFormModal
        isOpen={showLocationForm}
        editingLocation={editingLocation}
        formData={formData}
        loading={loading}
        onClose={() => {
          resetForm();
          setShowLocationForm(false);
        }}
        onSubmit={handleSubmit}
        onFormDataChange={handleFormDataChange}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        passwordForm={passwordForm}
        loading={loading}
        onClose={() => setShowPasswordModal(false)}
        onPasswordFormChange={setPasswordForm}
        onSubmit={handlePasswordChange}
      />
    </AdminLayout>
  );
};

export default AdminPage;
