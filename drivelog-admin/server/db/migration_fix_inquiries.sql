-- 버그 수정: MASTER(company_id=null)도 문의 등록 가능하도록 NULL 허용
ALTER TABLE inquiries MODIFY COLUMN company_id INT NULL;
