import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { getComponentLogger } from '@fuji-calendar/utils';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { Icon } from "@fuji-calendar/ui";
import { AdminView } from '../../types/admin';

const logger = getComponentLogger('AdminLayout');

interface AdminLayoutProps {
  children: React.ReactNode;
  activeView?: AdminView;
  onViewChange?: (view: AdminView) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  activeView = 'dashboard', 
  onViewChange 
}) => {
  // State
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Effects - AdminPage で認証チェックを行うので、ここでは不要

  // Event handlers
  const handleLogout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      navigate('/admin/login');
    } catch (error) {
      logger.error('ログアウトエラー', error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader onLogout={handleLogout} loading={loading} />
      
      <div className="flex flex-1">
        <AdminSidebar 
          activeView={activeView} 
          onViewChange={onViewChange || (() => {})} 
        />
        
        <main className="flex-1 p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Admin Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 text-center">
            <p className="text-sm text-gray-600">
              &copy; 2025 富士カレンダー. All rights reserved.
            </p>
            <div className="flex flex-row items-center justify-center space-x-6 mt-4">
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

export default AdminLayout;