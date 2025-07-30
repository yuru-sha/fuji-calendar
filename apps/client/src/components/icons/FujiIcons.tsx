import React from 'react';
import { Mountain, Sun } from 'lucide-react';

interface FujiIconProps {
  type: 'diamond' | 'pearl';
  size?: number;
  className?: string;
}

export const FujiIcon: React.FC<FujiIconProps> = ({ type, size = 24, className = '' }) => {
  if (type === 'diamond') {
    return (
      <div className={`relative ${className}`}>
        <Mountain size={size} className="text-orange-500" />
        <Sun size={size * 0.6} className="absolute -top-1 -right-1 text-yellow-400" />
      </div>
    );
  } else {
    return (
      <div className={`relative ${className}`}>
        <Mountain size={size} className="text-blue-500" />
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-gray-300"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      </div>
    );
  }
};

export default FujiIcon;