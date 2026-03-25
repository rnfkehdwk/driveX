-- 결제 계좌 정보 시스템설정 추가
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('payment_bank', '농협은행', '입금 은행명'),
('payment_account', '352-1234-5678-90', '입금 계좌번호'),
('payment_holder', '드라이브로그', '예금주'),
('payment_note', '입금 시 업체명을 입금자명으로 기재해주세요.', '결제 안내 메시지')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
