-- =============================================
-- 요금제 시즌별 특별가 + 이력 테이블
-- =============================================

-- 1. 업체 요금제 변경 이력
CREATE TABLE IF NOT EXISTS plan_change_history (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  company_id    BIGINT NOT NULL,
  old_plan_id   BIGINT DEFAULT NULL,
  new_plan_id   BIGINT NOT NULL,
  changed_by    BIGINT NOT NULL,
  changed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason        VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_pch_company (company_id),
  CONSTRAINT fk_pch_company FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

-- 2. 요금제 금액 변경 이력 (적용일자 기반 - 나-2)
CREATE TABLE IF NOT EXISTS plan_price_history (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  plan_id         BIGINT NOT NULL,
  base_fee        INT NOT NULL DEFAULT 0,
  per_rider_fee   INT NOT NULL DEFAULT 0,
  free_riders     INT NOT NULL DEFAULT 0,
  max_riders      INT NOT NULL DEFAULT 0,
  effective_from  DATE NOT NULL,
  effective_to    DATE DEFAULT NULL,
  changed_by      BIGINT DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_pph_plan (plan_id, effective_from),
  CONSTRAINT fk_pph_plan FOREIGN KEY (plan_id) REFERENCES billing_plans(plan_id)
) ENGINE=InnoDB;

-- 3. 시즌별 특별가 (나-1: 피크/비시즌)
CREATE TABLE IF NOT EXISTS plan_seasonal_rates (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  plan_id         BIGINT NOT NULL,
  season_name     VARCHAR(50) NOT NULL COMMENT '시즌명 (피크시즌, 비시즌, 설날할인 등)',
  start_date      DATE NOT NULL COMMENT '시작일',
  end_date        DATE NOT NULL COMMENT '종료일',
  base_fee        INT NOT NULL COMMENT '해당 시즌 기본료',
  per_rider_fee   INT NOT NULL COMMENT '해당 시즌 기사당 단가',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_psr_plan_date (plan_id, start_date, end_date),
  CONSTRAINT fk_psr_plan FOREIGN KEY (plan_id) REFERENCES billing_plans(plan_id)
) ENGINE=InnoDB COMMENT='요금제 시즌별 특별가';

-- 초기 이력 데이터
INSERT IGNORE INTO plan_price_history (plan_id, base_fee, per_rider_fee, free_riders, max_riders, effective_from)
SELECT plan_id, base_fee, per_rider_fee, free_riders, max_riders, '2026-01-01'
FROM billing_plans;
