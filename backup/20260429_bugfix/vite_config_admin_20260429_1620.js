// === 백업: drivelog-admin/client/vite.config.js (2026-04-29 1620) ===
// 작업: envDir 설정 추가 전 백업

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\. /g, '/').replace('.', '');

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
