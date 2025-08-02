import React, { useState, useEffect } from 'react';
import { Icon } from '@fuji-calendar/ui';
import { authService } from '../../services/authService';

// 型定義
interface SystemSetting {
  id: number;
  settingKey: string;
  settingType: 'number' | 'string' | 'boolean';
  value: any;
  description?: string;
  editable: boolean;
  updatedAt: string;
}

interface SystemSettingsData {
  success: boolean;
  settings: Record<string, SystemSetting[]>;
  meta: {
    totalSettings: number;
    categories: string[];
    lastUpdate: string;
  };
}

interface CategoryDisplayInfo {
  name: string;
  description: string;
  icon: keyof typeof import('@fuji-calendar/ui').iconMap;
  color: string;
}

// カテゴリ表示情報
const categoryInfo: Record<string, CategoryDisplayInfo> = {
  'astronomical': {
    name: '天体計算設定',
    description: 'ダイヤモンド富士・パール富士の計算精度に関する設定',
    icon: 'sun',
    color: 'blue'
  },
  'performance': {
    name: 'パフォーマンス設定',
    description: 'システムの性能とキャッシュに関する設定',
    icon: 'rocket',
    color: 'green'
  },
  'ui': {
    name: 'UI 設定',
    description: 'ユーザーインターフェースの表示に関する設定',
    icon: 'palette',
    color: 'purple'
  }
};

// 設定値入力コンポーネント
interface SettingInputProps {
  setting: SystemSetting;
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
}

const SettingInput: React.FC<SettingInputProps> = ({ setting, value, onChange, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    switch (setting.settingType) {
      case 'number':
        onChange(newValue === '' ? '' : parseFloat(newValue));
        break;
      case 'boolean':
        onChange(e.target.checked);
        break;
      case 'string':
      default:
        onChange(newValue);
        break;
    }
  };

  if (setting.settingType === 'boolean') {
    return (
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={handleChange}
          disabled={disabled || !setting.editable}
          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
        <span className="text-sm text-gray-700">
          {value ? '有効' : '無効'}
        </span>
      </label>
    );
  }

  return (
    <input
      type={setting.settingType === 'number' ? 'number' : 'text'}
      value={value || ''}
      onChange={handleChange}
      disabled={disabled || !setting.editable}
      step={setting.settingType === 'number' ? 'any' : undefined}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50"
      placeholder={setting.editable ? '値を入力' : '読み取り専用'}
    />
  );
};

