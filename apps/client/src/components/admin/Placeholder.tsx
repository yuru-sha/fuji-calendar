import React from 'react';
import { Icon } from '@fuji-calendar/ui';

interface PlaceholderProps {
  title: string;
  description?: string;
  iconName?: keyof typeof import('@fuji-calendar/ui').iconMap;
}

const Placeholder: React.FC<PlaceholderProps> = ({ 
  title, 
  description,
  iconName = 'settings'
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {title}
        </h1>
        <p className="text-gray-600 mt-1">
          {description || 'この機能は現在開発中です'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
        <div className="mb-4 opacity-20">
          <Icon name={iconName} size={96} className="mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          準備中
        </h3>
        <p className="text-gray-500">この機能は近日公開予定です</p>
      </div>
    </div>
  );
};

export default Placeholder;