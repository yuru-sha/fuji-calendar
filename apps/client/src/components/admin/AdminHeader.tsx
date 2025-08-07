import React, { useState, useEffect } from 'react';
import { Icon } from '@fuji-calendar/ui';
import { authService } from '../../services/authService';
import { getComponentLogger } from '@fuji-calendar/utils';
import PasswordChangeModal from './PasswordChangeModal';

const logger = getComponentLogger('AdminHeader');

// Types
interface AdminHeaderProps {
  onLogout: () => void;
  loading: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onLogout, loading }) => {
  // State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Effects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showUserMenu &&
        !(event.target as HTMLElement).closest('.user-menu-container')
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Event handlers
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('新しいパスワードが一致しません。');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('新しいパスワードは 6 文字以上で入力してください。');
      return;
    }

    try {
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );

      if (result.success) {
        alert(result.message);
        setShowPasswordModal(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      logger.error('パスワード変更エラー', error as Error);
      alert('パスワード変更中にエラーが発生しました。');
    }
  };

  const handlePasswordFormChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Icon name="dashboard" size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">管理画面</h1>
              <p className="text-sm text-gray-500">富士カレンダー</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-xl px-4 py-3 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <Icon name="users" size={18} className="text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">admin</div>
                <div className="text-xs text-gray-500">スーパー管理者</div>
              </div>
              <Icon
                name="chevronDown"
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">admin</p>
                  <p className="text-xs text-gray-600">スーパー管理者</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon name="key" size={16} className="text-gray-600" />
                    </div>
                    <span>パスワード変更</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center space-x-3 transition-colors duration-150"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-red-100">
                      <Icon name="logout" size={16} className="text-gray-600" />
                    </div>
                    <span>ログアウト</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          passwordForm={passwordForm}
          onPasswordFormChange={handlePasswordFormChange}
          onPasswordChange={handlePasswordChange}
          loading={loading}
        />
      )}
    </>
  );
};

export default AdminHeader;