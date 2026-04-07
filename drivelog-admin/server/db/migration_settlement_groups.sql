-- ====================================================
-- 정산 그룹 기능 추가 (2026-04-04)
-- companies.company_id = bigint(20)
-- ====================================================

CREATE TABLE IF NOT EXISTS settlement_groups (
  group_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id   BIGINT NOT NULL,
  name         VARCHAR(50) NOT NULL,
  color        VARCHAR(20) DEFAULT '#64748b',
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  UNIQUE KEY uk_company_name (company_id, name)
);

ALTER TABLE payment_types
  ADD COLUMN settlement_group_id BIGINT NULL,
  ADD CONSTRAINT fk_pt_settlement_group
    FOREIGN KEY (settlement_group_id) REFERENCES settlement_groups(group_id) ON DELETE SET NULL;

INSERT INTO settlement_groups (company_id, name, color, sort_order)
SELECT company_id, '기사 보유', '#d97706', 1 FROM companies
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO settlement_groups (company_id, name, color, sort_order)
SELECT company_id, '회사 보유', '#0f6e56', 2 FROM companies
ON DUPLICATE KEY UPDATE name = name;
