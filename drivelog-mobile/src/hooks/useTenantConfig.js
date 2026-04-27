/**
 * useTenantConfig — Mobile
 *
 * 현재 로그인 사용자의 company_id로 업체별 config 자동 선택.
 * admin의 hooks/useTenantConfig.js와 동일 동작.
 *
 * 사용법:
 *   import useTenantConfig from '../hooks/useTenantConfig';
 *
 *   function MyComponent() {
 *     const config = useTenantConfig();
 *     return <div>{config.mileage.useUnitWon}</div>;
 *   }
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
