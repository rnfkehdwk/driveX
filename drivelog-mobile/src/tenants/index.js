/**
 * Mobile tenants 진입점 — company_id로 업체별 config 조회
 *
 * 사용법: 보통은 useTenantConfig 훅 사용
 *   import useTenantConfig from '../hooks/useTenantConfig';
 *   const config = useTenantConfig();
 *
 * 새 업체 추가:
 *   1. tenants/{slug}/config.js 생성
 *   2. 아래 import + TENANT_CONFIGS 매핑 추가
 *
 * admin과 동일한 패턴으로 구성. 양쪽이 매칭되어야 함.
 *
 * 작성일: 2026-04-27
 */

import commonConfig from './_common/config.js';
import yangyangConfig from './yangyang/config.js';

// company_id → config 매핑
const TENANT_CONFIGS = {
  3: yangyangConfig,    // 양양대리
};

export function getTenantConfig(companyId) {
  if (companyId == null) return commonConfig;
  return TENANT_CONFIGS[Number(companyId)] || commonConfig;
}

export { commonConfig };
export default getTenantConfig;
