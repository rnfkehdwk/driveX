-- ============================================
-- DriveLog 과금 모델: 월 기본료 + 기사 수 기반
-- ============================================

-- 1. 요금제(플랜) 테이블
CREATE TABLE IF NOT EXISTS billing_plans (
  plan_id         BIGINT       NOT NULL AUTO_INCREMENT,
  plan_name       VARCHAR(50)  NOT NULL COMMENT '요금제명 (스타터, 베이직, 프로, 무제한)',
  base_fee        INT          NOT NULL DEFAULT 0 COMMENT '월 기본료',
  per_rider_fee   INT          NOT NULL DEFAULT 0 COMMENT '기사 1인당 월 단가',
  free_riders     INT          NOT NULL DEFAULT 0 COMMENT '무료 포함 기사 수',
  max_riders      INT          NOT NULL DEFAULT 0 COMMENT '최대 기사 수 (0=무제한)',
  description     VARCHAR(200) DEFAULT NULL COMMENT '요금제 설명',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (plan_id)
) ENGINE=InnoDB COMMENT='과금 요금제';

-- 기본 요금제 데이터
INSERT IGNORE INTO billing_plans (plan_id, plan_name, base_fee, per_rider_fee, free_riders, max_riders, description) VALUES
(1, '스타터',   0,      10000, 1,  5,   '소규모 업체용. 기본료 무료, 기사 1명 포함'),
(2, '베이직',   30000,  5000,  3,  20,  '일반 업체용. 기사 3명 포함'),
(3, '프로',     50000,  3000,  10, 50,  '중대형 업체용. 기사 10명 포함'),
(4, '무제한',   100000, 0,     0,  0,   '대형 업체용. 기사 수 무제한');

-- 2. companies 테이블에 요금제 컬럼 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id BIGINT DEFAULT 1 COMMENT '적용 요금제';

-- 3. app_billing 테이블 확장 (기사 수, 상세 금액)
ALTER TABLE app_billing ADD COLUMN IF NOT EXISTS active_riders INT DEFAULT 0 COMMENT '해당 월 활성 기사 수';
ALTER TABLE app_billing ADD COLUMN IF NOT EXISTS base_fee INT DEFAULT 0 COMMENT '기본료';
ALTER TABLE app_billing ADD COLUMN IF NOT EXISTS rider_fee INT DEFAULT 0 COMMENT '기사 수 과금';
ALTER TABLE app_billing ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50) DEFAULT NULL COMMENT '적용 요금제명';
ALTER TABLE app_billing ADD COLUMN IF NOT EXISTS memo VARCHAR(200) DEFAULT NULL COMMENT '비고';

-- 확인
SELECT * FROM billing_plans;