// メインコンポーネント
const SystemSettingsManager: React.FC = () => {
  const [settingsData, setSettingsData] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // 設定を読み込む
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authenticatedFetch('/api/admin/system-settings');
      
      if (!response.ok) {
        throw new Error(`設定の取得に失敗しました: ${response.status}`);
      }

      const data: SystemSettingsData = await response.json();
      setSettingsData(data);

      // 全カテゴリを最初に展開
      const initialExpanded: Record<string, boolean> = {};
      data.meta.categories.forEach(category => {
        initialExpanded[category] = true;
      });
      setExpandedCategories(initialExpanded);

    } catch (err) {
      console.error('設定読み込みエラー:', err);
      setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 設定を保存する
  const saveSettings = async () => {
    if (Object.keys(editedValues).length === 0) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const settingsToUpdate = Object.entries(editedValues).map(([settingKey, value]) => ({
        settingKey,
        value
      }));

      const response = await authService.authenticatedFetch('/api/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `設定の保存に失敗しました: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 成功時は編集状態をクリアして再読み込み
        setEditedValues({});
        await loadSettings();
        
        // 成功メッセージ表示
        alert(`${result.summary.success} 件の設定を更新しました`);
      } else {
        throw new Error(result.message || '設定の保存に失敗しました');
      }

    } catch (err) {
      console.error('設定保存エラー:', err);
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // キャッシュクリア
  const clearCache = async () => {
    if (!confirm('設定キャッシュをクリアしますか？\n※クリア後は最新の設定値が反映されます。')) {
      return;
    }

    try {
      setSaving(true);
      
      const response = await authService.authenticatedFetch('/api/admin/system-settings/clear-cache', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`キャッシュクリアに失敗しました: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert('キャッシュをクリアしました');
        await loadSettings(); // 設定を再読み込み
      } else {
        throw new Error(result.message || 'キャッシュクリアに失敗しました');
      }

    } catch (err) {
      console.error('キャッシュクリアエラー:', err);
      setError(err instanceof Error ? err.message : 'キャッシュクリアに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 編集値を更新
  const handleValueChange = (settingKey: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [settingKey]: value
    }));
  };

  // 変更をリセット
  const resetChanges = () => {
    setEditedValues({});
    setError(null);
  };

  // カテゴリの展開状態を切り替え
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // 初期読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">設定を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <Icon name="xCircle" size={20} className="text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={loadSettings}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!settingsData) {
    return (
      <div className="text-center py-12">
        <Icon name="settings" size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">設定データがありません</p>
      </div>
    );
  }

  const hasChanges = Object.keys(editedValues).length > 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">システム設定</h2>
          <p className="text-gray-600 mt-1">アプリケーションの動作設定を管理します</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearCache}
            disabled={saving}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Icon name="refresh" size={16} />
            <span>キャッシュクリア</span>
          </button>
          {hasChanges && (
            <>
              <button
                onClick={resetChanges}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                変更を破棄
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    <span>変更を保存</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 設定一覧 */}
      <div className="space-y-6">
        {settingsData.meta.categories.map(category => {
          const info = categoryInfo[category] || {
            name: category,
            description: `${category} カテゴリの設定`,
            icon: 'settings' as const,
            color: 'gray'
          };
          
          const settings = settingsData.settings[category] || [];
          const isExpanded = expandedCategories[category];

          return (
            <div key={category} className="bg-white rounded-lg shadow-sm border">
              {/* カテゴリヘッダー */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-${info.color}-50 border border-${info.color}-200 rounded-lg flex items-center justify-center`}>
                    <Icon name={info.icon} size={20} className={`text-${info.color}-600`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                    <p className="text-sm text-gray-600">{info.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{settings.length} 件の設定</p>
                  </div>
                </div>
                <Icon 
                  name={isExpanded ? "chevronDown" : "chevronRight"} 
                  size={20} 
                  className="text-gray-400" 
                />
              </button>

              {/* 設定項目 */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="p-6 space-y-4">
                    {settings.map(setting => {
                      const currentValue = editedValues.hasOwnProperty(setting.settingKey) 
                        ? editedValues[setting.settingKey] 
                        : setting.value;
                      
                      const hasChanged = editedValues.hasOwnProperty(setting.settingKey);

                      return (
                        <div 
                          key={setting.id} 
                          className={`p-4 rounded-lg border transition-colors ${
                            hasChanged 
                              ? 'border-blue-200 bg-blue-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 mr-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {setting.settingKey}
                                </h4>
                                {!setting.editable && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    読み取り専用
                                  </span>
                                )}
                                {hasChanged && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    変更済み
                                  </span>
                                )}
                              </div>
                              {setting.description && (
                                <p className="text-sm text-gray-600 mb-3">{setting.description}</p>
                              )}
                              <div className="text-xs text-gray-500">
                                型: {setting.settingType} | 最終更新: {new Date(setting.updatedAt).toLocaleString('ja-JP')}
                              </div>
                            </div>
                            <div className="w-64">
                              <SettingInput
                                setting={setting}
                                value={currentValue}
                                onChange={(value) => handleValueChange(setting.settingKey, value)}
                                disabled={saving}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* フッター情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            総設定数: {settingsData.meta.totalSettings} 件 
            ({settingsData.meta.categories.length} カテゴリ)
          </span>
          <span>
            最終更新: {new Date(settingsData.meta.lastUpdate).toLocaleString('ja-JP')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsManager;