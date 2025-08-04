import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@fuji-calendar/ui";
import { getComponentLogger } from "@fuji-calendar/utils";
import { authService } from "../../services/authService";

const logger = getComponentLogger("AdminHeader");

interface AdminHeaderProps {
  onPasswordChangeClick: () => void;
}

// TODO: この useClickOutside フックは共通フック（hooks/useClickOutside.ts）として切り出すべき
const useClickOutside = (isOpen: boolean, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !(event.target as HTMLElement).closest(".user-menu-container")
      ) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, callback]);
};

const AdminHeader: React.FC<AdminHeaderProps> = ({
  onPasswordChangeClick,
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useClickOutside(showUserMenu, () => setShowUserMenu(false));

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate("/admin/login");
    } catch (error) {
      logger.error("ログアウトエラー", error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="pt-1 ml-52">
          <h1 className="text-lg font-bold text-gray-900">管理画面</h1>
        </div>
        <div className="relative mr-64 user-menu-container">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon name="users" size={16} className="text-blue-600" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">admin</div>
              <div className="text-xs text-gray-500">スーパー管理者</div>
            </div>
            <Icon
              name="chevronDown"
              size={16}
              className="text-gray-400 ml-1"
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">admin</p>
                  <p className="text-xs text-gray-500">スーパー管理者</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onPasswordChangeClick();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Icon name="key" size={16} className="text-gray-400" />
                  <span>パスワード変更</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Icon name="logout" size={16} className="text-gray-400" />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;