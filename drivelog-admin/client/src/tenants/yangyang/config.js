/**
 * 양양대리 (company_id=3) 특화 설정
 *
 * 이 파일은 양양대리 사장님 요청/관행을 한 곳에 모아둔 단일 진실의 원천(SoT).
 * 양양대리 관련 코드 이슈가 있을 때 가장 먼저 확인하는 파일입니다.
 *
 * DB 기반 설정 (코드 외 위치):
 *   - 마일리지 적립률 10% → fare_policies.mileage_earn_pct
 *   - 시급 12,000원/h, ROUND_DOWN → company_pay_settings
 *   - 결제구분 코드 001~006 → payment_types
 *   - settlement_groups (기사보유/회사보유) → settlement_groups
 *
 * 작성일: 2026-04-27
 */

import common from '../_common/config.js';

const yangyangConfig = {
  ...common,

  // 양양대리: 0.5시간 단위로 근무시간 입력 (시급제 패턴)
  // 사장님 요구: "콜 가다가 출근, 콜 끝나고 퇴근이라 정확한 시각 모름"
  attendance: {
    ...common.attendance,
    minHourUnit: 0.5,
    showHalfHour: true,
  },

  // 양양대리: 마일리지 사용은 5,000원 단위 (사장님 정책)
  mileage: {
    ...common.mileage,
    useUnitWon: 5000,
  },

  // 양양대리 브랜딩
  brand: {
    ...common.brand,
    shortName: '양양대리',
  },
};

export default yangyangConfig;
