-- 제휴업체 코드 컬럼 추가 (partner_code)
-- 실행: NAS SSH에서
-- sudo docker exec -i drivelog-db mysql -u root -p'Drivelog12!@' drivelog_db < /path/to/this.sql

ALTER TABLE partner_companies
  ADD COLUMN partner_code VARCHAR(20) NULL COMMENT '제휴업체 고유코드 (자동생성)' AFTER company_id;

-- 기존 데이터에 코드 부여 (YANG-P001, YANG-P002, ...)
SET @row_number = 0;
UPDATE partner_companies p
JOIN companies c ON p.company_id = c.company_id
SET p.partner_code = CONCAT(LEFT(c.company_code, 4), '-P', LPAD((@row_number := @row_number + 1), 3, '0'))
WHERE p.partner_code IS NULL
ORDER BY p.partner_id;

-- 인덱스 추가
ALTER TABLE partner_companies
  ADD INDEX idx_partner_code (company_id, partner_code);

SELECT partner_id, partner_code, name FROM partner_companies;
