-- migration_companies_lat_lng.sql
-- 2026-04-08
-- companies 테이블에 위도/경도 컬럼 추가
-- 회사 등록/수정 시 카카오 geocoding으로 자동 채움
-- 모바일/관리자 웹의 AddressSearchModal에서 GPS 거부 시 fallback 좌표로 사용

ALTER TABLE companies
  ADD COLUMN lat DECIMAL(10, 7) NULL COMMENT '회사 위치 위도 (카카오 geocoding 결과)',
  ADD COLUMN lng DECIMAL(10, 7) NULL COMMENT '회사 위치 경도 (카카오 geocoding 결과)';

-- 양양대리 (company_id=3) 좌표 직접 채움 (양양읍 양양군청 부근)
-- 다른 업체는 다음 회사 정보 수정 시 자동으로 채워짐
UPDATE companies SET lat = 38.0758, lng = 128.6190 WHERE company_id = 3 AND lat IS NULL;

-- 확인
SELECT company_id, company_code, company_name, address, lat, lng FROM companies;
