/**
 * 양양대리 (company_id=3) 특화 설정 — Mobile
 *
 * admin의 tenants/yangyang/config.js와 짝.
 * mobile에서는 마일리지 관련 설정이 핵심.
 *
 * DB 기반 설정 (코드 외 위치):
 *   - 마일리지 적립률 10% → fare_policies.mileage_earn_pct (백엔드)
 *     단, 모바일 UI 미리보기에서만 사용하는 값은 여기 명시
 *
 * 작성일: 2026-04-27
 */

import common from '../_common/config.js';

const yangyangConfig = {
  ...common,

  // 양양대리: 마일리지 사용 5,000원 단위, 적립률 10%
  mileage: {
    ...common.mileage,
    useUnitWon: 5000,
    earnPct: 10,
  },

  // 양양대리 브랜딩
  brand: {
    ...common.brand,
    shortName: '양양대리',
  },
};

export default yangyangConfig;
