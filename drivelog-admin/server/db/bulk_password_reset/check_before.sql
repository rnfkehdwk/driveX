-- ============================================================
-- 양양대리 (company_code=1012) 비밀번호 일괄 변경 — 사전 확인 SQL
-- 변경 대상 사용자가 누구인지 사전에 확인
-- ============================================================

-- 1. 회사 정보 확인
SELECT 
  company_id, 
  company_code, 
  company_name, 
  status
FROM companies 
WHERE company_code = '1012';

-- 2. 변경 대상 사용자 목록 (1012 회사 소속 전체)
SELECT 
  u.user_id,
  u.login_id,
  u.name,
  u.role,
  u.status,
  u.last_login_at,
  u.password_must_change,
  u.locked_until
FROM users u
JOIN companies c ON u.company_id = c.company_id
WHERE c.company_code = '1012'
ORDER BY u.role, u.login_id;

-- 3. 변경 대상 카운트 요약
SELECT 
  u.role,
  u.status,
  COUNT(*) AS cnt
FROM users u
JOIN companies c ON u.company_id = c.company_id
WHERE c.company_code = '1012'
GROUP BY u.role, u.status
ORDER BY u.role, u.status;
