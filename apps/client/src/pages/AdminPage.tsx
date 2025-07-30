import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Location } from '@fuji-calendar/types';
import { APP_CONFIG } from '@fuji-calendar/shared';
import LocationPicker from '../components/LocationPicker';
import { Icon } from '../components/icons/IconMap';
import { authService } from '../services/authService';

// Types
interface LocationFormData {
  name: string;
  prefecture: string;
  latitude: number | '';
  longitude: number | '';
  elevation: number | '';
  description: string;
  accessInfo: string;
  parkingInfo: string;
}

const initialFormData: LocationFormData = {
  name: '',
  prefecture: '',
  latitude: '',
  longitude: '',
  elevation: '',
  description: '',
  accessInfo: '',
  parkingInfo: ''
};

// Sidebar Item Component
interface SidebarItemProps {
  icon: keyof typeof import('../components/icons/IconMap').iconMap;
  label: string;
  subLabel?: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, subLabel, active, onClick }) => (
  <div className="px-2">
    <button
      onClick={onClick}
      className={`w-full px-3 py-3 flex items-center space-x-3 text-left transition-all duration-200 rounded-lg ${
        active 
          ? 'bg-blue-50 text-blue-900 border border-blue-200' 
          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
      }`}
    >
      <Icon name={icon} size={20} className={active ? 'text-blue-600' : 'text-gray-400'} />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {subLabel && <p className="text-xs text-gray-500">{subLabel}</p>}
      </div>
    </button>
  </div>
);

