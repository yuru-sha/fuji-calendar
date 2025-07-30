import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // マニュアルチャンク分割でバンドルサイズを最適化
        manualChunks: {
          // ベンダーライブラリを分離
          vendor: ['react', 'react-dom'],
          
          // ルーティングライブラリを分離
          router: ['react-router-dom'],
          
          // 天体計算ライブラリを分離（大きなライブラリ）
          astronomy: ['astronomy-engine'],
          
          // 地図関連ライブラリを分離
          maps: ['leaflet'],
          
          // UIユーティリティを分離
          ui: ['@headlessui/react', '@heroicons/react']
        },
        
        // アセットファイル名の最適化
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const extType = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        // JSチャンクファイル名の最適化
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.split('.')[0] 
            : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        
        // エントリーファイル名の最適化
        entryFileNames: `assets/js/[name]-[hash].js`
      }
    },
    
    // バンドルサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000,
    
    // ターゲットブラウザの最適化
    target: ['es2020', 'chrome80', 'safari13'],
    
    // ソースマップを本番では無効化（サイズ削減）
    sourcemap: process.env.NODE_ENV === 'development',
    
    // 圧縮設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log'] : []
      }
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/client': path.resolve(__dirname, 'src/client'),
      '@/ui': path.resolve(__dirname, 'src/shared/ui'),
      '@/api': path.resolve(__dirname, 'src/shared/api'),
      '@/features': path.resolve(__dirname, 'src/client/features'),
    },
  },
  
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  
  // 開発サーバーの最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'leaflet'
    ],
    exclude: ['astronomy-engine'] // 重いライブラリは除外
  },
  
  // CSS設定
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  }
})