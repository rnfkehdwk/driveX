import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const buildTime = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\. /g, '/').replace('.', '');

// 모노레포 루트(C:\Drivelog)의 .env를 명시적으로 로드 (2026-04-29)
// import.meta.env.VITE_* 는 esbuild가 점이 포함된 식별자를 통째로 치환하지 못해 실패하므로
// 별도 전역 변수(__KAKAO_REST_KEY__ 등)로 주입하고 코드에서 그 변수를 참조하도록 함
export default defineConfig(({ mode }) => {
  const rootEnvDir = resolve(__dirname, '../..');
  const env = loadEnv(mode, rootEnvDir, ['VITE_']);

  console.log('[vite] env loaded from:', rootEnvDir);
  console.log('[vite] VITE_KAKAO_REST_KEY:', env.VITE_KAKAO_REST_KEY ? `✓ (length=${env.VITE_KAKAO_REST_KEY.length})` : '✗ MISSING');
  console.log('[vite] VITE_KAKAO_JS_KEY:', env.VITE_KAKAO_JS_KEY ? `✓ (length=${env.VITE_KAKAO_JS_KEY.length})` : '✗ MISSING');

  return {
    plugins: [react()],
    base: '/admin/',
    envDir: rootEnvDir,
    define: {
      __BUILD_TIME__: JSON.stringify(buildTime),
      // 카카오 키를 단일 식별자 전역 변수로 주입 (esbuild 호환)
      __KAKAO_REST_KEY__: JSON.stringify(env.VITE_KAKAO_REST_KEY || ''),
      __KAKAO_JS_KEY__: JSON.stringify(env.VITE_KAKAO_JS_KEY || ''),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001'
      }
    }
  };
});
