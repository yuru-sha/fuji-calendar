import React from 'react';
import styles from './ErrorMessage.module.css';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry? : () => void;
  className?: string;
}

/**
 * 共通エラーメッセージコンポーネント
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'エラーが発生しました',
  message,
  variant = 'error',
  onRetry,
  className = ''
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  return (
    <div className={`${styles.errorMessage} ${styles[variant]} ${className}`}>
      <div className={styles.header}>
        <span className={styles.icon}>{getIcon()}</span>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button 
          className={styles.retryButton}
          onClick={onRetry}
          type="button"
        >
          再試行
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;