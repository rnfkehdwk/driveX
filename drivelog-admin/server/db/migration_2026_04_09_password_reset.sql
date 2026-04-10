-- ============================================================
-- DriveLog Migration: Password Reset System
-- Date: 2026-04-09
-- Purpose: 임시 비밀번호 발급 + 강제 변경 플래그 추가
-- ============================================================

-- users 테이블에 컬럼 추가 (멱등성 체크)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'users'
                   AND COLUMN_NAME = 'password_must_change');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN password_must_change BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''임시 비번 사용 후 강제 변경 플래그''',
  'SELECT ''password_must_change column already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'users'
                   AND COLUMN_NAME = 'temp_password_expires_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN temp_password_expires_at DATETIME NULL COMMENT ''임시 비번 만료 시각 (10분)''',
  'SELECT ''temp_password_expires_at column already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inquiries 테이블의 inquiry_type ENUM에 PASSWORD_RESET 추가
-- (이메일 미등록 사용자 fallback 처리용)
ALTER TABLE inquiries
  MODIFY COLUMN inquiry_type ENUM('RENEWAL','UPGRADE','DOWNGRADE','GENERAL','BUG','PASSWORD_RESET') NOT NULL DEFAULT 'GENERAL';

-- 확인 쿼리
SELECT 'Migration completed' AS status;
SHOW COLUMNS FROM users LIKE 'password_must_change';
SHOW COLUMNS FROM users LIKE 'temp_password_expires_at';
SHOW COLUMNS FROM inquiries LIKE 'inquiry_type';
