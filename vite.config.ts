import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/client': path.resolve(__dirname, 'src/client'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001, // 開発時のフロントエンド専用ポート
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});