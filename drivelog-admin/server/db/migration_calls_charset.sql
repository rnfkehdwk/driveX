-- ====================================================
-- calls 테이블 charset 정상화 (2026-04-07)
-- utf8mb3 → utf8mb4 변환
--
-- 배경:
-- - calls.payment_method 컬럼이 utf8mb3로 저장되어 있어서
--   다른 테이블(payment_types: utf8mb4)과 JOIN 시 collation 충돌 발생
-- - 마이그레이션 시 CONVERT() 함수로 우회했지만
--   인덱스를 못 타는 등 비효율적이므로 charset 자체를 정상화
--
-- 안전성:
-- - calls 테이블의 모든 FK는 BIGINT 컬럼이므로 charset 무관
-- - 데이터 손실 없음 (utf8mb4는 utf8mb3의 superset)
-- - 다만 운영 중에는 잠깐 테이블 락이 걸릴 수 있음 (calls는 작은 테이블이라 1초 미만 예상)
--
-- 실행:
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_calls_charset.sql
--
-- 멱등성: 이미 utf8mb4면 SKIP (information_schema 체크)
-- ====================================================

-- 1. 변환 전 상태 확인
SELECT '=== 변환 전 calls 테이블 charset ===' AS info;
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls';

SELECT '=== 변환 전 calls 컬럼별 charset ===' AS info;
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls'
  AND CHARACTER_SET_NAME IS NOT NULL
ORDER BY ORDINAL_POSITION;


-- 2. 이미 utf8mb4면 SKIP
SET @current_charset := (
  SELECT CCSA.CHARACTER_SET_NAME
  FROM information_schema.TABLES T
  JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
    ON CCSA.COLLATION_NAME = T.TABLE_COLLATION
  WHERE T.TABLE_SCHEMA = DATABASE() AND T.TABLE_NAME = 'calls'
);

SET @sql := IF(@current_charset = 'utf8mb4',
  'SELECT "calls table is already utf8mb4, skip" AS info',
  'ALTER TABLE calls CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3. 변환 후 상태 확인
SELECT '=== 변환 후 calls 테이블 charset ===' AS info;
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls';

SELECT '=== 변환 후 calls 컬럼별 charset ===' AS info;
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls'
  AND CHARACTER_SET_NAME IS NOT NULL
ORDER BY ORDINAL_POSITION;


-- 4. 데이터 검증 (변환 후 데이터 무결성 확인)
SELECT '=== calls 데이터 카운트 (변환 후) ===' AS info;
SELECT COUNT(*) AS total_calls, COUNT(payment_type_id) AS with_payment_type_id FROM calls;

SELECT '=== calls + payment_types JOIN 동작 확인 (CONVERT 없이) ===' AS info;
SELECT 
  c.company_id, c.payment_method, pt.label AS payment_label,
  COUNT(*) AS cnt
FROM calls c
LEFT JOIN payment_types pt ON pt.code = c.payment_method AND pt.company_id = c.company_id
GROUP BY c.company_id, c.payment_method, pt.label
ORDER BY c.company_id, cnt DESC;
