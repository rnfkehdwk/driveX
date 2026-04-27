/**
 * DriveLog Mobile — 공통 기본값 (모든 업체에 적용되는 fallback)
 *
 * admin의 tenants/_common/config.js와 동일한 스키마지만,
 * mobile에서 사용하는 항목 위주로 정의됨.
 *
 * 새 업체 추가 시:
 *   1. tenants/{slug}/config.js 생성
 *   2. tenants/index.js의 TENANT_CONFIGS에 매핑 추가
 *   3. 끝. 코드 변경 없이 동작.
 *
 * 작성일: 2026-04-27
 */

const commonConfig = {
  // 마일리지 (운행 작성 시 사용)
  mileage: {
    useUnitWon: 1000,         // 마일리지 사용 단위 (양양대리: 5000)
    earnPct: 0,               // 적립률 % (양양대리: 10. 0이면 적립 미리보기 숨김)
  },

  // 브랜딩
  brand: {
    shortName: '대리업체',    // 양양대리: '양양대리'
  },
};

export default commonConfig;
