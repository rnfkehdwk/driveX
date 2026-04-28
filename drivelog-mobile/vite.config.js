import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

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

// 모노레포 루트(C:\Drivelog)의 .env를 명시적으로 로드 (2026-04-29)
// import.meta.env.VITE_* 는 esbuild가 점이 포함된 식별자를 통째로 치환하지 못해 실패하므로
// 별도 전역 변수(__KAKAO_REST_KEY__ 등)로 주입하고 코드에서 그 변수를 참조하도록 함
export default defineConfig(({ mode }) => {
  const rootEnvDir = resolve(__dirname, '..');
  const env = loadEnv(mode, rootEnvDir, ['VITE_']);

  console.log('[vite] env loaded from:', rootEnvDir);
  console.log('[vite] VITE_KAKAO_REST_KEY:', env.VITE_KAKAO_REST_KEY ? `✓ (length=${env.VITE_KAKAO_REST_KEY.length})` : '✗ MISSING');
  console.log('[vite] VITE_KAKAO_JS_KEY:', env.VITE_KAKAO_JS_KEY ? `✓ (length=${env.VITE_KAKAO_JS_KEY.length})` : '✗ MISSING');

  return {
    plugins: [react(), injectSwBuildId()],
    base: '/m/',
    envDir: rootEnvDir,
    define: {
      __BUILD_TIME__: JSON.stringify(buildTime),
      __BUILD_ID__: JSON.stringify(buildId),
      // 카카오 키를 단일 식별자 전역 변수로 주입 (esbuild 호환)
      __KAKAO_REST_KEY__: JSON.stringify(env.VITE_KAKAO_REST_KEY || ''),
      __KAKAO_JS_KEY__: JSON.stringify(env.VITE_KAKAO_JS_KEY || ''),
    },
    server: {
      port: 5174,
      proxy: {
        '/api': 'http://localhost:3001'
      }
    }
  };
});
