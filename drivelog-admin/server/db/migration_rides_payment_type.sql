-- ====================================================
-- 운임 정산 시스템 — STEP 2 (2026-04-07)
-- 1. payment_types에 정산그룹 매핑 + 미수/카드 추가
-- 2. rides 테이블에 payment_type_id FK 추가
-- 3. 기존 rides 데이터 마이그레이션 (payment_method → payment_type_id)
--
-- 실행:
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_rides_payment_type.sql
--
-- 멱등성: 가능한 부분은 IF NOT EXISTS / INSERT IGNORE로 처리되어 재실행 안전.
--          ALTER TABLE은 컬럼/인덱스 존재 여부를 동적으로 체크.
-- ====================================================

-- ====================================================
-- 1. payment_types 시드 보강 (미수, 카드)
--    기존 시드(현금/기사계좌/회사계좌/나라시)는 건드리지 않음
--    company_id별로 INSERT IGNORE (uk_pt_code 충돌 시 무시)
-- ====================================================

-- 1-A. 양양대리 외 기본 시드 업체(company_id=1)에 카드 추가
INSERT IGNORE INTO payment_types (company_id, code, label, sort_order, is_active)
VALUES (1, 'CARD', '카드', 6, 1);

-- 1-B. company_id=3 (양양대리)에 미수/카드 추가
--     기존 코드 체계: 001(현금) ~ 004(나라시)
INSERT IGNORE INTO payment_types (company_id, code, label, sort_order, is_active)
VALUES 
  (3, '005', '미수', 10, 1),
  (3, '006', '카드', 11, 1);


-- ====================================================
-- 2. payment_types ↔ settlement_groups 매핑
--    하드코딩 대신 서브쿼리로 group_id 조회 (AUTO_INCREMENT 차이 대응)
-- ====================================================

-- 양양대리(company_id=3): 현금/기사계좌 → 기사 보유
UPDATE payment_types 
SET settlement_group_id = (
  SELECT group_id FROM settlement_groups WHERE company_id = 3 AND name = '기사 보유' LIMIT 1
)
WHERE company_id = 3 AND code IN ('001', '002');

-- 양양대리(company_id=3): 회사계좌/나라시/미수/카드 → 회사 보유
UPDATE payment_types 
SET settlement_group_id = (
  SELECT group_id FROM settlement_groups WHERE company_id = 3 AND name = '회사 보유' LIMIT 1
)
WHERE company_id = 3 AND code IN ('003', '004', '005', '006');


-- ====================================================
-- 3. rides 테이블에 payment_type_id 컬럼 추가
--    이미 컬럼이 있으면 SKIP (재실행 안전)
-- ====================================================

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' AND COLUMN_NAME = 'payment_type_id'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE rides ADD COLUMN payment_type_id BIGINT NULL AFTER payment_method',
  'SELECT "Column payment_type_id already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 인덱스 추가 (재실행 안전)
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' AND INDEX_NAME = 'idx_rides_payment_type_id'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE rides ADD INDEX idx_rides_payment_type_id (payment_type_id)',
  'SELECT "Index idx_rides_payment_type_id already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK 추가 (재실행 안전)
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rides' AND CONSTRAINT_NAME = 'fk_rides_payment_type'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE rides ADD CONSTRAINT fk_rides_payment_type FOREIGN KEY (payment_type_id) REFERENCES payment_types(payment_type_id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT "FK fk_rides_payment_type already exists, skip" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ====================================================
-- 4. 기존 rides 데이터 마이그레이션
--    payment_method 문자열 → payment_type_id 매핑
--    company_id별로 분리. 이미 매핑된 row는 건드리지 않음 (재실행 안전).
-- ====================================================

-- 4-A. company_id=1 (기본 시드 업체): code가 직접 매칭
UPDATE rides r
INNER JOIN payment_types pt 
  ON pt.company_id = 1 AND pt.code = r.payment_method
SET r.payment_type_id = pt.payment_type_id
WHERE r.company_id = 1 AND r.payment_type_id IS NULL;

-- 4-B. company_id=3 (양양대리): payment_method 문자열을 한글 라벨로 변환 후 매칭
-- 매핑 규칙:
--   CASH            → 현금 (001)
--   CARD            → 카드 (006)
--   RIDER_ACCOUNT   → 기사계좌 (002)
--   COMPANY_ACCOUNT → 회사 계좌 (003)
--   NARASI          → 나라시 (004)
--   UNPAID          → 미수 (005)
UPDATE rides r
INNER JOIN payment_types pt ON pt.company_id = 3 AND pt.code = (
  CASE r.payment_method
    WHEN 'CASH'             THEN '001'
    WHEN 'CARD'             THEN '006'
    WHEN 'RIDER_ACCOUNT'    THEN '002'
    WHEN 'DRIVER_ACCT'      THEN '002'
    WHEN 'COMPANY_ACCOUNT'  THEN '003'
    WHEN 'COMPANY_ACCT'     THEN '003'
    WHEN 'NARASI'           THEN '004'
    WHEN 'UNPAID'           THEN '005'
    WHEN 'MISU'             THEN '005'
    ELSE NULL
  END
)
SET r.payment_type_id = pt.payment_type_id
WHERE r.company_id = 3 AND r.payment_type_id IS NULL;


-- ====================================================
-- 5. 검증
-- ====================================================

SELECT '=== payment_types (양양대리) ===' AS info;
SELECT pt.payment_type_id, pt.code, pt.label, sg.name AS group_name
FROM payment_types pt
LEFT JOIN settlement_groups sg ON sg.group_id = pt.settlement_group_id
WHERE pt.company_id = 3
ORDER BY pt.sort_order;

SELECT '=== rides 매핑 결과 (전체) ===' AS info;
SELECT 
  r.company_id, r.payment_method, r.payment_type_id, 
  pt.label, sg.name AS group_name,
  COUNT(*) AS cnt
FROM rides r 
LEFT JOIN payment_types pt ON pt.payment_type_id = r.payment_type_id
LEFT JOIN settlement_groups sg ON sg.group_id = pt.settlement_group_id
GROUP BY r.company_id, r.payment_method, r.payment_type_id, pt.label, sg.name
ORDER BY r.company_id, cnt DESC;

SELECT '=== 매핑 안 된 row (0이어야 정상) ===' AS info;
SELECT 
  COUNT(*) AS unmapped_count,
  GROUP_CONCAT(DISTINCT CONCAT('company=', company_id, ',method=', payment_method)) AS unmapped_combos
FROM rides 
WHERE payment_type_id IS NULL;
