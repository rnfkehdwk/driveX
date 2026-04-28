-- ============================================================
-- DriveLog 4월 28일 재 마이그레이션 — Part 3/3
-- 1. 새 엑셀 운행 INSERT (177건, No 1252~1429)
-- 2. customer_mileage.balance_after 재계산
-- 3. customers.mileage_balance를 고객시트 누적값으로 SET
-- 4. 최종 검증
-- ============================================================
-- ⚠️ Part 1과 Part 2 (이전 운행 SQL) 실행 후에 실행해야 함
-- (Part 1에서 고객 안전망 INSERT가 이미 실행됨 → Part 2의 이전 운행도 이제 정상 매칭)

SET @company_id = 3;
SET @sa = (SELECT user_id FROM users WHERE login_id = 'cblim' LIMIT 1);

-- ---------- 새 엑셀 운행 1252~1429 ----------
-- No.1252: 표영진 / 2026-03-24 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1253: 화로애신창용 / 2026-03-24 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='화로애신창용' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='화로애신창용' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='화로애신창용' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1254: 대박사장님 / 2026-03-24 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대박사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대박사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대박사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1255: 푸르미k5 / 2026-03-24 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='푸르미k5' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='푸르미k5' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='푸르미k5' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1256: 김민규설해원 / 2026-03-24 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='김민규설해원' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='김민규설해원' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='김민규설해원' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1257: 심미토레스 / 2026-03-24 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미토레스' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-24 21:00:00','2026-03-24 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미토레스' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미토레스' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1258: (고객없음) / 2026-03-28 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1259: 태산3801 / 2026-03-28 / 55,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='태산3801' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',55000,55000,0,5500,55000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='태산3801' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='태산3801' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1260: 조양동아반떼 / 2026-03-28 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='조양동아반떼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='조양동아반떼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='조양동아반떼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1261: 한양석재아들 / 2026-03-28 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='한양석재아들' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='한양석재아들' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='한양석재아들' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1262: 상환이형어머니 / 2026-03-28 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1263: 무명 / 2026-03-28 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1264: 박근종 / 2026-03-28 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1265: 무명 / 2026-03-28 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%송림%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-03-28 22:00:00','2026-03-28 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1266: 병훈 / 2026-03-28 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 23:00:00','2026-03-28 23:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1267: 영덕차 / 2026-03-28 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='영덕차' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-28 23:30:00','2026-03-28 23:30:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='영덕차' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-28 23:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='영덕차' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1268: (고객없음) / 2026-03-28 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-03-28 21:00:00','2026-03-28 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1269: (고객없음) / 2026-03-29 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-03-29 21:00:00','2026-03-29 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1270: 무명 / 2026-03-30 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%생대구%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-30 00:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1271: 무명 / 2026-03-30 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%바다이야기%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-30 00:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1272: 박근종 / 2026-03-30 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',25000,15000,10000,1500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'USE',10000,0,'운행 마일리지 사용',@rid,@sa,'2026-03-30 00:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-30 00:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1273: 아이리스양승창 / 2026-03-30 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1274: 어실장물회 / 2026-03-30 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-30 00:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1275: (고객없음) / 2026-03-30 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-03-30 00:00:00','2026-03-30 00:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1276: 무명 / 2026-03-31 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%바다이야기%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-31 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1277: 무명 / 2026-03-31 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%바다이야기%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-31 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1278: 삼호펠리세이드 / 2026-03-31 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-31 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1279: 박근종 / 2026-03-31 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-03-31 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1280: 심미투싼 / 2026-03-31 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-03-31 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1281: (고객없음) / 2026-03-31 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-03-31 21:00:00','2026-03-31 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1282: 무명 / 2026-04-01 / 40,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%38%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,NULL,'2026-04-01 21:00:00','2026-04-01 21:00:00',40000,40000,0,4000,40000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-01 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1283: 주리현장그랜져 / 2026-04-01 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-01 21:00:00','2026-04-01 21:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-01 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1284: 청곡리축사 / 2026-04-01 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-01 21:00:00','2026-04-01 21:00:00',15000,0,15000,0,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1),@company_id,'USE',15000,0,'운행 마일리지 사용',@rid,@sa,'2026-04-01 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1285: 인구목장사장님 / 2026-04-01 / 40,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='인구목장사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-01 23:00:00','2026-04-01 23:00:00',40000,40000,0,4000,40000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='인구목장사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-01 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='인구목장사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1286: (고객없음) / 2026-04-01 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-01 23:00:00','2026-04-01 23:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1287: (고객없음) / 2026-04-01 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-01 21:00:00','2026-04-01 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1288: 푸르미아우디 / 2026-04-02 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-02 20:00:00','2026-04-02 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-02 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1289: 이편한자가용 / 2026-04-02 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='이편한자가용' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-02 20:00:00','2026-04-02 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='이편한자가용' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-02 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='이편한자가용' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1290: (고객없음) / 2026-04-02 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-02 21:00:00','2026-04-02 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1291: 무명 / 2026-04-02 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%송림%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,'설해원','2026-04-02 20:00:00','2026-04-02 20:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-02 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1292: 적은리랜드로버 / 2026-04-03 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='적은리랜드로버' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'적은리','2026-04-03 21:00:00','2026-04-03 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='적은리랜드로버' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='적은리랜드로버' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1293: 아이리스양승창 / 2026-04-03 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'낙산','2026-04-03 21:00:00','2026-04-03 21:00:00',20000,0,20000,0,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'USE',20000,0,'운행 마일리지 사용',@rid,@sa,'2026-04-03 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1294: 푸르미디스커버리 / 2026-04-03 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='푸르미디스커버리' AND company_id=@company_id LIMIT 1),(SELECT partner_id FROM partner_companies WHERE name LIKE '%다래%' AND company_id=@company_id LIMIT 1),'COMPLETED',NULL,'푸르미','2026-04-03 22:00:00','2026-04-03 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='푸르미디스커버리' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='푸르미디스커버리' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1295: 무명 / 2026-04-03 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'솔비치','2026-04-03 22:00:00','2026-04-03 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1296: 무명 / 2026-04-03 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'솔비치','2026-04-03 22:00:00','2026-04-03 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1297: 무명 / 2026-04-03 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'서림','2026-04-03 22:00:00','2026-04-03 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1298: 병훈 / 2026-04-03 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'집','2026-04-03 22:00:00','2026-04-03 22:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1299: (고객없음) / 2026-04-03 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-03 23:00:00','2026-04-03 23:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1300: 무명 / 2026-04-03 / 90,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-03 23:00:00','2026-04-03 23:00:00',90000,90000,0,9000,90000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',9000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-03 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1301: 대명회관사장님 / 2026-04-04 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 19:00:00','2026-04-04 19:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1302: 무명 / 2026-04-04 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 19:00:00','2026-04-04 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1303: 무명 / 2026-04-04 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED','군청',NULL,'2026-04-04 20:00:00','2026-04-04 20:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1304: 군청양승무 / 2026-04-04 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='군청양승무' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 21:00:00','2026-04-04 21:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='군청양승무' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='군청양승무' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1305: 월리카니발 / 2026-04-04 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='월리카니발' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 21:00:00','2026-04-04 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='월리카니발' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='월리카니발' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1306: 레이크지움사장님 / 2026-04-04 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='레이크지움사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 21:30:00','2026-04-04 21:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='레이크지움사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 21:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='레이크지움사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1307: (고객없음) / 2026-04-04 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-04 22:00:00','2026-04-04 22:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1308: 복권사장님 / 2026-04-04 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='복권사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-04 22:30:00','2026-04-04 22:30:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='복권사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-04 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='복권사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1309: 송이노래방 / 2026-04-05 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='송이노래방' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-05 20:00:00','2026-04-05 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='송이노래방' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-05 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='송이노래방' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1310: 심미그랜져 / 2026-04-05 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미그랜져' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-05 20:00:00','2026-04-05 20:00:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미그랜져' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-05 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미그랜져' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1311: (고객없음) / 2026-04-05 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-05 21:00:00','2026-04-05 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1312: 아이리스양승창 / 2026-04-06 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-06 20:00:00','2026-04-06 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-06 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1313: 한우랑손님 / 2026-04-06 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='한우랑손님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-06 21:00:00','2026-04-06 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='한우랑손님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-06 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='한우랑손님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1314: 최고횟집 / 2026-04-06 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='최고횟집' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-06 21:30:00','2026-04-06 21:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최고횟집' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-06 21:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최고횟집' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1315: 최윤정조카 / 2026-04-06 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='최윤정조카' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-06 22:00:00','2026-04-06 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최윤정조카' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-06 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최윤정조카' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1316: 고현순 / 2026-04-06 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='고현순' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-06 22:30:00','2026-04-06 22:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='고현순' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-06 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='고현순' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1317: 다래직원분 / 2026-04-07 / 40,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-07 19:00:00','2026-04-07 19:00:00',40000,40000,0,4000,40000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-07 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1318: 다래직원분 / 2026-04-07 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-07 19:00:00','2026-04-07 19:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-07 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='다래직원분' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1319: 무명 / 2026-04-07 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-07 20:00:00','2026-04-07 20:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-07 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1320: 무명 / 2026-04-07 / 40,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-07 20:00:00','2026-04-07 20:00:00',40000,40000,0,4000,40000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-07 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1321: (고객없음) / 2026-04-07 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-07 21:00:00','2026-04-07 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1322: 그린막국수 / 2026-04-08 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 19:00:00','2026-04-08 19:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1323: 무명 / 2026-04-08 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='임창빈' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 20:00:00','2026-04-08 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1324: 무명 / 2026-04-08 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 20:00:00','2026-04-08 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1325: 그린막국수 / 2026-04-08 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 20:30:00','2026-04-08 20:30:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 20:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1326: 상환이형어머니 / 2026-04-08 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 21:00:00','2026-04-08 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1327: 수자인고객 / 2026-04-08 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='수자인고객' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 21:30:00','2026-04-08 21:30:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='수자인고객' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 21:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='수자인고객' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1328: 병훈 / 2026-04-08 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 22:00:00','2026-04-08 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1329: 샹스빌아베오 / 2026-04-08 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 22:30:00','2026-04-08 22:30:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1330: 이마트쉐보레 / 2026-04-08 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='이마트쉐보레' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 23:00:00','2026-04-08 23:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='이마트쉐보레' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='이마트쉐보레' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1331: 심미투싼 / 2026-04-08 / 40,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 23:00:00','2026-04-08 23:00:00',40000,40000,0,4000,40000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1332: 박근종 / 2026-04-08 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-08 23:00:00','2026-04-08 23:00:00',25000,20000,5000,2000,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'USE',5000,0,'운행 마일리지 사용',@rid,@sa,'2026-04-08 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-08 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1333: 박근종 / 2026-04-09 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-09 19:00:00','2026-04-09 19:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1334: 상환이형어머니 / 2026-04-09 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-09 19:00:00','2026-04-09 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-09 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1335: 대명회관 / 2026-04-09 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-09 21:00:00','2026-04-09 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1336: 어실장물회 / 2026-04-09 / 90,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-09 21:00:00','2026-04-09 21:00:00',90000,90000,0,9000,90000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1),@company_id,'EARN',9000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-09 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='어실장물회' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1337: 카카오 / 2026-04-11 / 24,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'속초','2026-04-11 19:30:00','2026-04-11 19:30:00',24000,24000,0,2400,24000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2400,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 19:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1338: 카카오 / 2026-04-11 / 14,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 20:00:00','2026-04-11 20:00:00',14000,14000,0,1400,14000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1400,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1339: 박근종 / 2026-04-11 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 20:30:00','2026-04-11 20:30:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 20:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1340: 카카오 / 2026-04-11 / 14,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 21:00:00','2026-04-11 21:00:00',14000,14000,0,1400,14000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1400,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1341: 심미비엠지티 / 2026-04-11 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미비엠지티' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 22:00:00','2026-04-11 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미비엠지티' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미비엠지티' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1342: 대명회관사장님 / 2026-04-11 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 22:00:00','2026-04-11 22:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1343: 이태영 / 2026-04-11 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='이태영' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 22:00:00','2026-04-11 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='이태영' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='이태영' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1344: 청곡리축사 / 2026-04-11 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 22:00:00','2026-04-11 22:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='청곡리축사' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1345: 주리현장그랜져 / 2026-04-11 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 22:00:00','2026-04-11 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1346: 나라시 / 2026-04-11 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='나라시' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 23:30:00','2026-04-11 23:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='나라시' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 23:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='나라시' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1347: 다래 / 2026-04-11 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='다래' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-11 23:30:00','2026-04-11 23:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='다래' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-11 23:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='다래' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1348: (고객없음) / 2026-04-11 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-11 23:30:00','2026-04-11 23:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1349: 상환이형어머니 / 2026-04-12 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-12 22:00:00','2026-04-12 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-12 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1350: 기사문마티즈 / 2026-04-12 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='기사문마티즈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-12 21:00:00','2026-04-12 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='기사문마티즈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-12 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='기사문마티즈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1351: (고객없음) / 2026-04-12 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-12 21:00:00','2026-04-12 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1352: (고객없음) / 2026-04-12 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-12 21:00:00','2026-04-12 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1353: 심미투싼 / 2026-04-13 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-13 22:00:00','2026-04-13 22:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-13 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1354: 장수탕모닝 / 2026-04-13 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='장수탕모닝' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-13 22:00:00','2026-04-13 22:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='장수탕모닝' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-13 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='장수탕모닝' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1355: 사천베라크루즈 / 2026-04-13 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='사천베라크루즈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-13 22:00:00','2026-04-13 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='사천베라크루즈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-13 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='사천베라크루즈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1356: 읍내모닝 / 2026-04-13 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='읍내모닝' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-13 22:00:00','2026-04-13 22:00:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='읍내모닝' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-13 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='읍내모닝' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1357: (고객없음) / 2026-04-13 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-13 22:00:00','2026-04-13 22:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1358: 무명 / 2026-04-14 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 19:30:00','2026-04-14 19:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 19:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1359: 삼호펠리세이드 / 2026-04-14 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 19:30:00','2026-04-14 19:30:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 19:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='삼호펠리세이드' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1360: (고객없음) / 2026-04-14 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-14 20:30:00','2026-04-14 20:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1361: (고객없음) / 2026-04-14 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-14 21:00:00','2026-04-14 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1362: 심미투싼 / 2026-04-14 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 21:30:00','2026-04-14 21:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 21:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1363: 월리쏘렌토 / 2026-04-14 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='월리쏘렌토' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 22:30:00','2026-04-14 22:30:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='월리쏘렌토' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='월리쏘렌토' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1364: 상환이형어머니 / 2026-04-14 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 22:30:00','2026-04-14 22:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상환이형어머니' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1365: 아이리스양승창 / 2026-04-14 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-14 23:30:00','2026-04-14 23:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-14 23:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1366: 샹스빌아베오 / 2026-04-15 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-15 21:00:00','2026-04-15 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-15 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1367: (고객없음) / 2026-04-15 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-15 21:00:00','2026-04-15 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1368: 봄날사장님 / 2026-04-16 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='봄날사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'봄날','2026-04-16 19:00:00','2026-04-16 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='봄날사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='봄날사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1369: 카오스 / 2026-04-16 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-16 19:00:00','2026-04-16 19:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1370: 윤치영 / 2026-04-16 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='윤치영' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'수여리','2026-04-16 20:00:00','2026-04-16 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='윤치영' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='윤치영' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1371: 무명 / 2026-04-16 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'설해원','2026-04-16 20:00:00','2026-04-16 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1372: 최고횟집사장님 / 2026-04-16 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'동호리','2026-04-16 20:30:00','2026-04-16 20:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 20:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1373: 대명회관사장님 / 2026-04-16 / 100,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='임창빈' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'집','2026-04-16 21:00:00','2026-04-16 21:00:00',100000,100000,0,10000,100000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',10000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1374: 조산시트로엥 / 2026-04-16 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='조산시트로엥' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'조산','2026-04-16 22:00:00','2026-04-16 22:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='조산시트로엥' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='조산시트로엥' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1375: 카카오 / 2026-04-16 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='권경범' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-16 22:00:00','2026-04-16 22:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카카오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1376: 크리스탈 / 2026-04-16 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='크리스탈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'영랑동','2026-04-16 22:00:00','2026-04-16 22:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='크리스탈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='크리스탈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1377: 상평공업사 / 2026-04-16 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상평공업사' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-16 22:30:00','2026-04-16 22:30:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='상평공업사' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-16 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='상평공업사' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1378: (고객없음) / 2026-04-16 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-16 22:30:00','2026-04-16 22:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1379: 대명회관사장님 / 2026-04-18 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 19:00:00','2026-04-18 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-18 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1380: 무명 / 2026-04-18 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 19:00:00','2026-04-18 19:00:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-18 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1381: 심미투싼 / 2026-04-18 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 21:00:00','2026-04-18 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-18 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1382: 산마루사장님 / 2026-04-18 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='산마루사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 21:00:00','2026-04-18 21:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='산마루사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-18 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='산마루사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1383: 그린막국수 / 2026-04-18 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 21:00:00','2026-04-18 21:00:00',30000,25000,5000,2500,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),@company_id,'USE',5000,0,'운행 마일리지 사용',@rid,@sa,'2026-04-18 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1) IS NOT NULL;
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-18 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1384: 레이크지움사장님 / 2026-04-18 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='레이크지움사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-18 22:00:00','2026-04-18 22:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1385: (고객없음) / 2026-04-18 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-18 21:00:00','2026-04-18 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1386: 현순 / 2026-04-20 / 10,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='현순' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-20 19:00:00','2026-04-20 19:00:00',10000,10000,0,1000,10000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='현순' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-20 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='현순' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1387: 박근종 / 2026-04-20 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-20 20:00:00','2026-04-20 20:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1388: (고객없음) / 2026-04-20 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-20 20:00:00','2026-04-20 20:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1389: (고객없음) / 2026-04-20 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-20 20:30:00','2026-04-20 20:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1390: (고객없음) / 2026-04-20 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-20 21:30:00','2026-04-20 21:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1392: 무명 / 2026-04-21 / 150,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='임창빈' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,'춘천','2026-04-21 19:00:00','2026-04-21 19:00:00',150000,150000,0,15000,150000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',15000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1393: 아이리스양승창 / 2026-04-21 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 19:00:00','2026-04-21 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1394: 무명 / 2026-04-21 / 70,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 20:00:00','2026-04-21 20:00:00',70000,70000,0,7000,70000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',7000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1395: 카르텔사장님 / 2026-04-21 / 45,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='임창빈' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 21:00:00','2026-04-21 21:00:00',45000,45000,0,4500,45000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1396: 상평공업사 / 2026-04-21 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='상평공업사' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 21:00:00','2026-04-21 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1397: 주리현장그랜져 / 2026-04-21 / 50,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,(SELECT user_id FROM users WHERE name='이대원' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),NULL,(SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 22:30:00','2026-04-21 22:30:00',50000,50000,0,5000,50000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),@company_id,'EARN',5000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 22:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1398: 카오스 / 2026-04-21 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-21 23:00:00','2026-04-21 23:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-21 23:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카오스' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1399: (고객없음) / 2026-04-21 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-21 23:30:00','2026-04-21 23:30:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1400: 심미투싼 / 2026-04-22 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-22 20:00:00','2026-04-22 20:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-22 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1401: 박근종 / 2026-04-22 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-22 20:00:00','2026-04-22 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-22 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='박근종' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1402: 표영진 / 2026-04-22 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-22 20:00:00','2026-04-22 20:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-22 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='표영진' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1403: 주리현장그랜져 / 2026-04-23 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-23 20:00:00','2026-04-23 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-23 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='주리현장그랜져' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1404: 석교리모닝 / 2026-04-23 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='석교리모닝' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='석교리모닝' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-23 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='석교리모닝' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1405: 푸르미아우디 / 2026-04-23 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-23 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='푸르미아우디' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1406: 나하나2차 / 2026-04-23 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='나하나2차' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='나하나2차' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-23 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='나하나2차' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1407: 양양하다 / 2026-04-23 / 60,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='양양하다' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',60000,60000,0,6000,60000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='양양하다' AND company_id=@company_id LIMIT 1),@company_id,'EARN',6000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-23 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='양양하다' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1408: (고객없음) / 2026-04-23 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1409: (고객없음) / 2026-04-23 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-23 21:00:00','2026-04-23 21:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1410: 아이리스양승창 / 2026-04-24 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-24 19:00:00','2026-04-24 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-24 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1411: 김완섭 / 2026-04-24 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='김완섭' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-24 19:30:00','2026-04-24 19:30:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='김완섭' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-24 19:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='김완섭' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1412: 대명회관사장님 / 2026-04-24 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-24 21:00:00','2026-04-24 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1413: 그린막국수 / 2026-04-24 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-24 21:00:00','2026-04-24 21:00:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-24 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='그린막국수' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1414: 최고횟집사장님 / 2026-04-27 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1415: 아이리스양승창 / 2026-04-27 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='아이리스양승창' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1416: 샹스빌아베오 / 2026-04-27 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='샹스빌아베오' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1417: 로얄투싼 / 2026-04-27 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='로얄투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='로얄투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='로얄투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1418: 대명회관사장님 / 2026-04-27 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',15000,0,15000,0,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1),@company_id,'USE',15000,0,'운행 마일리지 사용',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대명회관사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1419: 최고횟집사장님 / 2026-04-27 / 35,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',35000,35000,0,3500,35000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1420: 무명 / 2026-04-27 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1421: 무명 / 2026-04-27 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-27 21:00:00','2026-04-27 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-27 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='무명' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1422: (고객없음) / 2026-04-28 / 0
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,NULL,NULL,'COMPLETED',NULL,NULL,'2026-04-28 19:00:00','2026-04-28 19:00:00',0,0,0,0,0,6,NULL);
SET @rid=LAST_INSERT_ID();

