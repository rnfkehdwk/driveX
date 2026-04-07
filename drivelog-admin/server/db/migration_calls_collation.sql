-- ====================================================
-- calls 테이블 collation 정상화 (2026-04-07)
-- utf8mb4_general_ci → utf8mb4_unicode_ci
--
-- 배경:
-- - 전체 31개 테이블 중 calls 1개만 utf8mb4_general_ci
-- - 나머지 30개는 utf8mb4_unicode_ci (표준)
-- - calls vs payment_types JOIN 시 collation 충돌 발생
--
-- 안전성:
-- - calls 테이블의 모든 FK는 BIGINT 컬럼이므로 collation 무관
-- - 데이터 손실 없음 (utf8mb4 → utf8mb4, charset은 동일)
-- - 한국어 검색 정렬 결과는 unicode_ci가 더 정확함 (general_ci는 단순 비교)
-- - 작은 테이블이라 락 시간 1초 미만 예상
--
-- 실행:
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_calls_collation.sql
--
-- 멱등성: 이미 unicode_ci면 SKIP
-- ====================================================

-- 1. 변환 전 상태
SELECT '=== 변환 전 calls collation ===' AS info;
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls';


-- 2. 이미 unicode_ci면 SKIP
SET @current_collation := (
  SELECT TABLE_COLLATION
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls'
);

SET @sql := IF(@current_collation = 'utf8mb4_unicode_ci',
  'SELECT "calls table is already utf8mb4_unicode_ci, skip" AS info',
  'ALTER TABLE calls CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3. 변환 후 상태
SELECT '=== 변환 후 calls collation ===' AS info;
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls';

SELECT '=== 변환 후 calls 컬럼별 collation ===' AS info;
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls'
  AND CHARACTER_SET_NAME IS NOT NULL
ORDER BY ORDINAL_POSITION;


-- 4. 데이터 무결성 검증
SELECT '=== calls 데이터 카운트 (변환 후) ===' AS info;
SELECT COUNT(*) AS total_calls, COUNT(payment_type_id) AS with_payment_type_id FROM calls;


-- 5. JOIN 동작 확인 (CONVERT 없이도 정상 동작해야 함)
SELECT '=== calls + payment_types JOIN (CONVERT 없이) ===' AS info;
SELECT 
  c.company_id, c.payment_method, pt.label AS payment_label,
  COUNT(*) AS cnt
FROM calls c
LEFT JOIN payment_types pt ON pt.code = c.payment_method AND pt.company_id = c.company_id
GROUP BY c.company_id, c.payment_method, pt.label
ORDER BY c.company_id, cnt DESC;


-- 6. 전체 collation 분포 재확인 (모두 unicode_ci로 통일됐는지)
SELECT '=== 전체 테이블 collation 분포 ===' AS info;
SELECT TABLE_COLLATION, COUNT(*) AS table_count
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
GROUP BY TABLE_COLLATION
ORDER BY table_count DESC;
