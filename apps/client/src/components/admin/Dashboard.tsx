import React from "react";
import { Icon } from "@fuji-calendar/ui";

interface StatsCardProps {
  icon: keyof typeof import("@fuji-calendar/ui").iconMap;
  iconColor: string;
  label: string;
  value: string | number;
  subtext: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  iconColor,
  label,
  value,
  subtext,
}) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border">
    <div className="flex items-center">
      <div className={`w-12 h-12 ${iconColor} border rounded-lg flex items-center justify-center mr-3`}>
        <Icon name={icon} size={24} className={iconColor.includes('blue') ? 'text-blue-600' : 
                                             iconColor.includes('green') ? 'text-green-600' :
                                             iconColor.includes('yellow') ? 'text-yellow-600' : 'text-purple-600'} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{subtext}</p>
      </div>
    </div>
  </div>
);

interface DashboardProps {
  stats: {
    totalLocations: number;
    prefectures: number;
    avgDistance: string;
    recentAdditions: number;
  };
  queueStats: any;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, queueStats }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-600 mt-1">
          システム全体の状況を確認できます
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="location"
          iconColor="bg-blue-50 border-blue-200"
          label="総撮影地点数"
          value={stats.totalLocations}
          subtext="有効: 0 件, 制限: 0 件"
        />
        <StatsCard
          icon="queue"
          iconColor="bg-green-50 border-green-200"
          label="計算キュー"
          value={queueStats?.waiting || 0}
          subtext={`処理中: ${queueStats?.active || 0} 件, 完了: ${queueStats?.completed || 0} 件`}
        />
        <StatsCard
          icon="clock"
          iconColor="bg-yellow-50 border-yellow-200"
          label="イベントキュー"
          value={0}
          subtext="待機: 0 件, 処理中: 0 件"
        />
        <StatsCard
          icon="users"
          iconColor="bg-purple-50 border-purple-200"
          label="管理者数"
          value={1}
          subtext="スーパー管理者: 1 人"
        />
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
              <h2 className="text-lg font-semibold text-gray-900">
                キューシステム状況
              </h2>
            </div>
            {/* 撮影計算キュー */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  撮影計算キュー
                </h3>
                <div className="text-sm text-gray-500">
                  {(queueStats?.waiting || 0) + (queueStats?.active || 0)} 件
                  処理予定
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-sm text-orange-600">
                    {queueStats?.waiting || 0}
                  </div>
                  <div className="text-xs text-gray-500">待機</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600">
                    {queueStats?.active || 0}
                  </div>
                  <div className="text-xs text-gray-500">処理中</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-green-600">
                    {queueStats?.completed || 0}
                  </div>
                  <div className="text-xs text-gray-500">完了</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-red-600">
                    {queueStats?.failed || 0}
                  </div>
                  <div className="text-xs text-gray-500">失敗</div>
                </div>
              </div>
            </div>

            {/* キュー詳細情報 */}
            <div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  処理の種類
                </h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>
                    • <strong>地点計算</strong>:
                    各地点の年間ダイヤモンド富士・パール富士データ生成
                  </p>
                  <p>
                    • <strong>月間計算</strong>:
                    複数地点の月間イベント一括計算
                  </p>
                </div>
                {queueStats?.enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Redis: <span className="text-green-600">接続中</span>
                      {queueStats.failed > 0 && (
                        <span className="ml-2 text-red-600">
                          失敗ジョブ {queueStats.failed} 件
                        </span>
                      )}
                    </div>
                  </div>
                )}
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
                <h2 className="text-lg font-semibold text-gray-900">
                  システム情報
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">アプリケーション</span>
                <span className="text-sm text-gray-900 font-medium">
                  Fuji Calendar v{import.meta.env.APP_VERSION}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">環境</span>
                <span className="text-sm text-gray-900">開発環境</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">認証システム</span>
                <div className="flex items-center space-x-1">
                  <Icon
                    name="checkCircle"
                    size={14}
                    className="text-green-600"
                  />
                  <span className="text-xs text-green-600">正常稼働</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">キューシステム</span>
                <div className="flex items-center space-x-1">
                  <Icon
                    name="checkCircle"
                    size={14}
                    className="text-green-600"
                  />
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
          最終更新:{" "}
          {new Date()
            .toLocaleString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
            .replace(
              /(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
              "$1/$2/$3 $4:$5:$6",
            )}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;