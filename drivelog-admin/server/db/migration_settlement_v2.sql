-- =============================================
-- 기사 정산 시스템 v2 (시급제 / 건별제 / 수수료제)
-- =============================================

-- 1. 업체별 정산방식 설정
CREATE TABLE IF NOT EXISTS company_pay_settings (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  company_id      BIGINT NOT NULL,
  pay_type        ENUM('HOURLY', 'PER_RIDE', 'COMMISSION') NOT NULL DEFAULT 'PER_RIDE' COMMENT '시급제/건별제/수수료제',
  -- 시급제 기본값
  default_hourly_rate   INT NOT NULL DEFAULT 0 COMMENT '기본 시급 (원)',
  min_work_policy       ENUM('ROUND_DOWN', 'ROUND_UP', 'ROUND_HALF', 'MIN_1HOUR', 'ACTUAL') NOT NULL DEFAULT 'ROUND_DOWN'
    COMMENT '1시간 미만 처리: ROUND_DOWN=절삭, ROUND_UP=올림, ROUND_HALF=30분 기준 반올림, MIN_1HOUR=최소 1시간 인정, ACTUAL=실제 분단위 계산',
  -- 건별제 기본값
  default_per_ride_rate INT NOT NULL DEFAULT 0 COMMENT '기본 건당 단가 (원)',
  -- 수수료제 기본값
  default_commission_pct DECIMAL(5,2) NOT NULL DEFAULT 20.00 COMMENT '기본 수수료율 (%)',
  updated_by      BIGINT DEFAULT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_company (company_id),
  CONSTRAINT fk_cps_company FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB COMMENT='업체별 정산방식 설정';

-- 2. 기사별 개별 단가 (업체 기본값과 다른 경우만 등록)
CREATE TABLE IF NOT EXISTS rider_pay_rates (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  company_id      BIGINT NOT NULL,
  rider_id        BIGINT NOT NULL,
  hourly_rate     INT DEFAULT NULL COMMENT '개별 시급 (NULL이면 업체 기본값 사용)',
  per_ride_rate   INT DEFAULT NULL COMMENT '개별 건당 단가 (NULL이면 업체 기본값 사용)',
  commission_pct  DECIMAL(5,2) DEFAULT NULL COMMENT '개별 수수료율 (NULL이면 업체 기본값 사용)',
  memo            VARCHAR(200) DEFAULT NULL COMMENT '비고 (예: 경력자 우대, 수습기간 등)',
  updated_by      BIGINT DEFAULT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_company_rider (company_id, rider_id),
  CONSTRAINT fk_rpr_company FOREIGN KEY (company_id) REFERENCES companies(company_id),
  CONSTRAINT fk_rpr_rider FOREIGN KEY (rider_id) REFERENCES users(user_id)
) ENGINE=InnoDB COMMENT='기사별 개별 단가';

-- 3. 기사 출퇴근 기록 (시급제용)
CREATE TABLE IF NOT EXISTS rider_attendance (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  company_id      BIGINT NOT NULL,
  rider_id        BIGINT NOT NULL,
  work_date       DATE NOT NULL COMMENT '근무일',
  clock_in        DATETIME NOT NULL COMMENT '출근 시간',
  clock_out       DATETIME DEFAULT NULL COMMENT '퇴근 시간',
  work_minutes    INT DEFAULT NULL COMMENT '실 근무시간 (분)',
  calculated_hours DECIMAL(5,2) DEFAULT NULL COMMENT '정산용 시간 (1시간 미만 처리 적용 후)',
  memo            VARCHAR(200) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ra_company_date (company_id, work_date),
  INDEX idx_ra_rider_date (rider_id, work_date),
  CONSTRAINT fk_ra_company FOREIGN KEY (company_id) REFERENCES companies(company_id),
  CONSTRAINT fk_ra_rider FOREIGN KEY (rider_id) REFERENCES users(user_id)
) ENGINE=InnoDB COMMENT='기사 출퇴근 기록';

-- 4. settlements 테이블에 정산방식 컬럼 추가
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS pay_type ENUM('HOURLY', 'PER_RIDE', 'COMMISSION') DEFAULT NULL COMMENT '정산방식';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS work_hours DECIMAL(7,2) DEFAULT NULL COMMENT '총 근무시간 (시급제)';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS hourly_rate INT DEFAULT NULL COMMENT '적용 시급';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS per_ride_rate INT DEFAULT NULL COMMENT '적용 건당 단가';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS commission_pct DECIMAL(5,2) DEFAULT NULL COMMENT '적용 수수료율';
