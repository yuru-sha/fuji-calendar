import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Location } from '../../shared/types';
import LocationPicker from '../components/LocationPicker';
import styles from './AdminPage.module.css';

interface LocationFormData {
  name: string;
  prefecture: string;
  latitude: number | '';
  longitude: number | '';
  elevation: number | '';
  description: string;
  accessInfo: string;
  warnings: string;
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
    warnings: ''
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // 認証チェック
  const checkAuthentication = async () => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } catch (err) {
      console.error('Authentication check failed:', err);
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // ログアウト機能
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  // 撮影地点一覧を取得
  const fetchLocations = async () => {
    const token = localStorage.getItem('adminToken');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data);
        setError(null);
      } else {
        // エラーは表示しない（初期表示時は空リストで問題ない）
        console.error('Failed to fetch locations:', result.message);
      }
    } catch (err) {
      // ネットワークエラーも初期表示時は表示しない
      console.error('Error fetching locations:', err);
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
      warnings: ''
    });
    setEditingLocation(null);
  };

  // 撮影地点作成/更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.prefecture || 
        formData.latitude === '' || formData.longitude === '' || formData.elevation === '') {
      setError('必須フィールドを入力してください。');
      return;
    }

    const token = localStorage.getItem('adminToken');
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        name: formData.name,
        prefecture: formData.prefecture,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        elevation: Number(formData.elevation),
        description: formData.description || undefined,
        accessInfo: formData.accessInfo || undefined,
        warnings: formData.warnings || undefined
      };

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
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        await fetchLocations();
        resetForm();
        setError(null);
      } else {
        setError(result.message || '保存に失敗しました。');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました。');
      console.error('Error saving location:', err);
    } finally {
      setLoading(false);
    }
  };

  // 撮影地点削除
  const handleDelete = async (id: number) => {
    if (!confirm('この撮影地点を削除してもよろしいですか？')) {
      return;
    }

    const token = localStorage.getItem('adminToken');
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        await fetchLocations();
      } else {
        setError(result.message || '削除に失敗しました。');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました。');
      console.error('Error deleting location:', err);
    } finally {
      setLoading(false);
    }
  };

  // 編集開始
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
      warnings: location.warnings || ''
    });
  };

  // 地図から座標を選択
  const handleLocationSelect = async (lat: number, lng: number) => {
    console.log('=== handleLocationSelect called ===');
    console.log('Coordinates:', { lat, lng });
    
    // 初期値として座標のみ設定
    const newFormData: Partial<LocationFormData> = {
      latitude: lat,
      longitude: lng,
      elevation: formData.elevation || '',
      prefecture: formData.prefecture || '',
      name: formData.name || ''
    };
    
    // 標高と住所情報を取得
    try {
      // 標高を取得（国土地理院API）
      const elevationResponse = await fetch(
        `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`
      );
      const elevationData = await elevationResponse.json();
      console.log('Elevation data:', elevationData);
      
      if (elevationData.elevation !== '-----') {
        newFormData.elevation = Math.round(elevationData.elevation);
      }
      
      // 逆ジオコーディング（サーバー経由）
      const token = localStorage.getItem('adminToken');
      const geocodeResponse = await fetch('/api/admin/reverse-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat, lng })
      });
      
      if (geocodeResponse.ok) {
        const geocodeResult = await geocodeResponse.json();
        console.log('Full geocode response:', geocodeResult);
        
        if (geocodeResult.success && geocodeResult.data) {
          const { prefecture, city, address } = geocodeResult.data;
          
          console.log('Extracted data:', { prefecture, city, address });
          
          // 都道府県を自動設定
          if (prefecture) {
            console.log('Setting prefecture:', prefecture);
            newFormData.prefecture = prefecture;
          }
          
          // 地名の候補も同時に設定
          if (city && !formData.name) {
            const suggestedName = address 
              ? `${city}${address}` 
              : city;
            console.log('Setting suggested name:', suggestedName);
            newFormData.name = suggestedName;
          }
        } else {
          console.warn('No geocode data received or success=false');
        }
      } else {
        console.error('Geocode response not ok:', geocodeResponse.status);
      }
    } catch (error) {
      console.error('位置情報の取得に失敗しました:', error);
    }
    
    // 最後に一括で状態を更新
    console.log('Final form data to set:', newFormData);
    setFormData(prev => ({
      ...prev,
      ...newFormData,
      description: prev.description || '',
      accessInfo: prev.accessInfo || '',
      warnings: prev.warnings || ''
    }));
    
    setShowLocationPicker(false);
  };

  // 初期化
  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLocations();
    }
  }, [isAuthenticated]);

  // 認証チェック中の表示
  if (isCheckingAuth) {
    return (
      <div className={styles.adminPage}>
        <div className="card">
          <div className="loading">認証を確認中...</div>
        </div>
      </div>
    );
  }

  // 認証されていない場合は何も表示しない（リダイレクト済み）
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.adminPage}>
      <div className="card">
        <div className={styles.adminHeader}>
          <h2 className="card-title">撮影地点管理</h2>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
        
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>閉じる</button>
          </div>
        )}

        {/* 撮影地点フォーム */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h3>{editingLocation ? '撮影地点編集' : '📍 新しい撮影地点を追加'}</h3>
            {editingLocation && (
              <p className={styles.sectionSubtitle}>
                「{editingLocation.name}」の情報を編集しています
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className={styles.locationForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="name">地点名 *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例: 大台ヶ原(日出ヶ岳)"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="prefecture">都道府県 *</label>
                <select
                  id="prefecture"
                  value={formData.prefecture}
                  onChange={(e) => setFormData(prev => ({ ...prev, prefecture: e.target.value }))}
                  required
                >
                  <option value="">都道府県を選択</option>
                  <option value="北海道">北海道</option>
                  <option value="青森県">青森県</option>
                  <option value="岩手県">岩手県</option>
                  <option value="宮城県">宮城県</option>
                  <option value="秋田県">秋田県</option>
                  <option value="山形県">山形県</option>
                  <option value="福島県">福島県</option>
                  <option value="茨城県">茨城県</option>
                  <option value="栃木県">栃木県</option>
                  <option value="群馬県">群馬県</option>
                  <option value="埼玉県">埼玉県</option>
                  <option value="千葉県">千葉県</option>
                  <option value="東京都">東京都</option>
                  <option value="神奈川県">神奈川県</option>
                  <option value="新潟県">新潟県</option>
                  <option value="富山県">富山県</option>
                  <option value="石川県">石川県</option>
                  <option value="福井県">福井県</option>
                  <option value="山梨県">山梨県</option>
                  <option value="長野県">長野県</option>
                  <option value="岐阜県">岐阜県</option>
                  <option value="静岡県">静岡県</option>
                  <option value="愛知県">愛知県</option>
                  <option value="三重県">三重県</option>
                  <option value="滋賀県">滋賀県</option>
                  <option value="京都府">京都府</option>
                  <option value="大阪府">大阪府</option>
                  <option value="兵庫県">兵庫県</option>
                  <option value="奈良県">奈良県</option>
                  <option value="和歌山県">和歌山県</option>
                  <option value="鳥取県">鳥取県</option>
                  <option value="島根県">島根県</option>
                  <option value="岡山県">岡山県</option>
                  <option value="広島県">広島県</option>
                  <option value="山口県">山口県</option>
                  <option value="徳島県">徳島県</option>
                  <option value="香川県">香川県</option>
                  <option value="愛媛県">愛媛県</option>
                  <option value="高知県">高知県</option>
                  <option value="福岡県">福岡県</option>
                  <option value="佐賀県">佐賀県</option>
                  <option value="長崎県">長崎県</option>
                  <option value="熊本県">熊本県</option>
                  <option value="大分県">大分県</option>
                  <option value="宮崎県">宮崎県</option>
                  <option value="鹿児島県">鹿児島県</option>
                  <option value="沖縄県">沖縄県</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="latitude">緯度 *</label>
                <input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="例: 35.3606"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="longitude">経度 *</label>
                <input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="例: 138.7274"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="elevation">標高 (m) *</label>
                <input
                  id="elevation"
                  type="number"
                  value={formData.elevation}
                  onChange={(e) => setFormData(prev => ({ ...prev, elevation: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="例: 1695"
                  required
                />
              </div>
            </div>

            <div className={styles.mapHelper}>
              <button 
                type="button" 
                onClick={() => setShowLocationPicker(true)} 
                className={styles.mapButton}
                title="地図上で場所を選択して座標を取得します"
              >
                🗺️ 地図から座標を選択
              </button>
              <p className={styles.helperText}>
                ※ 地図上をクリックまたはマーカーをドラッグして場所を選択できます。標高は自動取得されます。
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">説明</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="撮影地点の説明や特徴"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="accessInfo">アクセス情報</label>
              <textarea
                id="accessInfo"
                value={formData.accessInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, accessInfo: e.target.value }))}
                placeholder="アクセス方法や交通手段"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="warnings">注意事項</label>
              <textarea
                id="warnings"
                value={formData.warnings}
                onChange={(e) => setFormData(prev => ({ ...prev, warnings: e.target.value }))}
                placeholder="安全に関する注意事項"
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" disabled={loading}>
                {loading ? '保存中...' : editingLocation ? '更新' : '作成'}
              </button>
              
              {editingLocation && (
                <button type="button" onClick={resetForm}>
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 撮影地点一覧 */}
        <div className={styles.listSection}>
          <h3>登録済み撮影地点</h3>
          
          {loading && <div className="loading">データを読み込み中...</div>}
          
          <div className={styles.locationsList}>
            {locations.map(location => (
              <div key={location.id} className={styles.locationItem}>
                <div className={styles.locationInfo}>
                  <h4>{location.name}</h4>
                  <p><strong>所在地:</strong> {location.prefecture}</p>
                  <p><strong>座標:</strong> {location.latitude}, {location.longitude}</p>
                  <p><strong>標高:</strong> {location.elevation.toFixed(1)}m</p>
                  {location.description && <p><strong>説明:</strong> {location.description}</p>}
                </div>
                
                <div className={styles.locationActions}>
                  <button 
                    onClick={() => handleEdit(location)}
                    className={styles.editButton}
                  >
                    編集
                  </button>
                  <button 
                    onClick={() => handleDelete(location.id)}
                    className={styles.deleteButton}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 地図選択モーダル */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLat={formData.latitude || 35.3606}
          initialLng={formData.longitude || 138.7274}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
};

export default AdminPage;