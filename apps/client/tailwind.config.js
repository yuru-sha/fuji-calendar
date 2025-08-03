/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 富士山ブランドカラー - 空と山をイメージした青系統
        fuji: {
          50: '#f0f9ff',   // 最も薄い空色
          100: '#e0f2fe',  // 薄い空色
          200: '#bae6fd',  // 明るい空色
          300: '#7dd3fc',  // 中間の空色
          400: '#38bdf8',  // 鮮やかな空色
          500: '#0891b2',  // メイン富士色（深い空色）
          600: '#0e7490',  // 少し深い富士色
          700: '#155e75',  // 濃い富士色
          800: '#164e63',  // より濃い富士色
          900: '#0f3847',  // 最も濃い富士色（山影）
        },
        // セカンダリーカラー - 太陽とダイヤモンド富士
        sun: {
          50: '#fefce8',   // 薄い黄色
          100: '#fef3c7',  // 明るい黄色
          200: '#fde68a',  // 中間の黄色
          300: '#fcd34d',  // 鮮やかな黄色
          400: '#fbbf24',  // オレンジがかった黄色
          500: '#f59e0b',  // メインサン色
          600: '#d97706',  // 深いオレンジ
          700: '#b45309',  // より深いオレンジ
          800: '#92400e',  // 濃いオレンジ
          900: '#78350f',  // 最も濃いオレンジ
        },
        // 月とパール富士
        moon: {
          50: '#f8fafc',   // 薄いシルバー
          100: '#f1f5f9',  // 明るいシルバー
          200: '#e2e8f0',  // 中間のシルバー
          300: '#cbd5e1',  // グレーがかったシルバー
          400: '#94a3b8',  // 中間のグレー
          500: '#64748b',  // メインムーン色
          600: '#475569',  // 深いグレー
          700: '#334155',  // より深いグレー
          800: '#1e293b',  // 濃いグレー
          900: '#0f172a',  // 最も濃いグレー
        },
        // 成功・エラー・警告などの状態色
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // ニュートラルグレー（高いコントラスト比を保証）
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // 既存の primary を fuji にエイリアス
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0891b2',
          600: '#0e7490',
          700: '#155e75',
          800: '#164e63',
          900: '#0f3847',
        },
      },
      maxWidth: {
        '8xl': '88rem',
      },
      // デザインシステム: スペーシング
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      // デザインシステム: 影
      boxShadow: {
        'fuji-sm': '0 1px 2px 0 rgba(8, 145, 178, 0.05)',
        'fuji': '0 4px 6px -1px rgba(8, 145, 178, 0.1), 0 2px 4px -1px rgba(8, 145, 178, 0.06)',
        'fuji-md': '0 10px 15px -3px rgba(8, 145, 178, 0.1), 0 4px 6px -2px rgba(8, 145, 178, 0.05)',
        'fuji-lg': '0 20px 25px -5px rgba(8, 145, 178, 0.1), 0 10px 10px -5px rgba(8, 145, 178, 0.04)',
        'fuji-xl': '0 25px 50px -12px rgba(8, 145, 178, 0.25)',
        'fuji-2xl': '0 25px 50px -12px rgba(8, 145, 178, 0.25)',
        'fuji-inner': 'inset 0 2px 4px 0 rgba(8, 145, 178, 0.06)',
        'sun': '0 4px 14px rgba(245, 158, 11, 0.4)',
        'moon': '0 4px 14px rgba(100, 116, 139, 0.4)',
      },
      // デザインシステム: アニメーション
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'pulse-gentle': 'pulse-gentle 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // デザインシステム: 境界線の丸み
      borderRadius: {
        'fuji': '12px',
        'fuji-lg': '16px',
        'fuji-xl': '24px',
      },
    },
  },
  plugins: [],
};