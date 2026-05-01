-- ============================================================
-- 양양대리 (company_code=1012) 비밀번호 일괄 변경 — 사후 검증 SQL
-- 스크립트 실행 후 결과 확인
-- ============================================================

-- 1. 변경 결과 요약 (login_fail_count, locked_until, password_must_change 정상화 확인)
SELECT 
  u.user_id,
  u.login_id,
  u.name,
  u.role,
  u.status,
  u.password_must_change,
  u.temp_password_expires_at,
  u.login_fail_count,
  u.locked_until,
  LEFT(u.password_hash, 7) AS hash_prefix
FROM users u
JOIN companies c ON u.company_id = c.company_id
WHERE c.company_code = '1012'
ORDER BY u.role, u.login_id;
-- 기대 결과: 
--   - password_must_change = 0 (FALSE)
--   - temp_password_expires_at = NULL
--   - login_fail_count = 0
--   - locked_until = NULL
--   - hash_prefix = '$2a$12$' (또는 $2b$12$, BCRYPT_ROUNDS 따라 다름)

-- 2. password_history 최근 추가 기록 확인 (변경 직후 1012 회사 사용자별 최신 1건)
SELECT 
  ph.history_id,
  ph.user_id,
  u.login_id,
  u.name,
  ph.created_at,
  LEFT(ph.password_hash, 10) AS hash_prefix
FROM password_history ph
JOIN users u ON ph.user_id = u.user_id
JOIN companies c ON u.company_id = c.company_id
WHERE c.company_code = '1012'
  AND ph.created_at >= NOW() - INTERVAL 10 MINUTE
ORDER BY ph.created_at DESC;

-- 3. audit_logs에 BULK_PASSWORD_RESET 기록 확인
SELECT 
  al.log_id,
  al.created_at,
  al.action,
  al.target_id,
  u.login_id,
  u.name,
  al.detail
FROM audit_logs al
LEFT JOIN users u ON al.target_id = u.user_id
JOIN companies c ON al.company_id = c.company_id
WHERE c.company_code = '1012'
  AND al.action = 'BULK_PASSWORD_RESET'
  AND al.created_at >= NOW() - INTERVAL 30 MINUTE
ORDER BY al.created_at DESC;

-- 4. 전체 카운트 비교 (실행 전 사용자 수 == 실행 후 password_history 추가 건 수 일치 여부)
SELECT 
  (SELECT COUNT(*) FROM users u JOIN companies c ON u.company_id = c.company_id WHERE c.company_code = '1012') AS total_users,
  (SELECT COUNT(*) FROM password_history ph 
     JOIN users u ON ph.user_id = u.user_id 
     JOIN companies c ON u.company_id = c.company_id 
   WHERE c.company_code = '1012' AND ph.created_at >= NOW() - INTERVAL 30 MINUTE) AS recent_history_count,
  (SELECT COUNT(*) FROM audit_logs al 
     JOIN companies c ON al.company_id = c.company_id 
   WHERE c.company_code = '1012' AND al.action = 'BULK_PASSWORD_RESET' AND al.created_at >= NOW() - INTERVAL 30 MINUTE) AS audit_count;
-- 기대 결과: total_users == recent_history_count == audit_count
