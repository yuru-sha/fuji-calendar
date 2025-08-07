import React from "react";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Password Input Field Component
interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
      placeholder={placeholder}
    />
  </div>
);

interface PasswordChangeModalProps {
  isOpen: boolean;
  passwordForm: PasswordFormData;
  loading: boolean;
  onClose: () => void;
  onPasswordFormChange: (form: PasswordFormData) => void;
  onSubmit: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  passwordForm,
  loading,
  onClose,
  onPasswordFormChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onPasswordFormChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">パスワード変更</h2>

        <div className="space-y-4">
          <PasswordField
            label="現在のパスワード"
            value={passwordForm.currentPassword}
            onChange={(value) =>
              onPasswordFormChange({
                ...passwordForm,
                currentPassword: value,
              })
            }
            placeholder="現在のパスワードを入力"
          />
          <PasswordField
            label="新しいパスワード"
            value={passwordForm.newPassword}
            onChange={(value) =>
              onPasswordFormChange({
                ...passwordForm,
                newPassword: value,
              })
            }
            placeholder="6 文字以上で入力"
          />
          <PasswordField
            label="新しいパスワード（確認）"
            value={passwordForm.confirmPassword}
            onChange={(value) =>
              onPasswordFormChange({
                ...passwordForm,
                confirmPassword: value,
              })
            }
            placeholder="もう一度入力してください"
          />
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "変更中..." : "変更する"}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;