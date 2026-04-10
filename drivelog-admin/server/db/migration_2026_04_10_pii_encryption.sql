-- ============================================================
-- DriveLog Migration: PII Encryption Column Length Expansion
-- Date: 2026-04-10
-- Purpose: AES-256-GCM 부분 암호화 적용을 위한 컬럼 길이 확장
--          (이름/전화/이메일/면허번호 - 12개 컬럼)
--
-- 대상 컬럼:
--   users.name           VARCHAR(50)  → VARCHAR(255)  NOT NULL
--   users.phone          VARCHAR(20)  → VARCHAR(255)  NOT NULL
--   users.email          VARCHAR(100) → VARCHAR(255)  NULL
--   users.driver_license VARCHAR(30)  → VARCHAR(255)  NULL
--   customers.name       VARCHAR(50)  → VARCHAR(255)  NOT NULL
--   customers.phone      VARCHAR(20)  → VARCHAR(255)  NULL
--   customers.email      VARCHAR(100) → VARCHAR(255)  NULL
--   companies.ceo_name   VARCHAR(50)  → VARCHAR(255)  NULL
--   companies.phone      VARCHAR(20)  → VARCHAR(255)  NULL
--   companies.email      VARCHAR(100) → VARCHAR(255)  NULL
--   partner_companies.contact_person VARCHAR(50) → VARCHAR(255) NULL
--   partner_companies.phone          VARCHAR(20) → VARCHAR(255) NULL
--
-- 제외 (PHASE2 결정):
--   - customers.address (이번 단계 제외)
--   - companies.business_number, address, company_name (PII 아님)
--   - users.vehicle_number (공개정보)
--   - manual_gps_points.lat/lng (위치정보보호법 별도)
--
-- 멱등성: 이미 VARCHAR(255) 인 경우 ALTER 스킵
-- 다운타임: ALTER TABLE 실행 중 잠깐 락 (각 테이블 < 1초 예상, 데이터 348건)
--
-- 실행 순서:
--   1. 본 마이그레이션 SQL 실행 (이 파일)
--   2. 백필 스크립트 실행 (encrypt_pii_backfill.js, dry-run 먼저)
--   3. 라우트 코드 배포
--
-- ⚠️ 백업 필수:
--   sudo docker exec drivelog-db mysqldump -uroot -p'Drivelog12!@' \
--     drivelog_db users customers companies partner_companies \
--     > /volume1/docker/drivelog/backup/pii_backup_$(date +%Y%m%d_%H%M).sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 헬퍼: 컬럼이 이미 VARCHAR(255) 이상이면 스킵
-- ─────────────────────────────────────────────────────────────
-- (아래 각 ALTER 블록이 동일 패턴 사용)

-- ============================================================
-- 1. users 테이블 (4개 컬럼)
-- ============================================================

-- 1-1. users.name  VARCHAR(50) → VARCHAR(255) NOT NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users' AND COLUMN_NAME = 'name');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE users MODIFY COLUMN name VARCHAR(255) NOT NULL',
  'SELECT ''users.name already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1-2. users.phone  VARCHAR(20) → VARCHAR(255) NOT NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE users MODIFY COLUMN phone VARCHAR(255) NOT NULL',
  'SELECT ''users.phone already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1-3. users.email  VARCHAR(100) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL',
  'SELECT ''users.email already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1-4. users.driver_license  VARCHAR(30) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users' AND COLUMN_NAME = 'driver_license');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE users MODIFY COLUMN driver_license VARCHAR(255) NULL',
  'SELECT ''users.driver_license already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 2. customers 테이블 (3개 컬럼, address 제외)
-- ============================================================

-- 2-1. customers.name  VARCHAR(50) → VARCHAR(255) NOT NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'name');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE customers MODIFY COLUMN name VARCHAR(255) NOT NULL',
  'SELECT ''customers.name already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2-2. customers.phone  VARCHAR(20) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'phone');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE customers MODIFY COLUMN phone VARCHAR(255) NULL',
  'SELECT ''customers.phone already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2-3. customers.email  VARCHAR(100) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'email');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE customers MODIFY COLUMN email VARCHAR(255) NULL',
  'SELECT ''customers.email already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 3. companies 테이블 (3개 컬럼, business_number/address/company_name 제외)
-- ============================================================

-- 3-1. companies.ceo_name  VARCHAR(50) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'ceo_name');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE companies MODIFY COLUMN ceo_name VARCHAR(255) NULL',
  'SELECT ''companies.ceo_name already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3-2. companies.phone  VARCHAR(20) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'phone');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE companies MODIFY COLUMN phone VARCHAR(255) NULL',
  'SELECT ''companies.phone already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3-3. companies.email  VARCHAR(100) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'email');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE companies MODIFY COLUMN email VARCHAR(255) NULL',
  'SELECT ''companies.email already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 4. partner_companies 테이블 (2개 컬럼)
-- ============================================================

-- 4-1. partner_companies.contact_person  VARCHAR(50) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'partner_companies' AND COLUMN_NAME = 'contact_person');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE partner_companies MODIFY COLUMN contact_person VARCHAR(255) NULL',
  'SELECT ''partner_companies.contact_person already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4-2. partner_companies.phone  VARCHAR(20) → VARCHAR(255) NULL
SET @cur_len = (SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'partner_companies' AND COLUMN_NAME = 'phone');
SET @sql = IF(@cur_len < 255,
  'ALTER TABLE partner_companies MODIFY COLUMN phone VARCHAR(255) NULL',
  'SELECT ''partner_companies.phone already >= 255'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. 검증 쿼리
-- ============================================================

SELECT 'Migration completed' AS status;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'users'             AND COLUMN_NAME IN ('name','phone','email','driver_license'))
    OR (TABLE_NAME = 'customers'         AND COLUMN_NAME IN ('name','phone','email'))
    OR (TABLE_NAME = 'companies'         AND COLUMN_NAME IN ('ceo_name','phone','email'))
    OR (TABLE_NAME = 'partner_companies' AND COLUMN_NAME IN ('contact_person','phone')))
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 기대 결과:
--   12개 행 모두 COLUMN_TYPE = 'varchar(255)'
--   IS_NULLABLE: users.name/phone, customers.name = 'NO', 나머지 = 'YES'
