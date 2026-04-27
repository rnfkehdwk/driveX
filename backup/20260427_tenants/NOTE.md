# 백업 정보 — 2026-04-27 tenants/ 폴더 도입

## 목적
양양대리 특화 코드/설정을 `tenants/yangyang/config.js`에 모아서 코드 이슈 추적을 쉽게 만들기.

## 변경 대상

### 신규 파일
- `drivelog-admin/client/src/tenants/_common/config.js` — 모든 업체 기본값
- `drivelog-admin/client/src/tenants/yangyang/config.js` — 양양대리 특화 설정
- `drivelog-admin/client/src/tenants/index.js` — company_id → config 매핑
- `drivelog-admin/client/src/hooks/useTenantConfig.js` — 훅

### 수정 파일
- `drivelog-admin/client/src/pages/Attendance.jsx` — 0.5h 단위 HOUR_OPTIONS → config 참조
- `drivelog-admin/client/src/pages/Mileage.jsx` — step="1000" → config 참조 + **submitAdjust의 5000원 단위 검증 → config 참조 (일관성 마무리)**
- `drivelog-admin/client/src/pages/FareSettlement.jsx` — "대리업체" 기본값 → config.brand.shortName

## config 스키마

```javascript
{
  attendance: {
    minHourUnit: 0.5 | 1,         // 양양대리: 0.5
    showHalfHour: true | false,
  },
  mileage: {
    adjustStepWon: 1000,          // 수동 조정 step
    useUnitWon: 5000 | 1000,      // 양양대리: 5000
  },
  brand: {
    shortName: '대리업체',        // 양양대리: '양양대리'
  },
}
```

## 보안/동작 보존 약속
- **양양대리(company_id=3)의 동작은 변하지 않아야 함**
- config 기본값은 일반적 패턴이고, 양양대리 config가 현재 하드코딩된 값과 동일
- 사용자(admin) UX는 0% 변화

## 원본 백업
- `Attendance_20260427_BEFORE.jsx`
- `Mileage_20260427_BEFORE.jsx`
- `FareSettlement_20260427_BEFORE.jsx`

## 검증 체크리스트
- [ ] 양양대리 사장님 로그인
- [ ] 근무시간 입력 (Attendance) — 0.5h 옵션 그대로 보임
- [ ] 마일리지 수동 조정 (Mileage 모달) — step 1000원 그대로 동작
- [ ] 운임정산서 카톡 공유 (FareSettlement) — "양양대리" 라벨 노출
- [ ] 다른 업체 가입 시 (가상 시나리오): config 미등록이면 _common 기본값 자동 적용되는지 확인
