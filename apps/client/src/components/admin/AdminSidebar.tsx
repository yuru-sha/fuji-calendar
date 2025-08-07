import React from 'react';
import { Icon } from '@fuji-calendar/ui';
import { AdminView } from './AdminLayout';

// Types
interface SidebarItemProps {
  icon: keyof typeof import('@fuji-calendar/ui').iconMap;
  label: string;
  subLabel?: string;
  active?: boolean;
  onClick?: () => void;
}

// Components
const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  subLabel,
  active,
  onClick,
}) => (
  <div className="px-3">
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center space-x-4 text-left transition-all duration-200 rounded-xl group ${
        active
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200 shadow-sm'
          : 'hover:bg-gray-50 text-gray-700 border border-transparent hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
        active 
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm' 
          : 'bg-gray-100 group-hover:bg-gray-200'
      }`}>
        <Icon
          name={icon}
          size={18}
          className={active ? 'text-white' : 'text-gray-500 group-hover:text-gray-600'}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${active ? 'text-blue-900' : 'text-gray-900'}`}>
          {label}
        </p>
        {subLabel && (
          <p className={`text-xs truncate mt-0.5 ${active ? 'text-blue-700' : 'text-gray-500'}`}>
            {subLabel}
          </p>
        )}
      </div>
    </button>
  </div>
);

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
}

// Constants
const MENU_ITEMS = [
  {
    view: 'dashboard' as AdminView,
    icon: 'dashboard' as const,
    label: 'ダッシュボード',
    subLabel: '概要とシステム状況',
  },
  {
    view: 'locations' as AdminView,
    icon: 'location' as const,
    label: '撮影地点管理',
    subLabel: '地点の登録・編集・削除',
  },
  {
    view: 'queue' as AdminView,
    icon: 'queue' as const,
    label: 'キュー管理',
    subLabel: '計算ジョブの監視',
  },
  {
    view: 'events' as AdminView,
    icon: 'calendar' as const,
    label: 'カレンダー確認',
    subLabel: '撮影候補の確認',
  },
  {
    view: 'data' as AdminView,
    icon: 'data' as const,
    label: 'データ管理',
    subLabel: 'システムデータの管理',
  },
  {
    view: 'users' as AdminView,
    icon: 'users' as const,
    label: 'ユーザー管理',
    subLabel: '管理者アカウント管理',
  },
  {
    view: 'settings' as AdminView,
    icon: 'settings' as const,
    label: 'システム設定',
    subLabel: 'アプリケーション設定',
  },
] as const;

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  activeView, 
  onViewChange 
}) => {
  return (
    <aside className="w-72 bg-white border-r border-gray-100 min-h-screen">
      {/* Menu Header */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
            <Icon name="settings" size={16} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">管理メニュー</p>
            <p className="text-xs text-gray-500">システム管理ツール</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="px-3 py-6 space-y-2">
        {MENU_ITEMS.map((item) => (
          <SidebarItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            subLabel={item.subLabel}
            active={activeView === item.view}
            onClick={() => onViewChange(item.view)}
          />
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;