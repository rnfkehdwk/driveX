// === 백업: drivelog-mobile/vite.config.js (2026-04-29 1620) ===
// 작업: envDir 설정 추가 전 백업

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\. /g, '/').replace('.', '');

const buildId = Date.now().toString(36);

function injectSwBuildId() {
  return {
    name: 'inject-sw-build-id',
    apply: 'build',
    async writeBundle(options) {
      const { readFile, writeFile } = await import('fs/promises');
      const { join } = await import('path');
      const swPath = join(options.dir || 'dist', 'sw.js');
      try {
        let content = await readFile(swPath, 'utf-8');
        const replaced = content.replace(/__BUILD_ID__/g, buildId);
        await writeFile(swPath, replaced, 'utf-8');
        console.log(`[inject-sw-build-id] sw.js BUILD_ID = ${buildId}`);
      } catch (err) {
        console.warn('[inject-sw-build-id] sw.js 치환 실패:', err.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), injectSwBuildId()],
  base: '/m/',
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
