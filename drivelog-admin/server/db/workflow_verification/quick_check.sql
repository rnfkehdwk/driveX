-- ============================================================
-- E2E 검증 데이터 빠른 조회 SQL
-- 자동 검증 실행 후 DB에 어떤 데이터가 만들어졌는지 한눈에 확인용
-- ============================================================

-- 1. 검증 콜 목록
SELECT 
  c.call_id,
  c.status,
  c.created_at,
  c.assigned_at,
  c.completed_at,
  creator.name AS created_by_name,
  rider.name AS assigned_rider_name,
  cust.name AS customer_name,
  c.estimated_fare,
  c.ride_id
FROM calls c
LEFT JOIN users creator ON c.created_by = creator.user_id
LEFT JOIN users rider ON c.assigned_rider_id = rider.user_id
LEFT JOIN customers cust ON c.customer_id = cust.customer_id
WHERE c.memo LIKE '%[E2E_VERIFY_20260429]%'
ORDER BY c.created_at DESC;

-- 2. 검증 운행 목록
SELECT 
  r.ride_id,
  r.call_id,
  r.status,
  r.started_at,
  r.ended_at,
  rider.name AS rider_name,
  pickup.name AS pickup_rider_name,
  cust.name AS customer_name,
  r.total_fare,
  r.cash_amount,
  r.mileage_used,
  r.mileage_earned,
  r.final_amount
FROM rides r
LEFT JOIN users rider ON r.rider_id = rider.user_id
LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
LEFT JOIN customers cust ON r.customer_id = cust.customer_id
WHERE r.rider_memo LIKE '%[E2E_VERIFY_20260429]%'
ORDER BY r.started_at DESC;

-- 3. 검증 마일리지 거래
SELECT 
  cm.id,
  cm.created_at,
  cm.type,
  cm.amount,
  cm.balance_after,
  cm.ride_id,
  cust.name AS customer_name,
  cm.description
FROM customer_mileage cm
LEFT JOIN customers cust ON cm.customer_id = cust.customer_id
WHERE cm.description LIKE '%[E2E_VERIFY_20260429]%'
ORDER BY cm.created_at DESC, cm.id;

-- 4. 영향 받은 고객 현재 잔액
SELECT 
  c.customer_id,
  c.name,
  c.mileage_balance AS current_balance,
  (SELECT COUNT(*) FROM customer_mileage cm 
   WHERE cm.customer_id = c.customer_id 
     AND cm.description LIKE '%[E2E_VERIFY_20260429]%') AS verify_txn_count
FROM customers c
WHERE c.customer_id IN (
  SELECT DISTINCT customer_id FROM customer_mileage 
  WHERE description LIKE '%[E2E_VERIFY_20260429]%'
);

-- 5. 검증 audit_logs
SELECT 
  log_id,
  created_at,
  action,
  target_table,
  target_id,
  detail
FROM audit_logs
WHERE detail LIKE '%e2e_verify%'
ORDER BY created_at DESC;

-- 6. 푸시 구독 현황 (양양대리 1012)
SELECT 
  u.user_id,
  u.login_id,
  u.name,
  u.role,
  u.status,
  COUNT(ps.id) AS subscription_count,
  MAX(ps.last_used_at) AS last_push_used
FROM users u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.user_id
WHERE u.company_id = 3
GROUP BY u.user_id
ORDER BY u.role, u.login_id;