// Main Admin Page Component
const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrefecture, setFilterPrefecture] = useState('');
  const [activeView, setActiveView] = useState<'dashboard' | 'locations' | 'events' | 'queue' | 'users' | 'data' | 'settings'>('dashboard');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Check authentication and load locations on mount
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const authState = authService.getAuthState();
      if (!authState.isAuthenticated) {
        navigate('/admin/login');
        return;
      }

      // Verify token
      const verifyResult = await authService.verifyToken();
      if (!verifyResult.success) {
        navigate('/admin/login');
        return;
      }

      // Load locations if authenticated
      loadLocations();
    };

    checkAuthAndLoadData();
  }, [navigate]);

  // Handle click outside of user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && !(event.target as HTMLElement).closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('新しいパスワードが一致しません。');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('新しいパスワードは 6 文字以上で入力してください。');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        alert(result.message);
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Password change error:', error);
      alert('パスワード変更中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error('API response format error:', data);
          setLocations([]);
        }
      } else {
        console.error('Failed to load locations:', response.status);
        setLocations([]);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      setLocations([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingLocation ? `/api/admin/locations/${editingLocation.id}` : '/api/admin/locations';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadLocations();
        resetForm();
        setShowLocationForm(false);
      } else if (response.status === 401) {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`「${location.name}」を削除しますか？`)) return;

    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadLocations();
      } else if (response.status === 401) {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
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
      description: location.description || '',
      accessInfo: location.accessInfo || '',
      parkingInfo: location.parkingInfo || ''
    });
    setShowLocationForm(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingLocation(null);
  };

  const handleFormDataChange = (field: keyof LocationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setShowLocationPicker(false);
  };

  const handleExportLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/locations/export', {
        method: 'GET',
        headers: {
          ...authService.getAuthHeaders()
        },
        credentials: 'include'
      });

      if (response.status === 401) {
        authService.clearAuth();
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locations_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleImportLocations = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('無効なファイル形式です。配列形式の JSON が必要です。');
      }

      const response = await fetch('/api/admin/locations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.status === 401) {
        // 認証エラーの場合はログインページにリダイレクト
        authService.clearAuth();
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: インポートに失敗しました`);
      }

      const result = await response.json();
      
      if (result.success) {
        const { importedCount, skippedCount, errorCount } = result.summary;
        let message = `インポートが完了しました。\n`;
        message += `新規追加: ${importedCount}件\n`;
        message += `重複スキップ: ${skippedCount}件\n`;
        if (errorCount > 0) {
          message += `エラー: ${errorCount}件`;
        }
        alert(message);
        await loadLocations(); // リストを更新
      } else {
        throw new Error(result.message || 'インポートに失敗しました');
      }
    } catch (error) {
      console.error('インポートエラー:', error);
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
      // ファイル入力をリセット
      event.target.value = '';
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    if (!Array.isArray(locations)) {
      return {
        totalLocations: 0,
        prefectures: 0,
        avgDistance: '0.0',
        recentAdditions: 0
      };
    }

    const totalLocations = locations.length;
    const prefectures = new Set(locations.map(l => l.prefecture)).size;
    const avgDistance = locations.length > 0 
      ? (locations.reduce((sum, l) => sum + (l.fujiDistance || 0), 0) / locations.length / 1000)
      : 0;
    
    return {
      totalLocations,
      prefectures,
      avgDistance: avgDistance.toFixed(1),
      recentAdditions: locations.filter(l => {
        const createdAt = new Date(l.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
      }).length
    };
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    if (!Array.isArray(locations)) {
      return [];
    }
    return locations.filter(location => {
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrefecture = !filterPrefecture || location.prefecture === filterPrefecture;
      return matchesSearch && matchesPrefecture;
    });
  }, [locations, searchTerm, filterPrefecture]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="pt-1 ml-52">
            <h1 className="text-lg font-bold text-gray-900">管理画面</h1>
          </div>
          <div className="relative mr-64 user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="users" size={16} className="text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">admin</div>
                <div className="text-xs text-gray-500">スーパー管理者</div>
              </div>
              <Icon name="chevronDown" size={16} className="text-gray-400 ml-1" />
            </button>
            
            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">admin</p>
                    <p className="text-xs text-gray-500">スーパー管理者</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Icon name="key" size={16} className="text-gray-400" />
                    <span>パスワード変更</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Icon name="logout" size={16} className="text-gray-400" />
                    <span>ログアウト</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          {/* Menu Header */}
          <div className="px-4 py-3">
            <p className="text-base font-semibold text-gray-600">管理メニュー</p>
          </div>

          {/* Navigation Items */}
          <nav className="px-2 py-4 space-y-1">
            <SidebarItem
              icon="dashboard"
              label="ダッシュボード"
              subLabel="概要とシステム状況"
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
            />
            <SidebarItem
              icon="location"
              label="撮影地点管理"
              subLabel="地点の登録・編集・削除"
              active={activeView === 'locations'}
              onClick={() => setActiveView('locations')}
            />
            <SidebarItem
              icon="queue"
              label="キュー管理"
              subLabel="計算ジョブの監視"
              active={activeView === 'queue'}
              onClick={() => setActiveView('queue')}
            />
            <SidebarItem
              icon="calendar"
              label="カレンダー確認"
              subLabel="撮影候補の確認"
              active={activeView === 'events'}
              onClick={() => setActiveView('events')}
            />
            <SidebarItem
              icon="data"
              label="データ管理"
              subLabel="システムデータの管理"
              active={activeView === 'data'}
              onClick={() => setActiveView('data')}
            />
            <SidebarItem
              icon="users"
              label="ユーザー管理"
              subLabel="管理者アカウント管理"
              active={activeView === 'users'}
              onClick={() => setActiveView('users')}
            />
            <SidebarItem
              icon="settings"
              label="システム設定"
              subLabel="アプリケーション設定"
              active={activeView === 'settings'}
              onClick={() => setActiveView('settings')}
            />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="pt-2">
                <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
                <p className="text-gray-600 mt-1">システム全体の状況を確認できます</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center mr-3">
                      <Icon name="location" size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">総撮影地点数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalLocations}</p>
                      <p className="text-xs text-gray-500">有効: 0 件, 制限: 0 件</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center mr-3">
                      <Icon name="queue" size={24} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">計算キュー</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500">処理中: 0 件, 完了: 0 件</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center mr-3">
                      <Icon name="clock" size={24} className="text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">イベントキュー</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500">待機: 0 件, 処理中: 0 件</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center mr-3">
                      <Icon name="users" size={24} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">管理者数</p>
                      <p className="text-2xl font-bold text-gray-900">1</p>
                      <p className="text-xs text-gray-500">スーパー管理者: 1 人</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Queue System */}
                <div>
                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    {/* タイトル */}
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 flex items-center justify-center mr-3">
                        <Icon name="server" size={20} className="text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">キューシステム状況</h2>
                    </div>
                    {/* 撮影計算キュー */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-medium text-gray-900">撮影計算キュー</h3>
                        <div className="text-sm text-gray-500">0 件 処理予定</div>
                      </div>
                      <div className="grid grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-sm text-orange-600">0</div>
                          <div className="text-xs text-gray-500">待機</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-blue-600">0</div>
                          <div className="text-xs text-gray-500">処理中</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-green-600">0</div>
                          <div className="text-xs text-gray-500">完了</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-red-600">0</div>
                          <div className="text-xs text-gray-500">失敗</div>
                        </div>
                      </div>
                    </div>

                    {/* 地点イベントキュー */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-medium text-gray-900">地点イベントキュー</h3>
                        <div className="text-sm text-gray-500">0 件 処理予定</div>
                      </div>
                      <div className="grid grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-sm text-orange-600">0</div>
                          <div className="text-xs text-gray-500">待機</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-blue-600">0</div>
                          <div className="text-xs text-gray-500">処理中</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-green-600">0</div>
                          <div className="text-xs text-gray-500">完了</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-red-600">0</div>
                          <div className="text-xs text-gray-500">失敗</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - System Info */}
                <div>
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 space-y-4">
                      {/* タイトル */}
                      <div className="flex items-center mb-6">
                        <div className="w-8 h-8 flex items-center justify-center mr-3">
                          <Icon name="data" size={20} className="text-green-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">システム情報</h2>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">アプリケーション</span>
                        <span className="text-sm text-gray-900 font-medium">{APP_CONFIG.NAME} v{APP_CONFIG.VERSION}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">環境</span>
                        <span className="text-sm text-gray-900">開発環境</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">認証システム</span>
                        <div className="flex items-center space-x-1">
                          <Icon name="checkCircle" size={14} className="text-green-600" />
                          <span className="text-xs text-green-600">正常稼働</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">キューシステム</span>
                        <div className="flex items-center space-x-1">
                          <Icon name="checkCircle" size={14} className="text-green-600" />
                          <span className="text-xs text-green-600">正常稼働</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-8">
                <p className="text-xs text-gray-500">
                  最終更新: {new Date().toLocaleString('ja-JP', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false 
                  }).replace(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1/$2/$3 $4:$5:$6')}
                </p>
              </div>
            </div>
          )}

          {/* Locations View */}
          {activeView === 'locations' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">撮影地点管理</h1>
                  <p className="text-gray-600 mt-1">撮影地点の追加・編集・削除を行います</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleExportLocations}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Icon name="download" size={16} color="white" />
                    <span>エクスポート</span>
                  </button>
                  <button
                    onClick={() => document.getElementById('import-file')?.click()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-2"
                  >
                    <Icon name="upload" size={16} color="white" />
                    <span>インポート</span>
                  </button>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleImportLocations}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      resetForm();
                      setShowLocationForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Icon name="add" size={16} color="white" />
                    <span>新規地点追加</span>
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">地点を検索</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="地点名で検索..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">都道府県で絞り込み</label>
                    <select
                      value={filterPrefecture}
                      onChange={(e) => setFilterPrefecture(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">すべて</option>
                      <option value="静岡県">静岡県</option>
                      <option value="山梨県">山梨県</option>
                      <option value="神奈川県">神奈川県</option>
                      <option value="東京都">東京都</option>
                      <option value="千葉県">千葉県</option>
                      <option value="埼玉県">埼玉県</option>
                      <option value="長野県">長野県</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location List */}
              {filteredLocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
                  <div className="mb-4 opacity-20">
                    <Icon name="location" size={96} className="mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">地点が見つかりません</h3>
                  <p className="text-gray-500">検索条件を変更するか、新しい地点を追加してください。</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地点名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">都道府県</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">座標</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">標高</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">富士山距離</th>
                        <th className="relative px-6 py-3"><span className="sr-only">操作</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLocations.map((location) => (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            {location.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{location.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {location.prefecture}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.elevation}m
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {((location.fujiDistance || 0) / 1000).toFixed(1)}km
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(location)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(location)}
                              className="text-red-600 hover:text-red-900"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Data Management View */}
          {activeView === 'data' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">データ管理</h1>
                <p className="text-gray-600 mt-1">システムデータの管理を行います</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
                <div className="mb-4 opacity-20">
                  <Icon name="data" size={96} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">準備中</h3>
                <p className="text-gray-500">この機能は近日公開予定です</p>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeView === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
                <p className="text-gray-600 mt-1">アプリケーションの設定を管理します</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
                <div className="mb-4 opacity-20">
                  <Icon name="settings" size={96} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">準備中</h3>
                <p className="text-gray-500">この機能は近日公開予定です</p>
              </div>
            </div>
          )}

          {/* Other views placeholder */}
          {activeView !== 'dashboard' && activeView !== 'locations' && activeView !== 'data' && activeView !== 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeView}</h1>
                <p className="text-gray-600 mt-1">この機能は現在開発中です</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
                <div className="mb-4 opacity-20">
                  <Icon name="settings" size={96} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">準備中</h3>
                <p className="text-gray-500">この機能は近日公開予定です</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Form Modal */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="border-b border-gray-200 px-6 py-4 -m-5 mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLocation ? '地点編集' : '新規地点追加'}
              </h2>
            </div>
            <div className="px-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      地点名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormDataChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: 竜ヶ岳"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      都道府県 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.prefecture}
                      onChange={(e) => handleFormDataChange('prefecture', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">選択してください</option>
                      <option value="静岡県">静岡県</option>
                      <option value="山梨県">山梨県</option>
                      <option value="神奈川県">神奈川県</option>
                      <option value="東京都">東京都</option>
                      <option value="千葉県">千葉県</option>
                      <option value="埼玉県">埼玉県</option>
                      <option value="長野県">長野県</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      緯度 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.latitude === '' ? '' : formData.latitude}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFormDataChange('latitude', value === '' ? '' : parseFloat(value));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="35.123456"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      経度 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.longitude === '' ? '' : formData.longitude}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFormDataChange('longitude', value === '' ? '' : parseFloat(value));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="138.123456"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      標高 (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.elevation === '' ? '' : formData.elevation}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFormDataChange('elevation', value === '' ? '' : parseFloat(value));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1000.5"
                      required
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Icon name="map" size={16} color="white" />
                    <span>地図から座標を選択</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormDataChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="地点の特徴や撮影時の注意点など"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">アクセス情報</label>
                    <textarea
                      value={formData.accessInfo}
                      onChange={(e) => handleFormDataChange('accessInfo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="最寄り駅、バス停、道路からのアクセス方法など"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">駐車場情報</label>
                    <textarea
                      value={formData.parkingInfo}
                      onChange={(e) => handleFormDataChange('parkingInfo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="駐車場の有無、台数、料金など"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowLocationForm(false);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '保存中...' : (editingLocation ? '更新' : '追加')}
                  </button>
                </div>
              </form>

              {showLocationPicker && (
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLat={formData.latitude as number || 35.3606}
                  initialLng={formData.longitude as number || 138.7274}
                  onClose={() => setShowLocationPicker(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">パスワード変更</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在のパスワード
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="現在のパスワードを入力"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="6 文字以上で入力"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="もう一度入力してください"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={handlePasswordChange}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '変更中...' : '変更する'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;