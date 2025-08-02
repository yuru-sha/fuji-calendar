import React from "react";
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
  Edit,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Cloud,
  CloudSnow,
  Mountain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Route,
  BarChart,
  TrendingUp,
  TrendingDown,
  RotateCw,
  Lock,
  Unlock,
  Lightbulb,
  Smartphone,
  Laptop,
  Target,
  Rocket,
  FileEdit,
  Timer,
  Bell,
  Palette,
  Trophy,
  PartyPopper,
  ThumbsUp,
  ThumbsDown,
  Percent,
  Link,
  ClipboardList,
  Bookmark,
  Paperclip,
  Gamepad2,
  Circle,
  Info,
  ParkingCircle,
  Navigation,
  BarChart4,
  Key,
  LogOut,
  Upload,
  ChevronDown,
  Server,
  CheckCircle2,
  Book,
  Car,
  Sunrise,
  Sunset,
  Home,
  User,
  Shield,
  Camera,
} from "lucide-react";

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
  edit: Edit,

  // 天気・天体アイコン (絵文字の置き換え用)
  sun: Sun, // ☀️ → Sun
  moon: Moon, // 🌙 → Moon
  cloudRain: CloudRain, // 🌧️ → CloudRain
  snowflake: Snowflake, // ❄️ → Snowflake
  cloud: Cloud, // ☁️ → Cloud
  cloudSnow: CloudSnow, // 🌤️ → CloudSnow
  mountain: Mountain, // 🏔️ → Mountain

  // 月の満ち欠け（月齢専用アイコン）
  newMoon: Circle, // 🌑 新月 → Circle (塗りつぶし黒)
  waxingCrescent: Moon, // 🌒 三日月 → Moon
  firstQuarter: Circle, // 🌓 上弦の月 → Circle (半分塗り)
  waxingGibbous: Moon, // 🌔 十三夜月 → Moon
  fullMoon: Circle, // 🌕 満月 → Circle (塗りつぶし白/黄)
  waningGibbous: Moon, // 🌖 十六夜月 → Moon
  lastQuarter: Circle, // 🌗 下弦の月 → Circle (半分塗り)
  waningCrescent: Moon, // 🌘 二十六夜月 → Moon

  // ステータス・ UI アイコン
  mapPin: MapPin, // 📍 → MapPin
  warning: AlertTriangle, // ⚠️ → AlertTriangle
  checkCircle: CheckCircle, // ✅ → CheckCircle
  xCircle: XCircle, // ❌ → XCircle
  route: Route, // 🗺️ → Route
  barChart: BarChart, // 📊 → BarChart
  trendingUp: TrendingUp, // 📈 → TrendingUp
  trendingDown: TrendingDown, // 📉 → TrendingDown

  // アクション・操作アイコン
  rotateCw: RotateCw, // 🔄 → RotateCw
  lock: Lock, // 🔒 → Lock
  unlock: Unlock, // 🔓 → Unlock
  lightbulb: Lightbulb, // 💡 → Lightbulb
  smartphone: Smartphone, // 📱 → Smartphone
  laptop: Laptop, // 💻 → Laptop
  target: Target, // 🎯 → Target
  rocket: Rocket, // 🚀 → Rocket
  fileEdit: FileEdit, // 📝 → FileEdit
  timer: Timer, // ⏰ → Timer
  bell: Bell, // 🔔 → Bell

  // その他の UI 要素
  palette: Palette, // 🎨 → Palette
  trophy: Trophy, // 🏆 → Trophy
  partyPopper: PartyPopper, // 🎉 → PartyPopper (🎊も同じ)
  thumbsUp: ThumbsUp, // 👍 → ThumbsUp
  thumbsDown: ThumbsDown, // 👎 → ThumbsDown
  percent: Percent, // 💯 → Percent
  link: Link, // 🔗 → Link
  clipboardList: ClipboardList, // 📋 → ClipboardList
  bookmark: Bookmark, // 📌 → Bookmark
  paperclip: Paperclip, // 📎 → Paperclip
  gamepad: Gamepad2, // 🎮 → Gamepad2

  // 汎用円形アイコン（その他用途）
  circle: Circle, // 汎用円形

  // 追加のアイコン
  info: Info, // ℹ️ → Info
  navigation: Navigation, // 🧭 → Navigation
  parking: ParkingCircle, // 🅿️ → ParkingCircle
  book: Book, // 📖 → Book
  partlyCloudy: Cloud, // ⛅ → Cloud
  car: Car, // 🚗 → Car
  sunrise: Sunrise, // 🌅 → Sunrise
  sunset: Sunset, // 🌇 → Sunset
  home: Home, // 🏠 → Home
  favorites: User, // ⭐ → User (お気に入り)
  admin: Shield, // 🛡️ → Shield (管理)
  camera: Camera, // 📷 → Camera
  download: Download, // ⬇️ → Download

  // 管理画面追加アイコン
  key: Key, // パスワード変更
  logout: LogOut, // ログアウト
  upload: Upload, // アップロード
  chevronDown: ChevronDown, // ドロップダウン
  server: Server, // サーバー状態
  checkCircle2: CheckCircle2, // 正常稼働
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
  className = "",
  color = "currentColor",
  style,
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