-- No.1423: 통일직원가평 / 2026-04-28 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='통일직원가평' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 19:00:00','2026-04-28 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='통일직원가평' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='통일직원가평' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1424: 최고횟집사장님 / 2026-04-28 / 20,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 19:00:00','2026-04-28 19:00:00',20000,20000,0,2000,20000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 19:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='최고횟집사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1425: 심미투싼 / 2026-04-28 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 20:00:00','2026-04-28 20:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 20:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='심미투싼' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1426: 대리황천호 / 2026-04-28 / 30,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='대리황천호' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 20:30:00','2026-04-28 20:30:00',30000,30000,0,3000,30000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='대리황천호' AND company_id=@company_id LIMIT 1),@company_id,'EARN',3000,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 20:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='대리황천호' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1427: 카르텔사장님 / 2026-04-28 / 45,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 20:30:00','2026-04-28 20:30:00',45000,45000,0,4500,45000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1),@company_id,'EARN',4500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 20:30:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='카르텔사장님' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1428: 병훈 / 2026-04-28 / 15,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 21:00:00','2026-04-28 21:00:00',15000,15000,0,1500,15000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1),@company_id,'EARN',1500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 21:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='병훈' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- No.1429: 여운포리현장싼타페 / 2026-04-28 / 25,000
INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,status,start_address,end_address,started_at,ended_at,total_fare,cash_amount,mileage_used,mileage_earned,final_amount,payment_type_id,rider_memo) VALUES(@company_id,@sa,NULL,(SELECT customer_id FROM customers WHERE name='여운포리현장싼타페' AND company_id=@company_id LIMIT 1),NULL,'COMPLETED',NULL,NULL,'2026-04-28 22:00:00','2026-04-28 22:00:00',25000,25000,0,2500,25000,6,NULL);
SET @rid=LAST_INSERT_ID();
INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,description,ride_id,processed_by,created_at) SELECT (SELECT customer_id FROM customers WHERE name='여운포리현장싼타페' AND company_id=@company_id LIMIT 1),@company_id,'EARN',2500,0,'운행 마일리지 적립',@rid,@sa,'2026-04-28 22:00:00' FROM dual WHERE (SELECT customer_id FROM customers WHERE name='여운포리현장싼타페' AND company_id=@company_id LIMIT 1) IS NOT NULL;

