-- 문의사항 테이블
CREATE TABLE IF NOT EXISTS inquiries (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  company_id      BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  inquiry_type    ENUM('RENEWAL', 'UPGRADE', 'DOWNGRADE', 'GENERAL', 'BUG') NOT NULL DEFAULT 'GENERAL' COMMENT '갱신/업그레이드/다운그레이드/일반/버그',
  title           VARCHAR(200) NOT NULL,
  content         TEXT DEFAULT NULL,
  status          ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
  reply           TEXT DEFAULT NULL,
  replied_by      BIGINT DEFAULT NULL,
  replied_at      DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_company (company_id),
  INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='문의사항';
