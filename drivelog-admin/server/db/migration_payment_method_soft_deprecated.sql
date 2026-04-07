-- ====================================================
-- payment_method 컬럼 소프트 deprecated 처리 (2026-04-07)
-- rides.payment_method → rides.payment_method_deprecated
-- calls.payment_method → calls.payment_method_deprecated
--
-- 목적:
-- - 코드는 payment_type_id만 사용하도록 마이그레이션 완료
-- - payment_method 컬럼은 데이터 보존용으로 이름만 변경 (복구 가능)
-- - DEFAULT 'CASH' 제거 → 새 데이터는 이 컬럼을 안 채움
-- - 향후 충분한 안정화(수개월) 후 완전 drop 가능
--
-- 안전성:
-- - RENAME은 데이터 무손실
-- - 실행 전에 반드시 백엔드 코드가 payment_method INSERT/UPDATE 안 하는 상태여야 함
-- - 백엔드가 여전히 이 컬럼에 쓰면 NOT NULL 제약 때문에 INSERT 실패 (기본값 없으므로)
--
-- 실행:
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_payment_method_soft_deprecated.sql
--
-- 멱등성: payment_method_deprecated 컬럼이 이미 있으면 SKIP
-- ====================================================

-- 1. 변환 전 상태 확인
SELECT '=== 변환 전: rides 컬럼 확인 ===' AS info;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' 
  AND COLUMN_NAME IN ('payment_method', 'payment_method_deprecated', 'payment_type_id');

SELECT '=== 변환 전: calls 컬럼 확인 ===' AS info;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' 
  AND COLUMN_NAME IN ('payment_method', 'payment_method_deprecated', 'payment_type_id');


-- 2. rides.payment_method → rides.payment_method_deprecated (멱등성)
SET @rides_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' AND COLUMN_NAME = 'payment_method'
);

SET @sql := IF(@rides_col > 0,
  'ALTER TABLE rides CHANGE COLUMN payment_method payment_method_deprecated VARCHAR(30) NULL DEFAULT NULL COMMENT "DEPRECATED 2026-04-07: use payment_type_id instead"',
  'SELECT "rides.payment_method already renamed or does not exist, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3. calls.payment_method → calls.payment_method_deprecated (멱등성)
SET @calls_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND COLUMN_NAME = 'payment_method'
);

SET @sql := IF(@calls_col > 0,
  'ALTER TABLE calls CHANGE COLUMN payment_method payment_method_deprecated VARCHAR(30) NULL DEFAULT NULL COMMENT "DEPRECATED 2026-04-07: use payment_type_id instead"',
  'SELECT "calls.payment_method already renamed or does not exist, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 4. 변환 후 상태 확인
SELECT '=== 변환 후: rides 컬럼 확인 ===' AS info;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' 
  AND COLUMN_NAME IN ('payment_method', 'payment_method_deprecated', 'payment_type_id');

SELECT '=== 변환 후: calls 컬럼 확인 ===' AS info;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' 
  AND COLUMN_NAME IN ('payment_method', 'payment_method_deprecated', 'payment_type_id');


-- 5. 데이터 보존 검증
SELECT '=== 데이터 무손실 검증 ===' AS info;
SELECT 
  'rides' AS table_name,
  COUNT(*) AS total,
  COUNT(payment_method_deprecated) AS with_deprecated_value,
  COUNT(payment_type_id) AS with_payment_type_id
FROM rides
UNION ALL
SELECT 
  'calls' AS table_name,
  COUNT(*) AS total,
  COUNT(payment_method_deprecated) AS with_deprecated_value,
  COUNT(payment_type_id) AS with_payment_type_id
FROM calls;
