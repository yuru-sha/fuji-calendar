import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

/**
 * 共通ローディングスピナーコンポーネント
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = ''
}) => {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${styles[color]} ${className}`}
      role="status"
      aria-label="読み込み中"
    >
      <div className={styles.spinnerInner}></div>
    </div>
  );
};

export default LoadingSpinner;