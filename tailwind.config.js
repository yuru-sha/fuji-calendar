/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',   // 最も薄い青
          100: '#dbeafe',  // とても薄い青
          200: '#bfdbfe',  // 薄い青
          300: '#93c5fd',  // ライトブルー
          400: '#60a5fa',  // 明るい青
          500: '#3b82f6',  // メインブルー
          600: '#2563eb',  // 濃い青
          700: '#1d4ed8',  // さらに濃い青
          800: '#1e40af',  // ダークブルー
          900: '#1e3a8a',  // 最も濃い青
        },
        secondary: {
          50: '#fef7f0',   // 朝日の輝き
          100: '#fed7aa',  // 黄金の陽光
          200: '#feb273',  // 温かな日差し
          300: '#fd8d3c',  // 夕焼けのオレンジ
          400: '#e6692e',  // 山頂の赤
          500: '#dc2626',  // ダイヤモンド富士の赤
          600: '#b21e20',  // 深い夕紅
          700: '#8b1a1b',  // 山肌の赤茶
          800: '#641615',  // 暗い山影
          900: '#3d100f',  // 夜の静寂
        },
        accent: {
          50: '#f7fee7',   // 新緑の輝き
          100: '#ecfccb',  // 春の若葉
          200: '#d9f99d',  // 山の緑
          300: '#bef264',  // 森の輝き
          400: '#a3e635',  // 生命の緑
          500: '#84cc16',  // 富士の森林
          600: '#65a30d',  // 深い森
          700: '#4d7c0f',  // 山の緑陰
          800: '#365314',  // 針葉樹の濃緑
          900: '#1a2e05',  // 森の奥深く
        },
        neutral: {
          50: '#fafafa',   // 雪の白
          100: '#f5f5f5',  // 雲の白
          200: '#e5e5e5',  // 薄霞
          300: '#d4d4d4',  // 遠山の霞
          400: '#a3a3a3',  // 山の影
          500: '#737373',  // 岩肌のグレー
          600: '#525252',  // 山体の影
          700: '#404040',  // 深い岩影
          800: '#262626',  // 夜の山
          900: '#171717',  // 深淵の黒
        },
        surface: {
          primary: '#ffffff',     // 純白の雪
          secondary: '#f8fafc',   // 朝霧の白
          elevated: '#ffffff',    // 雲上の白
          overlay: 'rgba(30, 107, 150, 0.95)', // 富士の影のオーバーレイ
        },
        status: {
          success: '#10b981',     // 撮影成功の緑
          warning: '#f59e0b',     // 注意の黄
          error: '#ef4444',       // 警告の赤
          info: '#3b82f6',        // 情報の青
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          'YuGothic',
          '"Meiryo"',
          'sans-serif'
        ],
        display: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          'Monaco',
          '"Cascadia Code"',
          '"Roboto Mono"',
          'Consolas',
          '"Courier New"',
          'monospace'
        ]
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '0.025em' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0.025em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '0.025em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '0.025em' }],
        // 日本語コンテンツ専用サイズ
        'jp-sm': ['0.875rem', { lineHeight: '1.7', letterSpacing: '0.05em' }],
        'jp-base': ['1rem', { lineHeight: '1.7', letterSpacing: '0.05em' }],
        'jp-lg': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0.05em' }],
        'jp-xl': ['1.25rem', { lineHeight: '1.6', letterSpacing: '0.05em' }],
        'jp-2xl': ['1.5rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
      },
      fontWeight: {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      maxWidth: {
        '8xl': '1280px', // カスタム最大幅
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
        '42': '10.5rem',  // 168px
        '46': '11.5rem',  // 184px
        '50': '12.5rem',  // 200px
        '54': '13.5rem',  // 216px
        '58': '14.5rem',  // 232px
        '62': '15.5rem',  // 248px
        '66': '16.5rem',  // 264px
        '70': '17.5rem',  // 280px
        '74': '18.5rem',  // 296px
        '78': '19.5rem',  // 312px
        '82': '20.5rem',  // 328px
        '86': '21.5rem',  // 344px
        '90': '22.5rem',  // 360px
        '94': '23.5rem',  // 376px
        '98': '24.5rem',  // 392px
      },
      borderRadius: {
        'xs': '0.125rem',   // 2px
        'sm': '0.25rem',    // 4px
        'default': '0.375rem', // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px
        '3xl': '2rem',      // 32px
        '4xl': '2.5rem',    // 40px
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(3, 36, 51, 0.12), 0 1px 2px rgba(3, 36, 51, 0.24)',
        'elevation-2': '0 3px 6px rgba(3, 36, 51, 0.16), 0 3px 6px rgba(3, 36, 51, 0.23)',
        'elevation-3': '0 10px 20px rgba(3, 36, 51, 0.19), 0 6px 6px rgba(3, 36, 51, 0.23)',
        'elevation-4': '0 14px 28px rgba(3, 36, 51, 0.25), 0 10px 10px rgba(3, 36, 51, 0.22)',
        'elevation-5': '0 19px 38px rgba(3, 36, 51, 0.30), 0 15px 12px rgba(3, 36, 51, 0.22)',
        'fuji-glow': '0 0 20px rgba(30, 107, 150, 0.3), 0 0 40px rgba(30, 107, 150, 0.2)',
        'diamond-glow': '0 0 15px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.2)',
        'pearl-glow': '0 0 15px rgba(168, 85, 247, 0.4), 0 0 30px rgba(168, 85, 247, 0.2)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}