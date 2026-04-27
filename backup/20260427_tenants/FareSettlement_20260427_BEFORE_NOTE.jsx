// 백업: 2026-04-27 — tenants/ 폴더 도입 작업 전 원본
// 변경 사유: '대리업체' 기본값 → config.brand.shortName 참조
// 원본 전체: git show HEAD:drivelog-admin/client/src/pages/FareSettlement.jsx
//
// 핵심 변경 지점:
// - lines.push(`📊 [${companyName || '대리업체'}] 운임정산서`);
//   → lines.push(`📊 [${companyName || config.brand.shortName}] 운임정산서`);
