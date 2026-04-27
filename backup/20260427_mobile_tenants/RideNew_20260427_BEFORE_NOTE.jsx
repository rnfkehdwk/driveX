// 백업: 2026-04-27 — mobile tenants/ 도입 작업 전 원본
// 변경 사유: <MileageUseSelect ... earnPct={10} /> → earnPct={tenantConfig.mileage.earnPct}
// 원본 전체: git show HEAD:drivelog-mobile/src/pages/RideNew.jsx
//
// 핵심 변경 지점:
// - <MileageUseSelect customerId={form.customer_id} totalFare={...} value={form.mileage_used} earnPct={10} onChange={(v) => up('mileage_used')(v)} />
//   → earnPct={tenantConfig.mileage.earnPct}
// - + import useTenantConfig + 컴포넌트 안에서 const tenantConfig = useTenantConfig();
//
// 별도 이슈: KAKAO_REST_KEY 하드코딩 — tenants/ 작업과 무관, 별도 작업 필요
