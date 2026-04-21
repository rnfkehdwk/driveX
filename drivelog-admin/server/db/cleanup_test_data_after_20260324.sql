-- cleanup_test_data_after_20260324.sql
-- 2026-03-24 00:00:00 이후 테스트 데이터 삭제
-- 대상: 운행(rides) + 콜(calls) + 관련 마일리지(customer_mileage) + customers.mileage_balance 리셋
--
-- ⚠️ 실행 전 반드시 백업 확인!
-- ⚠️ 순서 중요: 자식 테이블 → 부모 테이블 순으로 삭제
--
-- 실행 방법 (NAS):
--   sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
--     < /volume1/docker/drivelog/server/db/cleanup_test_data_after_20260324.sql
--
-- 또는 한 줄씩 실행하고 싶으면:
--   sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db

-- ============================================================
-- 0. 삭제 전 현황 확인 (건수만 미리 보기)
-- ============================================================
SELECT '=== 삭제 대상 건수 확인 ===' AS step;

SELECT 'customer_mileage (3/24 이후)' AS target,
       COUNT(*) AS cnt
FROM customer_mileage WHERE created_at >= '2026-03-24 00:00:00';

SELECT 'manual_gps_points (3/24 이후 rides)' AS target,
       COUNT(*) AS cnt
FROM manual_gps_points WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT 'settlement_rides (3/24 이후 rides)' AS target,
       COUNT(*) AS cnt
FROM settlement_rides WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT 'rides (3/24 이후)' AS target,
       COUNT(*) AS cnt
FROM rides WHERE created_at >= '2026-03-24 00:00:00';

SELECT 'calls (3/24 이후)' AS target,
       COUNT(*) AS cnt
FROM calls WHERE created_at >= '2026-03-24 00:00:00';

-- ============================================================
-- 1. customer_mileage — 3/24 이후 적립/사용 내역 삭제
-- ============================================================
SELECT '=== Step 1: customer_mileage 삭제 ===' AS step;

DELETE FROM customer_mileage
WHERE created_at >= '2026-03-24 00:00:00';

SELECT ROW_COUNT() AS deleted_customer_mileage;

-- ============================================================
-- 2. customers.mileage_balance 재계산
--    남은 customer_mileage 기록 기준으로 정확하게 재산출
--    (3/24 이전 기록의 마지막 balance_after가 현재 잔액이 되어야 함)
-- ============================================================
SELECT '=== Step 2: mileage_balance 재계산 ===' AS step;

-- 방법: customer_mileage에 남은 기록이 있으면 가장 최근의 balance_after 사용
--       남은 기록이 없으면 0으로 리셋
UPDATE customers c
LEFT JOIN (
  SELECT customer_id, balance_after
  FROM customer_mileage cm1
  WHERE cm1.id = (
    SELECT MAX(cm2.id)
    FROM customer_mileage cm2
    WHERE cm2.customer_id = cm1.customer_id
  )
) latest ON c.customer_id = latest.customer_id
SET c.mileage_balance = COALESCE(latest.balance_after, 0)
WHERE c.company_id = 3;

SELECT COUNT(*) AS updated_customers,
       SUM(mileage_balance) AS total_mileage_after
FROM customers WHERE company_id = 3;

-- ============================================================
-- 3. manual_gps_points — 삭제 대상 rides의 GPS 기록
-- ============================================================
SELECT '=== Step 3: manual_gps_points 삭제 ===' AS step;

DELETE FROM manual_gps_points
WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT ROW_COUNT() AS deleted_gps_points;

-- ============================================================
-- 4. settlement_rides — 삭제 대상 rides의 정산 연결
-- ============================================================
SELECT '=== Step 4: settlement_rides 삭제 ===' AS step;

DELETE FROM settlement_rides
WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT ROW_COUNT() AS deleted_settlement_rides;

-- ============================================================
-- 5. rides — 3/24 이후 운행 기록 삭제
-- ============================================================
SELECT '=== Step 5: rides 삭제 ===' AS step;

DELETE FROM rides
WHERE created_at >= '2026-03-24 00:00:00';

SELECT ROW_COUNT() AS deleted_rides;

-- ============================================================
-- 6. calls — 3/24 이후 콜 삭제
--    (rides.call_id FK가 있었지만 rides를 먼저 삭제했으므로 안전)
-- ============================================================
SELECT '=== Step 6: calls 삭제 ===' AS step;

DELETE FROM calls
WHERE created_at >= '2026-03-24 00:00:00';

SELECT ROW_COUNT() AS deleted_calls;

-- ============================================================
-- 7. 삭제 후 현황 확인
-- ============================================================
SELECT '=== 삭제 완료 — 남은 데이터 현황 ===' AS step;

SELECT 'rides' AS tbl, COUNT(*) AS remaining FROM rides WHERE company_id = 3
UNION ALL
SELECT 'calls', COUNT(*) FROM calls WHERE company_id = 3
UNION ALL
SELECT 'customer_mileage', COUNT(*) FROM customer_mileage WHERE company_id = 3
UNION ALL
SELECT 'customers (총)', COUNT(*) FROM customers WHERE company_id = 3
UNION ALL
SELECT 'customers (마일리지>0)', COUNT(*) FROM customers WHERE company_id = 3 AND mileage_balance > 0;

SELECT '=== 완료 ===' AS step;
