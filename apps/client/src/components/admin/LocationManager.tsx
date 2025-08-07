import React, { useMemo } from "react";
import { Location } from "@fuji-calendar/types";
import { Icon } from "@fuji-calendar/ui";

interface LocationManagerProps {
  locations: Location[];
  searchTerm: string;
  filterPrefecture: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onAddLocation: () => void;
  onEditLocation: (location: Location) => void;
  onDeleteLocation: (location: Location) => void;
  onRecalculateLocation: (location: Location) => void;
  onExportLocations: () => void;
  onImportLocations: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const LocationManager: React.FC<LocationManagerProps> = ({
  locations,
  searchTerm,
  filterPrefecture,
  loading,
  onSearchChange,
  onFilterChange,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  onRecalculateLocation,
  onExportLocations,
  onImportLocations,
}) => {
  // Filtered locations
  const filteredLocations = useMemo(() => {
    if (!Array.isArray(locations)) {
      return [];
    }
    return locations.filter((location) => {
      const matchesSearch = location.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPrefecture =
        !filterPrefecture || location.prefecture === filterPrefecture;
      return matchesSearch && matchesPrefecture;
    });
  }, [locations, searchTerm, filterPrefecture]);

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">撮影地点管理</h1>
          <p className="text-gray-600 mt-1">
            撮影地点の追加・編集・削除を行います。エクスポート/インポート機能では、ID
            がある地点は更新、ない地点は新規登録されます。
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onExportLocations}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Icon name="download" size={16} color="white" />
            <span>エクスポート</span>
          </button>
          <button
            onClick={() => document.getElementById("import-file")?.click()}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <Icon name="upload" size={16} color="white" />
            <span>インポート</span>
          </button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={onImportLocations}
            className="hidden"
          />
          <button
            onClick={onAddLocation}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              地点を検索
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="地点名で検索..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              都道府県で絞り込み
            </label>
            <select
              value={filterPrefecture}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">すべて</option>
              <option value="茨城県">茨城県</option>
              <option value="埼玉県">埼玉県</option>
              <option value="千葉県">千葉県</option>
              <option value="東京都">東京都</option>
              <option value="神奈川県">神奈川県</option>
              <option value="山梨県">山梨県</option>
              <option value="長野県">長野県</option>
              <option value="静岡県">静岡県</option>
              <option value="三重県">三重県</option>
              <option value="奈良県">奈良県</option>
              <option value="和歌山県">和歌山県</option>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            地点が見つかりません
          </h3>
          <p className="text-gray-500">
            検索条件を変更するか、新しい地点を追加してください。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
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
                  富士山距離
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLocations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {location.name}
                    </div>
                    {location.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {location.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {location.prefecture}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.latitude.toFixed(6)},{" "}
                    {location.longitude.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.elevation}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {((location.fujiDistance || 0) / 1000).toFixed(1)}km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onRecalculateLocation(location)}
                      disabled={loading}
                      className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                      title="2025 年データを再計算"
                    >
                      <Icon
                        name="refresh"
                        size={16}
                        className="inline mr-1"
                      />
                      再計算
                    </button>
                    <button
                      onClick={() => onEditLocation(location)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => onDeleteLocation(location)}
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
  );
};

export default LocationManager;