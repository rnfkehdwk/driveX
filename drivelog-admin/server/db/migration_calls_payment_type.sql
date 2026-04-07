-- ====================================================
-- 운임 정산 시스템 — STEP 3 (2026-04-07)
-- calls 테이블에도 payment_type_id FK 추가
-- 기존 calls 데이터 마이그레이션
--
-- 전제: migration_rides_payment_type.sql이 이미 적용되어
--       payment_types 시드/매핑이 준비된 상태여야 함.
--
-- 실행:
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_calls_payment_type.sql
--
-- 멱등성: 컬럼/인덱스/FK 존재 체크. 이미 적용된 상태에서 재실행 안전.
-- ====================================================

-- ====================================================
-- 1. calls 테이블에 payment_type_id 컬럼 추가
-- ====================================================

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND COLUMN_NAME = 'payment_type_id'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE calls ADD COLUMN payment_type_id BIGINT NULL AFTER payment_method',
  'SELECT "Column calls.payment_type_id already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 인덱스 추가
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND INDEX_NAME = 'idx_calls_payment_type_id'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE calls ADD INDEX idx_calls_payment_type_id (payment_type_id)',
  'SELECT "Index idx_calls_payment_type_id already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK 추가
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND CONSTRAINT_NAME = 'fk_calls_payment_type'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE calls ADD CONSTRAINT fk_calls_payment_type FOREIGN KEY (payment_type_id) REFERENCES payment_types(payment_type_id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT "FK fk_calls_payment_type already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ====================================================
-- 2. 기존 calls 데이터 마이그레이션
--    payment_method → payment_type_id 매핑
-- ====================================================

-- 2-A. company_id=1 (기본 시드 업체): code 직접 매칭
-- CONVERT()로 charset 통일 (calls.payment_method가 utf8mb3, payment_types.code가 utf8mb4 조합 대응)
UPDATE calls c
INNER JOIN payment_types pt 
  ON pt.company_id = 1 AND CONVERT(pt.code USING utf8mb4) = CONVERT(c.payment_method USING utf8mb4)
SET c.payment_type_id = pt.payment_type_id
WHERE c.company_id = 1 AND c.payment_type_id IS NULL;

-- 2-B. company_id=3 (양양대리): payment_method 문자열을 코드로 변환 후 매칭
UPDATE calls c
INNER JOIN payment_types pt ON pt.company_id = 3 AND CONVERT(pt.code USING utf8mb4) = CONVERT((
  CASE c.payment_method
    WHEN 'CASH'             THEN '001'
    WHEN 'CARD'             THEN '006'
    WHEN 'RIDER_ACCOUNT'    THEN '002'
    WHEN 'DRIVER_ACCT'      THEN '002'
    WHEN 'COMPANY_ACCOUNT'  THEN '003'
    WHEN 'COMPANY_ACCT'     THEN '003'
    WHEN 'NARASI'           THEN '004'
    WHEN 'UNPAID'           THEN '005'
    WHEN 'MISU'             THEN '005'
    -- 양양대리는 등록 시 이미 코드(001~006)로 저장될 수 있으므로 그것도 매칭
    WHEN '001' THEN '001'
    WHEN '002' THEN '002'
    WHEN '003' THEN '003'
    WHEN '004' THEN '004'
    WHEN '005' THEN '005'
    WHEN '006' THEN '006'
    ELSE NULL
  END
) USING utf8mb4)
SET c.payment_type_id = pt.payment_type_id
WHERE c.company_id = 3 AND c.payment_type_id IS NULL;


-- ====================================================
-- 3. 검증
-- ====================================================

SELECT '=== calls 매핑 결과 ===' AS info;
SELECT 
  c.company_id, c.payment_method, c.payment_type_id, 
  pt.label, sg.name AS group_name,
  COUNT(*) AS cnt
FROM calls c 
LEFT JOIN payment_types pt ON pt.payment_type_id = c.payment_type_id
LEFT JOIN settlement_groups sg ON sg.group_id = pt.settlement_group_id
GROUP BY c.company_id, c.payment_method, c.payment_type_id, pt.label, sg.name
ORDER BY c.company_id, cnt DESC;

SELECT '=== 매핑 안 된 calls (0이어야 정상) ===' AS info;
SELECT 
  COUNT(*) AS unmapped_count,
  GROUP_CONCAT(DISTINCT CONCAT('company=', company_id, ',method=', payment_method)) AS unmapped_combos
FROM calls 
WHERE payment_type_id IS NULL;
