import React, { useState, useEffect } from 'react';
import { getComponentLogger } from '@fuji-calendar/utils';
import { authService } from '../../services/authService';

const logger = getComponentLogger('QueueManager');

interface QueueStats {
  enabled: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  failedJobs: Array<{
    id: string;
    name: string;
    data: any;
    failedReason: string;
    attemptsMade: number;
    timestamp: number;
  }>;
  error?: string;
  message?: string;
}

interface BackgroundJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'error';
}

interface BackgroundJobsStatus {
  enabled: boolean;
  jobs: BackgroundJob[];
  error?: string;
}


const QueueManager: React.FC = () => {
  console.log('QueueManager component is rendering');
  
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJobsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const token = authService.getToken();
      
      if (!token) {
        logger.warn('認証トークンがありません');
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: '認証が必要です。管理者としてログインしてください。'
        });
        return;
      }
      
      logger.debug('認証トークン確認', { tokenExists: !!token, tokenLength: token?.length });
      
      const response = await fetch('/api/admin/queue/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        logger.error('認証失敗 - トークンが無効', { status: response.status });
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: '認証トークンが無効です。再ログインしてください。'
        });
      } else {
        logger.error('キュー統計取得失敗', { status: response.status });
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: `サーバーエラー (${response.status})`
        });
      }
    } catch (error) {
      logger.error('キュー統計取得エラー', error);
      setStats({
        enabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        failedJobs: [],
        error: 'ネットワークエラーが発生しました。'
      });
    }
  };

  const fetchBackgroundJobs = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch('/api/admin/background-jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBackgroundJobs(data);
      } else {
        logger.error('バックグラウンドジョブ取得失敗', { status: response.status });
        setBackgroundJobs({
          enabled: false,
          jobs: [],
          error: 'バックグラウンドジョブ情報の取得に失敗しました。'
        });
      }
    } catch (error) {
      logger.error('バックグラウンドジョブ取得エラー', error);
      setBackgroundJobs({
        enabled: false,
        jobs: [],
        error: 'ネットワークエラーが発生しました。'
      });
    }
  };

  const toggleBackgroundJob = async (jobId: string, enabled: boolean) => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(`/api/admin/background-jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        // 成功したら状態を更新
        await fetchBackgroundJobs();
      } else {
        alert('設定の更新に失敗しました。');
      }
    } catch (error) {
      logger.error('バックグラウンドジョブ切り替えエラー', error);
      alert('エラーが発生しました。');
    }
  };

  const triggerBackgroundJob = async (jobId: string) => {
    if (!confirm('このバックグラウンドジョブを手動実行しますか？')) return;

    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(`/api/admin/background-jobs/${jobId}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`ジョブを実行しました: ${result.message}`);
        await fetchBackgroundJobs();
      } else {
        alert('ジョブの実行に失敗しました。');
      }
    } catch (error) {
      logger.error('バックグラウンドジョブ実行エラー', error);
      alert('エラーが発生しました。');
    }
  };


  const cleanFailedJobs = async () => {
    if (!confirm('失敗したジョブをすべてクリアしますか？')) return;

    setLoading(true);
    try {
      const token = authService.getToken();
      const response = await fetch('/api/admin/queue/clean-failed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.cleanedCount} 個の失敗したジョブをクリアしました`);
        fetchStats();
      } else {
        alert('失敗したジョブのクリアに失敗しました');
      }
    } catch (error) {
      logger.error('失敗ジョブクリアエラー', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const initializeComponent = async () => {
      try {
        logger.info('QueueManager 初期化開始');
        console.log('QueueManager: 初期化開始');
        
        // 認証状態を確認
        const token = authService.getToken();
        console.log('QueueManager: 認証トークン確認', { hasToken: !!token });
        
        await fetchStats();
        await fetchBackgroundJobs();
        logger.info('QueueManager 初期化完了');
        console.log('QueueManager: 初期化完了');
      } catch (error) {
        logger.error('QueueManager 初期化エラー', error);
        console.error('QueueManager: 初期化エラー', error);
        // エラーが発生してもコンポーネントが表示されるように最小限の stats を設定
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: '初期化に失敗しました。ページをリロードしてください。'
        });
      }
    };
    
    initializeComponent();
    
    // 5 秒間隔で統計を更新
    const interval = setInterval(() => {
      fetchStats().catch(error => {
        logger.error('定期更新エラー', error);
      });
      fetchBackgroundJobs().catch(error => {
        logger.error('バックグラウンドジョブ定期更新エラー', error);
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  console.log('QueueManager render - stats:', stats);

  // エラー状態の場合
  if (renderError) {
    console.log('QueueManager render - showing error state:', renderError);
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h2>
          <p className="text-red-700 mb-4">{renderError}</p>
          <button 
            onClick={() => {
              setRenderError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ページをリロード
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    console.log('QueueManager render - showing loading state');
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  console.log('QueueManager render - showing main content');
  
  try {
    return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">システム管理</h1>
      
      {/* Redis 接続エラーの場合の警告 */}
      {(!stats.enabled || stats.error) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                キューシステムが利用できません
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{stats.error || stats.message || 'Redis サーバーが起動していません。'}</p>
                <p className="mt-1">
                  Redis を起動するか、Docker を使用してください：<br/>
                  <code className="bg-yellow-100 px-1 rounded text-xs">docker run -d --name redis-fuji -p 6379:6379 redis:alpine</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* キュー統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">キュー統計</h2>
        {stats.enabled ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.waiting || 0}</div>
              <div className="text-sm text-gray-600">待機中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.active || 0}</div>
              <div className="text-sm text-gray-600">実行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
              <div className="text-sm text-gray-600">完了</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
              <div className="text-sm text-gray-600">失敗</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>キューシステムが無効です</p>
          </div>
        )}
      </div>

      {/* 失敗したジョブ */}
      {stats.failed > 0 && (
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-red-800">失敗したジョブ</h2>
            <button
              onClick={cleanFailedJobs}
              disabled={loading || !stats.enabled}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              title={!stats.enabled ? 'Redis が必要です' : ''}
            >
              {loading ? '処理中...' : 'すべてクリア'}
            </button>
          </div>
          <div className="space-y-2">
            {stats.failedJobs.map(job => (
              <div key={job.id} className="bg-white p-3 rounded border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">ジョブ ID: {job.id}</div>
                    <div className="text-sm text-gray-600">
                      地点: {job.data.locationId}, 年: {job.data.startYear}-{job.data.endYear}
                    </div>
                    <div className="text-sm text-red-600 mt-1">{job.failedReason}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    試行回数: {job.attemptsMade}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* バックグラウンドジョブ管理 */}
      {backgroundJobs && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">バックグラウンド処理管理</h2>
          {backgroundJobs.error ? (
            <div className="text-red-600 text-sm">{backgroundJobs.error}</div>
          ) : (
            <div className="space-y-4">
              {backgroundJobs.jobs.map(job => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{job.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.enabled ? '有効' : '無効'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.status === 'idle' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.status === 'idle' ? '待機中' : 
                         job.status === 'running' ? '実行中' : 'エラー'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={job.enabled}
                          onChange={(e) => toggleBackgroundJob(job.id, e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          job.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            job.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </label>
                      <button
                        onClick={() => triggerBackgroundJob(job.id)}
                        disabled={!job.enabled || job.status === 'running'}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        手動実行
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>スケジュール: {job.schedule}</span>
                    {job.lastRun && (
                      <span>最終実行: {new Date(job.lastRun).toLocaleString('ja-JP')}</span>
                    )}
                    {job.nextRun && (
                      <span>次回実行: {new Date(job.nextRun).toLocaleString('ja-JP')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* キュー管理について */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">システム管理について</h2>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• <strong>データ再計算</strong>は「撮影地点管理」から各地点ごとに実行できます</p>
          <p>• <strong>バックグラウンド処理</strong>は定期実行される自動処理の設定です</p>
          <p>• キューの状況監視と失敗したジョブの管理も行えます</p>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('QueueManager render error:', error);
    setRenderError(`レンダリングエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">レンダリングエラー</h2>
          <p className="text-red-700 mb-4">コンポーネントの表示中にエラーが発生しました。</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ページをリロード
          </button>
        </div>
      </div>
    );
  }
};

export default QueueManager;