-- cleanup_test_data_after_20260324_fix.sql
-- Step 2~6 재실행 (Step 1 customer_mileage 삭제는 이미 완료)
-- 수정: customer_mileage PK는 mileage_id (id가 아님)

-- ============================================================
-- 2. customers.mileage_balance 재계산 (수정됨)
-- ============================================================
SELECT '=== Step 2: mileage_balance 재계산 ===' AS step;

UPDATE customers c
LEFT JOIN (
  SELECT customer_id, balance_after
  FROM customer_mileage cm1
  WHERE cm1.mileage_id = (
    SELECT MAX(cm2.mileage_id)
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
-- 3. manual_gps_points
-- ============================================================
SELECT '=== Step 3: manual_gps_points 삭제 ===' AS step;

DELETE FROM manual_gps_points
WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT ROW_COUNT() AS deleted_gps_points;

-- ============================================================
-- 4. settlement_rides
-- ============================================================
SELECT '=== Step 4: settlement_rides 삭제 ===' AS step;

DELETE FROM settlement_rides
WHERE ride_id IN (
  SELECT ride_id FROM rides WHERE created_at >= '2026-03-24 00:00:00'
);

SELECT ROW_COUNT() AS deleted_settlement_rides;

-- ============================================================
-- 5. rides
-- ============================================================
SELECT '=== Step 5: rides 삭제 ===' AS step;

DELETE FROM rides
WHERE created_at >= '2026-03-24 00:00:00';

SELECT ROW_COUNT() AS deleted_rides;

-- ============================================================
-- 6. calls
-- ============================================================
SELECT '=== Step 6: calls 삭제 ===' AS step;

DELETE FROM calls
WHERE created_at >= '2026-03-24 00:00:00';

SELECT ROW_COUNT() AS deleted_calls;

-- ============================================================
-- 7. 최종 확인
-- ============================================================
SELECT '=== 삭제 완료 — 남은 데이터 ===' AS step;

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
