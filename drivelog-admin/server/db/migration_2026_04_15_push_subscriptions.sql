-- migration_2026_04_15_push_subscriptions.sql
-- DriveLog Web Push 구독 테이블
-- 2026-04-15
-- 용도: 콜 생성 시 같은 회사 RIDER들에게 Web Push 발송
--
-- 실행 방법 (NAS):
--   sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
--     < /volume1/docker/drivelog/server/db/migration_2026_04_15_push_subscriptions.sql
--
-- 멱등성: 테이블 존재 시 스킵

SET @table_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'push_subscriptions'
);

SET @sql := IF(@table_exists = 0, '
CREATE TABLE push_subscriptions (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  user_id BIGINT(20) NOT NULL COMMENT ''users.user_id'',
  company_id BIGINT(20) NOT NULL COMMENT ''users.company_id (콜 발송 필터링용)'',
  endpoint TEXT NOT NULL COMMENT ''푸시 서비스 endpoint URL (FCM/APNs 등)'',
  endpoint_hash VARCHAR(64) NOT NULL COMMENT ''endpoint의 SHA-256 해시 (UNIQUE 인덱스용)'',
  p256dh_key VARCHAR(255) NOT NULL COMMENT ''P-256 ECDH 공개키 (base64url)'',
  auth_key VARCHAR(255) NOT NULL COMMENT ''Auth secret (base64url)'',
  user_agent VARCHAR(500) DEFAULT NULL COMMENT ''디버깅용 브라우저 정보'',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT NULL COMMENT ''마지막 성공 발송 시각'',
  PRIMARY KEY (id),
  UNIQUE KEY uk_endpoint_hash (endpoint_hash),
  KEY idx_user_id (user_id),
  KEY idx_company_id (company_id),
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_push_subscriptions_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''Web Push 구독 정보''
', 'SELECT ''push_subscriptions 테이블이 이미 존재합니다. 스킵.'' AS msg');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
