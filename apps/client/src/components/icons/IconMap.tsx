import React from 'react';
import {
  BarChart3,
  MapPin,
  Calendar,
  Database,
  Users,
  Settings,
  Plus,
  List,
  FileText,
  Download,
  Upload,
  Map,
  Ruler,
  RotateCcw,
  Heart,
  Star,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  X,
  Check,
  Trash2,
  Edit,
  Sun,
  Moon,
  Home,
  BookOpen,
  Lightbulb,
  Cloud,
  CloudRain,
  Snowflake,
  Camera,
  Target,
  Sunrise,
  Sunset,
  Car,
  ParkingCircle,
  AlertTriangle,
  CloudDrizzle,
  Activity,
  Server,
  CheckCircle,
  LogOut,
  Key
} from 'lucide-react';

// アイコンマッピング
export const iconMap = {
  // 管理画面用アイコン
  dashboard: BarChart3,
  location: MapPin,
  queue: Activity,
  calendar: Calendar,
  data: Database,
  users: Users,
  settings: Settings,
  logout: LogOut,
  key: Key,
  add: Plus,
  list: List,
  export: Download,
  download: Download,
  upload: Upload,
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
  chevronDown: ChevronDown,
  search: Search,
  filter: Filter,
  close: X,
  check: Check,
  file: FileText,
  trash: Trash2,
  edit: Edit,

  // 富士山イベント用アイコン
  sun: Sun,
  moon: Moon,

  // ナビゲーション用アイコン
  home: Home,
  favorites: Star,
  admin: Settings,

  // UI 用アイコン
  book: BookOpen,
  lightbulb: Lightbulb,
  cloud: Cloud,
  cloudRain: CloudRain,
  snowflake: Snowflake,
  camera: Camera,
  target: Target,
  sunrise: Sunrise,
  sunset: Sunset,
  car: Car,
  parking: ParkingCircle,
  warning: AlertTriangle,
  partlyCloudy: CloudDrizzle,
  server: Server,
  checkCircle: CheckCircle
};

// アイコンコンポーネントのプロパティ
interface IconProps {
  name: keyof typeof iconMap;
  size?: number;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

// 汎用アイコンコンポーネント
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  color = 'currentColor',
  style
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
      style={style}
    />
  );
};

export default Icon;