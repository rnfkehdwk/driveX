# 백업 정보 — 2026-04-27 mobile tenants/ 도입

## 목적
admin과 동일한 패턴으로 mobile에도 업체별 config 시스템 도입.
양양대리 특화 마일리지 5,000원 단위 + 적립률 10%를 config로 분리.

## 변경 대상

### 신규 파일
- `drivelog-mobile/src/tenants/_common/config.js`
- `drivelog-mobile/src/tenants/yangyang/config.js`
- `drivelog-mobile/src/tenants/index.js`
- `drivelog-mobile/src/hooks/useTenantConfig.js`

### 수정 파일
- `drivelog-mobile/src/components/MileageUseSelect.jsx`
  - `const UNIT = 5000` → `tenantConfig.mileage.useUnitWon`
  - 안내 문구의 "5,000원 미만" → 동적
- `drivelog-mobile/src/pages/RideNew.jsx`
  - `<MileageUseSelect ... earnPct={10} />` → `earnPct={tenantConfig.mileage.earnPct}`

## config 스키마

admin과 동일하되 mobile에 필요한 것 위주:

```javascript
{
  mileage: {
    useUnitWon: 1000 | 5000,   // 양양대리: 5000
    earnPct: 0 | 10,           // 양양대리: 10
  },
  brand: {
    shortName: '대리업체' | '양양대리',
  },
}
```

attendance는 mobile에서 사용 안 함. Mobile 전용으로 mileage 위주.

## 보안/동작 보존
- 양양대리 동작 변화 0%
- 5,000원 단위 칩 옵션 → 동일
- 10% 예상 적립 미리보기 → 동일

## 별도 이슈 (이번 작업에 포함 안 됨)
- `RideNew.jsx`의 `KAKAO_REST_KEY` 하드코딩
  - 양양대리 카카오 API 키
  - tenants/ config가 아니라 환경변수로 분리해야 함 (별도 작업)

## 원본 백업
- `MileageUseSelect_20260427_BEFORE.jsx`
- `RideNew_20260427_BEFORE_NOTE.jsx` (placeholder, 너무 커서 git 복원)

## 검증 체크리스트
- [ ] 양양대리 운행 작성 → 마일리지 칩 셀렉터 5,000원 단위 표시
- [ ] 마일리지 사용 시 예상 적립 10% 표시
- [ ] 잔액 0원 고객은 마일리지 영역 미표시
- [ ] 운임 5,000원 미만일 때 안내 메시지 표시
