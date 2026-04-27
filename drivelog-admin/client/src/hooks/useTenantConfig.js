/**
 * useTenantConfig — 현재 로그인 사용자의 company_id로 업체별 config 자동 선택
 *
 * 사용법:
 *   import useTenantConfig from '../hooks/useTenantConfig';
 *
 *   function MyComponent() {
 *     const config = useTenantConfig();
 *     return <input step={config.mileage.adjustStepWon} />;
 *   }
 *
 * 동작:
 *   - localStorage의 'user'에서 company_id 읽음
 *   - tenants/index.js에서 매핑된 config 조회
 *   - 매핑 없으면 _common/config.js (기본값)
 *
 * 주의:
 *   - 로그인 후 user 정보가 localStorage에 저장된 시점부터 정상 동작
 *   - MASTER 사용자는 company_id가 NULL이라 commonConfig 사용
 *
 * 작성일: 2026-04-27
 */

import { useMemo } from 'react';
import { getTenantConfig } from '../tenants';

export default function useTenantConfig() {
  return useMemo(() => {
    try {
      const userJson = localStorage.getItem('user');
      if (!userJson) return getTenantConfig(null);
      const user = JSON.parse(userJson);
      return getTenantConfig(user?.company_id);
    } catch {
      return getTenantConfig(null);
    }
  }, []);
}
