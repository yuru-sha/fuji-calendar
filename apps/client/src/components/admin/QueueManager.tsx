import React, { useState, useEffect } from "react";
import { getComponentLogger } from "@fuji-calendar/utils";
import { authService } from "../../services/authService";

const logger = getComponentLogger("QueueManager");

interface QueueStats {
  enabled: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  failedJobs: Array<{
    id: string;
    name: string;
    data: Record<string, unknown>;
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
  status: "idle" | "running" | "error";
}

interface BackgroundJobsStatus {
  enabled: boolean;
  jobs: BackgroundJob[];
  error?: string;
}

const QueueManager: React.FC = () => {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJobsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const token = authService.getToken();

      if (!token) {
        logger.warn("認証トークンがありません");
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: "認証が必要です。管理者としてログインしてください。",
        });
        return;
      }

      logger.debug("認証トークン確認", {
        tokenExists: !!token,
        tokenLength: token?.length,
      });

      const response = await fetch("/api/admin/queue/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug("キュー統計取得成功", data);
        setStats(data);
      } else {
        logger.error("キュー統計取得失敗", {
          status: response.status,
          statusText: response.statusText,
        });
        setStats({
          enabled: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          failedJobs: [],
          error: `API エラー: ${response.status} ${response.statusText}`,
        });
      }
    } catch (error) {
      logger.error("キュー統計取得エラー", error);
      setStats({
        enabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        failedJobs: [],
        error: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  };

  const fetchBackgroundJobs = async () => {
    try {
      const response = await authService.authenticatedFetch("/api/admin/background-jobs");
      
      if (response.ok) {
        const data = await response.json();
        setBackgroundJobs(data);
      } else {
        setBackgroundJobs({
          enabled: false,
          jobs: [],
          error: `バックグラウンドジョブの取得に失敗: ${response.status}`,
        });
      }
    } catch (error) {
      setBackgroundJobs({
        enabled: false,
        jobs: [],
        error: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  };

  const toggleBackgroundJob = async (jobId: string, enabled: boolean) => {
    try {
      const response = await authService.authenticatedFetch(
        `/api/admin/background-jobs/${jobId}/toggle`,
        {
          method: "POST",
          body: JSON.stringify({ enabled }),
        }
      );

      if (response.ok) {
        await fetchBackgroundJobs();
      } else {
        alert("ジョブの切り替えに失敗しました");
      }
    } catch (error) {
      alert("ジョブの切り替えに失敗しました");
    }
  };

  const triggerBackgroundJob = async (jobId: string) => {
    try {
      const response = await authService.authenticatedFetch(
        `/api/admin/background-jobs/${jobId}/trigger`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        alert("ジョブを実行しました");
        await fetchBackgroundJobs();
      } else {
        alert("ジョブの実行に失敗しました");
      }
    } catch (error) {
      alert("ジョブの実行に失敗しました");
    }
  };

  const clearFailedJobs = async () => {
    if (!confirm("失敗したジョブをすべてクリアしますか？")) {
      return;
    }

    try {
      setLoading(true);
      const response = await authService.authenticatedFetch(
        "/api/admin/queue/clear-failed",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        await fetchStats();
        alert("失敗したジョブをクリアしました");
      } else {
        alert("失敗したジョブのクリアに失敗しました");
      }
    } catch (error) {
      alert("失敗したジョブのクリアに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBackgroundJobs();

    const interval = setInterval(() => {
      fetchStats();
      fetchBackgroundJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // エラー状態の場合
  if (renderError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-red-700 mb-4">{renderError}</p>
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

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">キュー管理</h2>
          <p className="text-gray-600 mt-1">
            バックグラウンド処理とジョブキューの状態を管理します
          </p>
        </div>
      </div>

      {/* Redis 接続エラーの場合の警告 */}
      {(!stats.enabled || stats.error) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                キューシステムが利用できません
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {stats.error ||
                    "Redis サーバーに接続できません。バックグラウンド処理が正常に動作しない可能性があります。"}
                </p>
                <p className="mt-1">
                  システム管理者に連絡してください。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キュー統計 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">キュー統計</h2>
        </div>
        <div className="p-6">
          {stats.enabled ? (
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.waiting || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">待機中</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.active || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">実行中</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.completed || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">完了</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {stats.failed || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">失敗</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>キューシステムが無効です</p>
            </div>
          )}
        </div>
      </div>

      {/* 失敗したジョブ */}
      {stats.failed > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              失敗したジョブ
            </h2>
            <button
              onClick={clearFailedJobs}
              disabled={loading}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              すべてクリア
            </button>
          </div>
          <div className="p-6 space-y-2">
            {stats.failedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-3 rounded border-l-4 border-red-500"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">ジョブ ID: {job.id}</div>
                    <div className="text-sm text-gray-600">
                      地点: {String(job.data.locationId || "N/A")}, 年:{" "}
                      {String(job.data.startYear || "N/A")}-
                      {String(job.data.endYear || "N/A")}
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {job.failedReason}
                    </div>
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
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              バックグラウンド処理管理
            </h2>
          </div>
          <div className="p-6">
            {backgroundJobs.error ? (
              <div className="text-red-600 text-sm">{backgroundJobs.error}</div>
            ) : (
              <div className="space-y-4">
                {backgroundJobs.jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">
                          {job.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            job.status === "running"
                              ? "bg-blue-100 text-blue-800"
                              : job.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.status === "running"
                            ? "実行中"
                            : job.status === "error"
                              ? "エラー"
                              : "待機中"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={job.enabled}
                            onChange={(e) =>
                              toggleBackgroundJob(job.id, e.target.checked)
                            }
                            className="sr-only"
                          />
                          <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              job.enabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                job.enabled ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </div>
                        </label>
                        <button
                          onClick={() => triggerBackgroundJob(job.id)}
                          disabled={!job.enabled || job.status === "running"}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          手動実行
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {job.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>スケジュール: {job.schedule}</span>
                      {job.lastRun && (
                        <span>
                          最終実行:{" "}
                          {new Date(job.lastRun).toLocaleString("ja-JP")}
                        </span>
                      )}
                      {job.nextRun && (
                        <span>
                          次回実行:{" "}
                          {new Date(job.nextRun).toLocaleString("ja-JP")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* キュー管理について */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">
          キュー管理について
        </h2>
        <div className="space-y-2 text-sm text-blue-700">
          <p>
            • <strong>データ再計算</strong>
            は「撮影地点管理」から各地点ごとに実行できます
          </p>
          <p>
            • <strong>バックグラウンド処理</strong>
            は定期実行される自動処理の設定です
          </p>
          <p>• キューの状況監視と失敗したジョブの管理も行えます</p>
          <p>• <strong>同時実行数の制御</strong>は「システム設定」で行えます</p>
        </div>
      </div>
    </div>
  );
};

export default QueueManager;