-- ---------- balance_after 재계산 ----------
UPDATE customer_mileage cm
INNER JOIN (
  SELECT mileage_id,
    @bal:=IF(@pc=customer_id,@bal+IF(type IN('EARN','ADJUST'),amount,-amount),IF(type IN('EARN','ADJUST'),amount,-amount)) AS cb,
    @pc:=customer_id AS _p
  FROM customer_mileage,(SELECT @bal:=0,@pc:=0) v
  WHERE company_id=@company_id ORDER BY customer_id,created_at,mileage_id
) c ON cm.mileage_id=c.mileage_id SET cm.balance_after=GREATEST(c.cb,0);

-- ---------- 고객시트 누적값으로 잔액 덮어쓰기 (최종) ----------
UPDATE customers SET mileage_balance=3500 WHERE name='38' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='38횟집' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='4931' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='강현비행장' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='강현지에스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='고기순' AND company_id=@company_id;
UPDATE customers SET mileage_balance=40500 WHERE name='고현순' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='군바리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='군인' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='군청양승무' AND company_id=@company_id;
UPDATE customers SET mileage_balance=37500 WHERE name='그린막국수' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='기사문마티즈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=11000 WHERE name='기사문배사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1000 WHERE name='기현' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='김규식' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='김대희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='김동일' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='김두호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='김멍선' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='김명선' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='김명섭' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='김민규설해원' AND company_id=@company_id;
UPDATE customers SET mileage_balance=10000 WHERE name='김봉열' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='김삼호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='김성재' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='김승민' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='김영삼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='김완규' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='김완섭' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='김재형' AND company_id=@company_id;
UPDATE customers SET mileage_balance=30000 WHERE name='김정원' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9500 WHERE name='김종길' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='김종필' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='김주삼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='김주헌' AND company_id=@company_id;
UPDATE customers SET mileage_balance=12000 WHERE name='김주호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='김진만' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='김춘기' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='김학종' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='김현주' AND company_id=@company_id;
UPDATE customers SET mileage_balance=25500 WHERE name='김홍래' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6500 WHERE name='김회욱' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='깔끄미' AND company_id=@company_id;
UPDATE customers SET mileage_balance=91000 WHERE name='나라시' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='나하나2차' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='네이버' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='노남형댕구기' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8500 WHERE name='노승법' AND company_id=@company_id;
UPDATE customers SET mileage_balance=33000 WHERE name='다래' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='다래1' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='다래따님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=14500 WHERE name='다래사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='다래실장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=7500 WHERE name='다래직원분' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='다래직원분2' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='당구장주문진' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='대건철강' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='대리황천호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=0 WHERE name='대명회관' AND company_id=@company_id;
UPDATE customers SET mileage_balance=15500 WHERE name='대명회관사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='대박사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='대원안경후배' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='댕구기사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='들돌골' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='레이크지움사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='로얄모하비' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='로얄투싼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='명동모텔사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='몽스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='몽피씨' AND company_id=@company_id;
UPDATE customers SET mileage_balance=788000 WHERE name='무명' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='물치k5' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='미송펜션' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='미송호텔' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='바다대리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='바다콜' AND company_id=@company_id;
UPDATE customers SET mileage_balance=7000 WHERE name='박계원' AND company_id=@company_id;
UPDATE customers SET mileage_balance=15000 WHERE name='박근종' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='박기동' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='박기종' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='박기흥' AND company_id=@company_id;
UPDATE customers SET mileage_balance=0 WHERE name='박병훈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='박상민' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='박상혁' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='박상호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6500 WHERE name='박정균' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='박정달' AND company_id=@company_id;
UPDATE customers SET mileage_balance=16500 WHERE name='박종국' AND company_id=@company_id;
UPDATE customers SET mileage_balance=12000 WHERE name='박준희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='박창희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='박철순' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6500 WHERE name='박태용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='박현철' AND company_id=@company_id;
UPDATE customers SET mileage_balance=15500 WHERE name='박형준' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='배영배' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='범부새댁' AND company_id=@company_id;
UPDATE customers SET mileage_balance=37000 WHERE name='병훈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='보스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='복권사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='복이네' AND company_id=@company_id;
UPDATE customers SET mileage_balance=30000 WHERE name='복이네사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='봄날사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='부소치에쿠스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='사교리누나' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='사랑대게' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='사천베라크루즈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='산마루사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=7500 WHERE name='산머루사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=15500 WHERE name='삼호펠리세이드' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='상광정9702' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='상왕도리bmw' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='상평공업사' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17000 WHERE name='상환이형어머니' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='샹스빌아베오' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='서갑용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='석교리모닝' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='석교리소렌토' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='선라이즈80' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8000 WHERE name='설악중모닝' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='성호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='성호최승영' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='소정훈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='속초' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='속초일출군인' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='손양레이' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='손영비' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8500 WHERE name='손정현' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='솔비치부영' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='송이골' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='송이노래방' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='송현마을회관' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='수리5899' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='수리교회' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='수산포차' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='수여리포터' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='수이' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='수자인고객' AND company_id=@company_id;
UPDATE customers SET mileage_balance=7500 WHERE name='스위트엠x4' AND company_id=@company_id;
UPDATE customers SET mileage_balance=18000 WHERE name='승우' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6500 WHERE name='신동관' AND company_id=@company_id;
UPDATE customers SET mileage_balance=14000 WHERE name='신우영' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='신우철' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='신의섭' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='신지훈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='신풍힐타운' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='심미그랜져' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='심미비엠지티' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='심미쉐보레' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='심미토레스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17000 WHERE name='심미투싼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='심철현' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='써밋베이' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8000 WHERE name='아이리스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=46000 WHERE name='아이리스양승창' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='아침바다주공' AND company_id=@company_id;
UPDATE customers SET mileage_balance=26000 WHERE name='양양하다' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='양현석댕구기' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='어실장물회' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='엄창수' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='여운포리현장싼타페' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='열방5810' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='영덕차' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='영록' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='영만' AND company_id=@company_id;
UPDATE customers SET mileage_balance=11500 WHERE name='영욱' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='영진코아루' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='오춘택' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='우신연립' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='우주흥' AND company_id=@company_id;
UPDATE customers SET mileage_balance=25000 WHERE name='월리소렌토' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='월리쏘렌토' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='월리카니발' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='윗상평트랙스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='윗상평트랙스4351' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='유화캐스퍼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='윤지만' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='윤지민' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='윤치영' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='읍내모닝' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8500 WHERE name='이건용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='이광희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='이규석' AND company_id=@company_id;
UPDATE customers SET mileage_balance=13000 WHERE name='이기호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='이나정' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='이남형' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='이동봉' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='이동형' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='이마트쉐보레' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='이수형' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='이승우' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='이천우' AND company_id=@company_id;
UPDATE customers SET mileage_balance=33500 WHERE name='이태영' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='이편한7507' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='이편한자가용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=8000 WHERE name='이현광' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='이현철' AND company_id=@company_id;
UPDATE customers SET mileage_balance=29000 WHERE name='인구목장' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='인구목장사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='임천3583' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='자이싼타페' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='작은엄마' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='장수탕모닝' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='적은리1247' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='적은리랜드로버' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='전근배' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='전보준' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='전상철' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='전세열' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='정승교' AND company_id=@company_id;
UPDATE customers SET mileage_balance=40500 WHERE name='정준하' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='조산시트로엥' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='조양교회' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='조양동3' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='조양동7030' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='조양동아반떼' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='조양동아이써티' AND company_id=@company_id;
UPDATE customers SET mileage_balance=20500 WHERE name='조진' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='주리그랜져' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='주리포터' AND company_id=@company_id;
UPDATE customers SET mileage_balance=30000 WHERE name='주리현장그랜져' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='주현' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='중복리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='진민수' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='창수' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='청곡리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='청곡리축사' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='초등학교손님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4500 WHERE name='최고횟집' AND company_id=@company_id;
UPDATE customers SET mileage_balance=15000 WHERE name='최고횟집사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9500 WHERE name='최근배' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='최봉석' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='최선자의원' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='최영식' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='최윤정' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='최윤정조카' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='최일권' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='최준희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5000 WHERE name='최지용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=20500 WHERE name='최필규' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='추신호' AND company_id=@company_id;
UPDATE customers SET mileage_balance=9000 WHERE name='카르텔사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='카오스' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='카오스43' AND company_id=@company_id;
UPDATE customers SET mileage_balance=206200 WHERE name='카카오' AND company_id=@company_id;
UPDATE customers SET mileage_balance=17500 WHERE name='크리스탈' AND company_id=@company_id;
UPDATE customers SET mileage_balance=5500 WHERE name='태산3801' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='토마토사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='통일직원가평' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='포월리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=32500 WHERE name='표영진' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='푸르미디스커버리' AND company_id=@company_id;
UPDATE customers SET mileage_balance=10500 WHERE name='푸르미아우디' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='푸르미k5' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='하나로마트' AND company_id=@company_id;
UPDATE customers SET mileage_balance=0 WHERE name='하이팰콜로라도' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='한양석재' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='한양석재아들' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='한우랑손님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='해맞이식당' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6000 WHERE name='해오름군인' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2500 WHERE name='헌희' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='헬스장사장님' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='현북조합장' AND company_id=@company_id;
UPDATE customers SET mileage_balance=4000 WHERE name='현북조합장정재석' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1000 WHERE name='현순' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='홍콩' AND company_id=@company_id;
UPDATE customers SET mileage_balance=2000 WHERE name='화로애' AND company_id=@company_id;
UPDATE customers SET mileage_balance=18000 WHERE name='화로애신창용' AND company_id=@company_id;
UPDATE customers SET mileage_balance=13000 WHERE name='황동식' AND company_id=@company_id;
UPDATE customers SET mileage_balance=6500 WHERE name='황병길' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3000 WHERE name='황성남' AND company_id=@company_id;
UPDATE customers SET mileage_balance=1500 WHERE name='황시내' AND company_id=@company_id;
UPDATE customers SET mileage_balance=3500 WHERE name='황영환' AND company_id=@company_id;
UPDATE customers SET mileage_balance=0 WHERE name='ㅡㅡ' AND company_id=@company_id;

-- ---------- 최종 검증 ----------
SELECT '운행 건수' AS item, COUNT(*) AS cnt FROM rides WHERE company_id=@company_id
UNION ALL SELECT '마일리지 거래 건수', COUNT(*) FROM customer_mileage WHERE company_id=@company_id
UNION ALL SELECT '마일리지 보유 고객(잔액>0)', COUNT(*) FROM customers WHERE company_id=@company_id AND mileage_balance>0
UNION ALL SELECT CONCAT('총 마일리지 잔액: ', FORMAT(SUM(mileage_balance),0),'원'), COUNT(*) FROM customers WHERE company_id=@company_id
UNION ALL SELECT '미매칭 운행 (customer_id NULL & total_fare>0)', COUNT(*) FROM rides WHERE company_id=@company_id AND customer_id IS NULL AND total_fare>0;

-- 예상 결과:
--   운행 건수: 약 1,286건 (이전 1,109 + 새 177)
--   총 마일리지 잔액: 2,817,200원