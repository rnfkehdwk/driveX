-- 통합권한관리 테이블
-- 메뉴별 역할 접근 권한 설정
-- MASTER가 각 메뉴에 대해 어떤 역할이 접근할 수 있는지 설정

CREATE TABLE IF NOT EXISTS role_permissions (
  permission_id  BIGINT      NOT NULL AUTO_INCREMENT,
  menu_key       VARCHAR(50) NOT NULL COMMENT '메뉴 키 (예: rides, customers, partners)',
  menu_label     VARCHAR(50) NOT NULL COMMENT '메뉴 표시명',
  menu_group     VARCHAR(30) NOT NULL DEFAULT '기타' COMMENT '메뉴 그룹 (대시보드, 운행, 정산, 관리)',
  platform       ENUM('WEB','MOBILE','BOTH') NOT NULL DEFAULT 'BOTH' COMMENT '플랫폼',
  role_master    BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'MASTER 접근',
  role_superadmin BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'SUPER_ADMIN 접근',
  role_rider     BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'RIDER 접근',
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (permission_id),
  UNIQUE KEY uk_menu (menu_key)
) ENGINE=InnoDB COMMENT='통합 권한 관리';

-- 기본 데이터 삽입
INSERT IGNORE INTO role_permissions (menu_key, menu_label, menu_group, platform, role_master, role_superadmin, role_rider) VALUES
-- 관리자 웹 메뉴
('dashboard', '대시보드', '대시보드', 'WEB', TRUE, TRUE, FALSE),
('rides', '운행일지', '운행', 'WEB', TRUE, TRUE, FALSE),
('partners_call', '제휴업체 콜', '운행', 'WEB', TRUE, TRUE, FALSE),
('mileage', '마일리지', '운행', 'WEB', TRUE, TRUE, FALSE),
('settlements', '정산관리', '정산', 'WEB', TRUE, TRUE, FALSE),
('fare_policies', '요금설정', '정산', 'WEB', TRUE, TRUE, FALSE),
('billing', '사용료', '정산', 'WEB', TRUE, TRUE, FALSE),
('users', '기사관리', '관리', 'WEB', TRUE, TRUE, FALSE),
('customers', '고객관리', '관리', 'WEB', TRUE, TRUE, FALSE),
('partner_manage', '제휴업체관리', '관리', 'WEB', TRUE, TRUE, FALSE),
('payment_types', '결제구분', '관리', 'WEB', TRUE, TRUE, FALSE),
('companies', '업체관리', '관리', 'WEB', TRUE, FALSE, FALSE),
('permissions', '통합권한관리', '관리', 'WEB', TRUE, FALSE, FALSE),
-- 모바일 메뉴
('m_ride_new', '운행기록 작성', '운행', 'MOBILE', TRUE, TRUE, TRUE),
('m_ride_list', '운행기록 조회', '운행', 'MOBILE', TRUE, TRUE, TRUE),
('m_rider_new', '기사 등록', '관리', 'MOBILE', TRUE, TRUE, FALSE),
('m_customer_new', '고객 등록', '관리', 'MOBILE', TRUE, TRUE, TRUE),
('m_customer_list', '고객 조회', '관리', 'MOBILE', TRUE, TRUE, TRUE),
('m_partner_list', '제휴업체 관리', '관리', 'MOBILE', TRUE, TRUE, FALSE);
