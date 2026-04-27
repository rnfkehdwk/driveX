/**
 * DriveLog — 공통 기본값 (모든 업체에 적용되는 fallback)
 *
 * 업체별 config는 이 파일을 spread하고 일부만 오버라이드합니다.
 *   예: tenants/yangyang/config.js
 *       export default { ...common, attendance: { minHourUnit: 0.5, ... } }
 *
 * 새 업체 추가 시:
 *   1. tenants/{slug}/config.js 생성
 *   2. tenants/index.js의 TENANT_CONFIGS에 매핑 추가
 *   3. 끝. 코드 변경 없이 동작.
 *
 * 작성일: 2026-04-27
 */

const commonConfig = {
  // 근무시간 입력 (시급제 업체에만 의미 있음)
  attendance: {
    minHourUnit: 1,           // 기본: 1시간 단위 입력
    showHalfHour: false,      // 0.5시간 옵션 표시 여부
    maxHours: 24,             // 입력 가능 최대 시간
  },

  // 마일리지
  mileage: {
    adjustStepWon: 1000,      // 마일리지 수동 조정 단위 (input step)
    useUnitWon: 1000,         // 운행 시 마일리지 사용 단위
  },

  // 브랜딩 (공유/표시)
  brand: {
    shortName: '대리업체',    // 카톡 공유, 정산서 등에서 사용
  },
};

export default commonConfig;
