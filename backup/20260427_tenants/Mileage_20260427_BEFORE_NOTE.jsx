// 백업: 2026-04-27 — tenants/ 폴더 도입 작업 전 원본
// 변경 사유: step="1000" 등 양양대리 mileage 단위 → config 참조로 변경
// 원본 전체: git show HEAD:drivelog-admin/client/src/pages/Mileage.jsx
//
// 핵심 변경 지점:
// - <input type="number" ... step="1000" ... />
//   → step={config.mileage.adjustStepWon}
// - 그 외 마일리지 사용/조정 단위 검증
