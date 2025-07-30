import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Location } from '../../shared/types';
import LocationPicker from '../components/LocationPicker';

// LocationForm コンポーネント
interface LocationFormProps {
  formData: LocationFormData;
  editingLocation: Location | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: (updates: Partial<LocationFormData>) => void;
  onReset: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ 
  formData, 
  editingLocation, 
  loading, 
  onSubmit, 
  onFormDataChange, 
  onReset 
}) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    onFormDataChange({ latitude: lat, longitude: lng });
    setShowLocationPicker(false);
  };

  const handleInputChange = (field: keyof LocationFormData, value: string | number) => {
    onFormDataChange({ [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {editingLocation ? '地点編集' : '新規地点追加'}
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              地点名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onChange={(e) => handleInputChange('prefecture', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                handleInputChange('latitude', value === '' ? '' : parseFloat(value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                handleInputChange('longitude', value === '' ? '' : parseFloat(value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                handleInputChange('elevation', value === '' ? '' : parseFloat(value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000.5"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowLocationPicker(true)}
            className="mb-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📍 地図から座標を選択
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="地点の特徴や撮影時の注意点など"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アクセス情報
          </label>
          <textarea
            value={formData.accessInfo}
            onChange={(e) => handleInputChange('accessInfo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="最寄り駅、バス停、道路からのアクセス方法など"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            駐車場情報
          </label>
          <textarea
            value={formData.parkingInfo}
            onChange={(e) => handleInputChange('parkingInfo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="駐車場の有無、台数、料金など"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : (editingLocation ? '更新' : '追加')}
          </button>
          
          {editingLocation && (
            <button
              type="button"
              onClick={onReset}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              キャンセル
            </button>
          )}
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
  );
};

// LocationFilters コンポーネント
interface LocationFiltersProps {
  searchTerm: string;
  filterPrefecture: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onPrefectureChange: (value: string) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

const LocationFilters: React.FC<LocationFiltersProps> = ({
  searchTerm,
  filterPrefecture,
  sortBy,
  sortOrder,
  onSearchChange,
  onPrefectureChange,
  onSortChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            地点名検索
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="地点名で検索"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            都道府県
          </label>
          <select
            value={filterPrefecture}
            onChange={(e) => onPrefectureChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全て</option>
            <option value="静岡県">静岡県</option>
            <option value="山梨県">山梨県</option>
            <option value="神奈川県">神奈川県</option>
            <option value="東京都">東京都</option>
            <option value="千葉県">千葉県</option>
            <option value="埼玉県">埼玉県</option>
            <option value="長野県">長野県</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ソート項目
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortOrder)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">地点名</option>
            <option value="prefecture">都道府県</option>
            <option value="elevation">標高</option>
            <option value="createdAt">登録日</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ソート順
          </label>
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(sortBy, e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// LocationTable コンポーネント
interface LocationTableProps {
  locations: Location[];
  onEdit: (location: Location) => void;
  onDelete: (id: number) => void;
  onLocationSelect: (location: Location) => void;
}

const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  onEdit,
  onDelete,
  onLocationSelect
}) => {
  if (locations.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
        地点が登録されていません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                地点名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                都道府県
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                座標
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                標高
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map((location) => (
              <tr key={location.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onLocationSelect(location)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {location.name}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {location.prefecture}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {location.elevation}m
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit(location)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDelete(location.id)}
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
    </div>
  );
};

// Pagination コンポーネント
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        前へ
      </button>
      
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            page === currentPage
              ? 'text-white bg-blue-600 border border-blue-600'
              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        次へ
      </button>
    </div>
  );
};

interface LocationFormData {
  name: string;
  prefecture: string;
  latitude: number | '';
  longitude: number | '';
  elevation: number | '';
  description: string;
  accessInfo: string;
  warnings: string;
  parkingInfo: string;
  fujiAzimuth: number | '';
  fujiElevation: number | '';
  fujiDistance: number | '';
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    prefecture: '',
    latitude: '',
    longitude: '',
    elevation: '',
    description: '',
    accessInfo: '',
    warnings: '',
    parkingInfo: '',
    fujiAzimuth: '',
    fujiElevation: '',
    fujiDistance: ''
  });

  // フィルター・ソート・ページネーション状態
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrefecture, setFilterPrefecture] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // モーダル状態
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 認証チェック
  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        await fetchLocations();
      } else {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  // パスワード変更処理
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
        setError(null);
      } else {
        const data = await response.json();
        setError(data.message || 'パスワード変更に失敗しました');
      }
    } catch (error) {
      setError('パスワード変更中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 地点一覧取得
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        setError('地点一覧の取得に失敗しました');
      }
    } catch (error) {
      setError('地点一覧の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: '',
      prefecture: '',
      latitude: '',
      longitude: '',
      elevation: '',
      description: '',
      accessInfo: '',
      warnings: '',
      parkingInfo: '',
      fujiAzimuth: '',
      fujiElevation: '',
      fujiDistance: ''
    });
    setEditingLocation(null);
    setError(null);
  };

  // 地点保存・更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const url = editingLocation 
        ? `/api/admin/locations/${editingLocation.id}`
        : '/api/admin/locations';
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchLocations();
        resetForm();
        setError(null);
      } else {
        const data = await response.json();
        setError(data.message || '保存に失敗しました');
      }
    } catch (error) {
      setError('保存中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 地点削除処理
  const handleDelete = async (id: number) => {
    if (!confirm('この地点を削除しますか？')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/admin/locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchLocations();
        setError(null);
      } else {
        setError('削除に失敗しました');
      }
    } catch (error) {
      setError('削除中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 地点編集処理
  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      prefecture: location.prefecture,
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
      description: location.description || '',
      accessInfo: location.accessInfo || '',
      warnings: '',
      parkingInfo: location.parkingInfo || '',
      fujiAzimuth: location.fujiAzimuth || '',
      fujiElevation: location.fujiElevation || '',
      fujiDistance: location.fujiDistance || ''
    });
    setEditingLocation(location);
  };

  // エクスポート処理
  const handleExport = () => {
    const dataStr = JSON.stringify(locations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fuji-locations.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // インポート処理
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!Array.isArray(importedData)) {
          setError('不正なファイル形式です');
          return;
        }

        setLoading(true);
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch('/api/admin/locations/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ locations: importedData })
        });

        if (response.ok) {
          await fetchLocations();
          setError(null);
        } else {
          const data = await response.json();
          setError(data.message || 'インポートに失敗しました');
        }
      } catch (error) {
        setError('ファイルの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // 地点詳細表示
  const handleLocationSelect = (location: Location) => {
    navigate(`/location/${location.id}`);
  };

  // フィルタリングとソート
  const filteredAndSortedLocations = useMemo(() => {
    const filtered = locations.filter(location => {
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrefecture = !filterPrefecture || location.prefecture === filterPrefecture;
      return matchesSearch && matchesPrefecture;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'prefecture':
          aValue = a.prefecture;
          bValue = b.prefecture;
          break;
        case 'elevation':
          aValue = a.elevation;
          bValue = b.elevation;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [locations, searchTerm, filterPrefecture, sortBy, sortOrder]);

  // ページネーション
  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLocations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLocations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage);

  // フォームデータ更新ハンドラー
  const handleFormDataChange = (updates: Partial<LocationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // ソート変更ハンドラー
  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  // 初期化処理
  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLocations();
    }
  }, [isAuthenticated]);

  // 認証チェック中
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証時
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">認証が必要です</h1>
          <button
            onClick={() => navigate('/admin/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                パスワード変更
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                エクスポート
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                インポート
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* 地点追加・編集フォーム */}
          <LocationForm
            formData={formData}
            editingLocation={editingLocation}
            loading={loading}
            onSubmit={handleSubmit}
            onFormDataChange={handleFormDataChange}
            onReset={resetForm}
          />

          {/* フィルター・検索 */}
          <LocationFilters
            searchTerm={searchTerm}
            filterPrefecture={filterPrefecture}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onPrefectureChange={setFilterPrefecture}
            onSortChange={handleSortChange}
          />

          {/* 地点一覧テーブル */}
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                撮影地点一覧 ({filteredAndSortedLocations.length}件)
              </h2>
            </div>
            
            <LocationTable
              locations={paginatedLocations}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLocationSelect={handleLocationSelect}
            />

            {/* ページネーション */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </main>

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">パスワード変更</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <input
                type="password"
                placeholder="現在のパスワード"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="新しいパスワード"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="新しいパスワード（確認）"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '変更中...' : '変更'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
