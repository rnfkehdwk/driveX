-- 결제구분 테이블 추가
-- 실행: NAS SSH에서
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < migration_payment_types.sql

CREATE TABLE IF NOT EXISTS payment_types (
  payment_type_id  BIGINT       NOT NULL AUTO_INCREMENT,
  company_id       BIGINT       NOT NULL COMMENT '소속 업체',
  code             VARCHAR(30)  NOT NULL COMMENT '결제구분 코드 (영문)',
  label            VARCHAR(50)  NOT NULL COMMENT '표시명 (한글)',
  sort_order       INT          NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE COMMENT '활성 여부',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (payment_type_id),
  INDEX idx_pt_company (company_id),
  UNIQUE KEY uk_pt_code (company_id, code),
  CONSTRAINT fk_pt_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='결제구분 (업체별)';

-- rides 테이블의 payment_method를 ENUM에서 VARCHAR로 변경 (자유 코드 사용)
ALTER TABLE rides MODIFY COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH' COMMENT '결제 방법 코드';

-- 기본 결제구분 데이터 (양양대리 기준)
INSERT INTO payment_types (company_id, code, label, sort_order) VALUES
(1, 'CASH', '현금', 1),
(1, 'RIDER_ACCOUNT', '기사 계좌', 2),
(1, 'COMPANY_ACCOUNT', '회사 계좌', 3),
(1, 'NARASI', '나라시', 4),
(1, 'UNPAID', '미수', 5);

SELECT * FROM payment_types;
