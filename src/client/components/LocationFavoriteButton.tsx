import React from 'react';
import styles from './FavoriteButton.module.css';

export interface LocationFavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  tooltip?: string;
}

const LocationFavoriteButton: React.FC<LocationFavoriteButtonProps> = ({
  isFavorite,
  onClick,
  className = '',
  size = 'medium',
  disabled = false,
  tooltip
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };

  const buttonClasses = [
    styles.favoriteButton,
    styles[size],
    isFavorite ? styles.favorited : styles.unfavorited,
    disabled ? styles.disabled : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      title={tooltip || (isFavorite ? '撮影地点をお気に入りから削除' : '撮影地点をお気に入りに追加')}
      aria-label={isFavorite ? '撮影地点をお気に入りから削除' : '撮影地点をお気に入りに追加'}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 地点アイコン（ピン/ブックマーク） */}
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </button>
  );
};

export default LocationFavoriteButton;