import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Icon } from './icons/IconMap';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', label: 'ホーム', icon: 'home' as const },
    { path: '/favorites', label: 'お気に入り', icon: 'favorites' as const },
    { path: '/admin', label: '管理', icon: 'admin' as const }
  ];

  // 管理画面の場合はヘッダー・フッターなしのレイアウト
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center">
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none">
                  富士山カレンダー
                </h1>
                <p className="text-xs text-gray-500 leading-none mt-0.5 hidden sm:block">
                  ダイヤモンド富士・パール富士撮影支援
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md font-medium text-sm
                    transition-all duration-200
                    ${isActive(item.path)
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Modern Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 text-center">
            <p className="text-sm text-gray-600">
              &copy; 2025 富士山カレンダー. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mt-4">
              <span className="text-xs text-gray-500 flex items-center space-x-1">
                <Icon name="camera" size={12} />
                <span>撮影地データ更新: 2025 年対応済み</span>
              </span>
              <span className="text-xs text-gray-500 flex items-center space-x-1">
                <Icon name="moon" size={12} />
                <span>天体計算エンジン: Astronomy Engine</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;