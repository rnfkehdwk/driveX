/**
 * tenants 진입점 — company_id로 업체별 config 조회
 *
 * 사용법:
 *   import { getTenantConfig } from '@/tenants';
 *   const config = getTenantConfig(user.company_id);
 *
 * 단, 컴포넌트에서는 보통 useTenantConfig 훅을 사용:
 *   import useTenantConfig from '@/hooks/useTenantConfig';
 *   const config = useTenantConfig();
 *
 * 새 업체 추가:
 *   1. tenants/{slug}/config.js 생성
 *   2. 아래 import + TENANT_CONFIGS 매핑 추가
 *   3. 끝
 *
 * 작성일: 2026-04-27
 */

import commonConfig from './_common/config.js';
import yangyangConfig from './yangyang/config.js';

// company_id → config 매핑
// 미등록 업체는 자동으로 commonConfig (기본값) 적용
const TENANT_CONFIGS = {
  3: yangyangConfig,    // 양양대리
};

export function getTenantConfig(companyId) {
  if (companyId == null) return commonConfig;
  return TENANT_CONFIGS[Number(companyId)] || commonConfig;
}

export { commonConfig };
export default getTenantConfig;
