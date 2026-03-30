-- 요금제 노출 여부 컬럼 추가
-- is_active: 요금제 활성 여부 (비활성이면 어디에서도 사용 불가)
-- is_visible: SUPER_ADMIN 사용료 화면에 노출 여부 (활성이지만 노출 안 할 수 있음 — 테스트요금제 등)
ALTER TABLE billing_plans ADD COLUMN is_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

-- 테스트요금제는 활성이지만 비노출로 설정
UPDATE billing_plans SET is_visible = 0 WHERE plan_name = '테스트요금제';
