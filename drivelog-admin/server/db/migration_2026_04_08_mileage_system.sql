-- ============================================================
-- DriveLog 마일리지 시스템 마이그레이션 (최소 버전)
-- 작성일: 2026-04-08
--
-- 변경사항:
-- 1. mileage_balance NULL → 0 초기화 (안전)
--
-- ⚠️ 주의:
-- - 기존 customer_mileage 테이블 + fare_policies.mileage_earn_pct 그대로 활용
-- - 마일리지 사용은 결제구분과 분리 (운행 작성 모달에 별도 input)
-- - payment_types 변경 불필요
-- ============================================================

UPDATE customers SET mileage_balance = 0 WHERE mileage_balance IS NULL;
