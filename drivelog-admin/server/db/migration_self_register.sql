-- =============================================
-- 셀프 가입 + 무료 체험 기능
-- =============================================

-- 1. 시스템 설정 테이블 (MASTER가 관리)
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(50) NOT NULL,
  setting_value VARCHAR(500) NOT NULL,
  description   VARCHAR(200) DEFAULT NULL,
  updated_by    BIGINT DEFAULT NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB COMMENT='시스템 설정';

-- 초기값: 무료 체험 14일
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('free_trial_days', '14', '무료 체험 기간 (일)'),
('auto_approve_trial', 'false', '무료 체험 자동 승인 여부 (true=즉시 활성, false=MASTER 수동 승인)'),
('registration_enabled', 'true', '업체 가입 신청 활성화 여부');

-- 2. companies 테이블에 체험 관련 컬럼 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_expires_at DATETIME DEFAULT NULL COMMENT '무료 체험 만료일';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_source VARCHAR(20) DEFAULT 'ADMIN' COMMENT '등록 경로 (ADMIN=관리자등록, SELF=셀프가입)';
