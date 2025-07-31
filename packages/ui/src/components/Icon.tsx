import React from 'react';
import {
  BarChart3,
  MapPin,
  Zap,
  Calendar,
  Database,
  Users,
  Settings,
  Plus,
  List,
  FileText,
  Download,
  Map,
  Ruler,
  RotateCcw,
  Heart,
  Star,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Check,
  Trash2,
  Edit
} from 'lucide-react';

// アイコンマッピング
export const iconMap = {
  // 管理画面用アイコン
  dashboard: BarChart3,
  location: MapPin,
  queue: Zap,
  calendar: Calendar,
  data: Database,
  users: Users,
  settings: Settings,
  add: Plus,
  list: List,
  export: Download,
  map: Map,
  ruler: Ruler,
  refresh: RotateCcw,
  
  // 一般的なアイコン
  heart: Heart,
  star: Star,
  clock: Clock,
  eye: Eye,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  search: Search,
  filter: Filter,
  close: X,
  check: Check,
  file: FileText,
  trash: Trash2,
  edit: Edit
};

// アイコンコンポーネントのプロパティ
interface IconProps {
  name: keyof typeof iconMap;
  size?: number;
  className?: string;
  color?: string;
}

// 汎用アイコンコンポーネント
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  className = '', 
  color = 'currentColor' 
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      color={color}
    />
  );
};

export default Icon;