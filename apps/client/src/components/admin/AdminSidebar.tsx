import React from "react";
import { Icon } from "@fuji-calendar/ui";

type ViewType = "dashboard" | "locations" | "events" | "queue" | "users" | "data" | "settings";

interface SidebarItemProps {
  icon: keyof typeof import("@fuji-calendar/ui").iconMap;
  label: string;
  subLabel?: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  subLabel,
  active,
  onClick,
}) => (
  <div className="px-2">
    <button
      onClick={onClick}
      className={`w-full px-3 py-3 flex items-center space-x-3 text-left transition-all duration-200 rounded-lg ${
        active
          ? "bg-blue-50 text-blue-900 border border-blue-200"
          : "hover:bg-gray-50 text-gray-700 border border-transparent"
      }`}
    >
      <Icon
        name={icon}
        size={20}
        className={active ? "text-blue-600" : "text-gray-400"}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {subLabel && <p className="text-xs text-gray-500">{subLabel}</p>}
      </div>
    </button>
  </div>
);

interface AdminSidebarProps {
  activeView: string;
  onViewChange: (view: ViewType) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
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
          active={activeView === "dashboard"}
          onClick={() => onViewChange("dashboard")}
        />
        <SidebarItem
          icon="location"
          label="撮影地点管理"
          subLabel="地点の登録・編集・削除"
          active={activeView === "locations"}
          onClick={() => onViewChange("locations")}
        />
        <SidebarItem
          icon="queue"
          label="キュー管理"
          subLabel="計算ジョブの監視"
          active={activeView === "queue"}
          onClick={() => onViewChange("queue")}
        />
        <SidebarItem
          icon="calendar"
          label="カレンダー確認"
          subLabel="撮影候補の確認"
          active={activeView === "events"}
          onClick={() => onViewChange("events")}
        />
        <SidebarItem
          icon="data"
          label="データ管理"
          subLabel="システムデータの管理"
          active={activeView === "data"}
          onClick={() => onViewChange("data")}
        />
        <SidebarItem
          icon="users"
          label="ユーザー管理"
          subLabel="管理者アカウント管理"
          active={activeView === "users"}
          onClick={() => onViewChange("users")}
        />
        <SidebarItem
          icon="settings"
          label="システム設定"
          subLabel="アプリケーション設定"
          active={activeView === "settings"}
          onClick={() => onViewChange("settings")}
        />
      </nav>
    </div>
  );
};

export default AdminSidebar;