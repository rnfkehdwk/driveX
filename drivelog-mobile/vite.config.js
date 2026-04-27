import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\. /g, '/').replace('.', '');

// 빌드 식별자: sw.js 캐시 무효화용. 매 빌드마다 변경되어야 함.
// 초 단위 타임스탬프를 36진수로 압축 (예: 'lz4q8k')
const buildId = Date.now().toString(36);

// sw.js의 자리표시자 __BUILD_ID__를 실제 빌드 ID로 치환하는 플러그인
// public 폴더의 정적 파일은 그대로 복사되므로 transform 훅으로는 처리 안 됨 → writeBundle에서 처리
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
