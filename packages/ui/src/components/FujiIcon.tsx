import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface FujiIconProps {
  type: 'diamond' | 'pearl';
  size?: number;
  className?: string;
}

export const FujiIcon: React.FC<FujiIconProps> = ({ type, size = 24, className = '' }) => {
  if (type === 'diamond') {
    return (
      <Sun size={size} className={`text-orange-500 ${className}`} />
    );
  } else {
    return (
      <Moon size={size} className={`text-blue-500 ${className}`} />
    );
  }
};

export default FujiIcon;