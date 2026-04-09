# DriveLog 개발 현황

> **버전**: API v2.6 (2026-04-08)
> **저장소**: `C:\Drivelog\` (Git 미사용, 로컬 + NAS 동기화)
> **배포 환경**: Synology NAS Docker (drivelog-api, drivelog-db, drivelog-nginx)
> **파일럿**: 양양대리 (company_id=3) — 실 운영 중

---

## 📊 한눈에 보기

| 카테고리 | 완료 | 진행 중 | 미착수 |
|---|---|---|---|
| 백엔드 라우트 | 22 | 1 (mileage 보완) | - |
| 프론트 페이지 (관리자) | 22 | 1 (Mileage 재구성) | - |
| 프론트 페이지 (모바일) | 10 | - | 1 (운행 마일리지) |
| DB 마이그레이션 | 19 | - | - |
| 핵심 기능 | 14 | 2 | 4 |

**현재 운영 데이터** (양양대리):
- 활성 고객 239명, 활성 기사 21명+
- 마일리지 보유 232명 (1,509,000원)
- 3월 운영: 1,865,000원 / 97건

---

## ✅ 완료된 기능 (카테고리별)

### 1. 인증 / 계정 시스템 ✅
| 기능 | 백엔드 | 프론트 | 비고 |
|---|---|---|---|
| 로그인 (업체코드 + ID + PW) | `POST /api/auth/login` | Login.jsx | bcrypt 12, JWT |
| 로그아웃 | `POST /api/auth/logout` | App.jsx | 리프레시 토큰 무효화 |
| 토큰 갱신 | `POST /api/auth/refresh` | client.js 인터셉터 | 401 시 자동 |
| 비밀번호 변경 | `POST /api/auth/change-password` | PasswordModal | 이력 검증 |
| 계정 잠금 (5회 실패) | auth.js 미들웨어 | - | locked_until |
| 셀프 가입 | `POST /api/public/register` | Register.jsx | 무료 체험 14일 |
| 가입 신청 ↔ 승인 | `PUT /api/companies/:id/approve` | Companies.jsx | MASTER 전용 |
| 본인 정보 조회 | `GET /api/auth/me` | App.jsx 라이프사이클 | 라이선스/기사수 체크 |

### 2. 업체 관리 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 업체 목록 | `GET /api/companies` | Companies.jsx |
| 업체 등록 | `POST /api/companies` | Companies.jsx |
| 업체 수정 | `PUT /api/companies/:id` | Companies.jsx |
| 업체 좌표 자동 채움 | (카카오 geocoding) | AddressSearchModal |
| 라이선스 만료 처리 | checkLicense 미들웨어 | ExpiredOverlay |
| 만료 임박 배너 (7일 전) | - | ExpiringBanner |

### 3. 콜 시스템 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 콜 목록 | `GET /api/calls` | CallManage.jsx, CallList.jsx (모바일) |
| 콜 생성 | `POST /api/calls` | CreateCallModal |
| **자주 가는 주소 즐겨찾기 ⭐** | `GET /api/calls/frequent-addresses` | ⭐ 버튼 + 드롭다운 |
| **수동 기사 지명 🚗** | POST /api/calls (assigned_rider_id) | 🚗 드롭다운 + 파란 배경 |
| 콜 상태 변경 | `PUT /api/calls/:id` | - |
| 콜 ↔ 운행 연결 | rides.call_id | 자동 |

### 4. 운행 일지 (rides) ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 운행 목록 (필터, 페이징) | `GET /api/rides` | Rides.jsx, RideList.jsx (모바일) |
| 운행 상세 | `GET /api/rides/:id` | RideDetail (모달) |
| 운행 작성 | `POST /api/rides` | RideNew.jsx (모바일), 모달 (관리자) |
| 운행 수정 | `PUT /api/rides/:id` | - |
| 운행 삭제 | `DELETE /api/rides/:id` | - |
| 픽업 기사 (1대2 운행) | rides.pickup_rider_id | - |
| 결제구분 자동 매핑 | resolvePaymentTypeId() | - |
| **마일리지 자동 적립** (운임 - 마일리지 사용액의 N%) | rides.js POST | - |
| **마일리지 사용 처리** (5000원 단위 + 잔액 검증) | rides.js POST | - |
| GPS 자동 검증 생성 | manual_gps_points 자동 INSERT | - |

### 5. 정산 시스템 v1 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 정산 목록 | `GET /api/settlements` | Settlements.jsx |
| 정산 생성 (주간/월간) | `POST /api/settlements` | Settlements.jsx |
| 정산 승인/지급 | `PUT /api/settlements/:id/approve` | - |

### 6. 정산 시스템 v2 (정산방식) ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 업체 정산방식 설정 | `GET/PUT /api/pay-settings/company` | (정산 설정 페이지) |
| 기사별 개별 단가 | `GET/PUT /api/pay-settings/riders` | - |
| **근무시간 입력 (0.5h 단위)** | `POST /api/pay-settings/attendance` | **Attendance.jsx 신규** |
| 근무시간 조회 | `GET /api/pay-settings/attendance` | Attendance.jsx |
| 근무시간 수정/삭제 | `PUT/DELETE /api/pay-settings/attendance/:id` | Attendance.jsx |
| 같은 기사+날짜 자동 UPDATE | (덮어쓰기 로직) | "수정 저장" 버튼 |

### 7. 운임 정산 (FareSettlement) ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| **일별 정산** | `GET /api/settlements/daily` | DailyTab |
| **월별 정산 자동 계산** | `GET /api/settlements/monthly-payout` | MonthlyTab |
| 4 KPI 카드 (총매출/기사보유/회사보유/회사수수료) | - | DailyTab + MonthlyTab |
| 기사별 정산 테이블 (9컬럼) | - | DailyTab + MonthlyTab |
| 정산방식 컬러 배지 | - | COMMISSION 파랑 / HOURLY 보라 / PER_RIDE 청록 |
| 정산 방향 자동 칩 | - | 빨강 (기사→회사) / 파랑 (회사→기사) / 녹색 (완료) |
| **카카오톡 공유 💬** | - | buildShareText() + Web Share API |
| **Excel 다운로드** | - | DailyTab |
| **정산서 인쇄 🖨️** | - | `@media print` + .print-area |
| **일별/월별 탭 분리** | - | URL 쿼리 ?tab=monthly 유지 |

### 8. 마일리지 시스템 (백엔드 1단계 완료) ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 전체 고객 잔액 조회 | `GET /api/mileage` | (Mileage.jsx 재구성 필요) |
| 회사 통계 | `GET /api/mileage/summary` | - |
| 특정 고객 + 이력 | `GET /api/mileage/customer/:id` | - |
| 수동 적립/차감 | `POST /api/mileage/adjust` | - |
| 거래 이력 (월별 필터) | `GET /api/mileage/transactions` | - |
| **운행 작성 시 마일리지 사용** | rides POST 통합 | - |
| **5,000원 단위 검증** | rides POST | - |
| **잔액 부족 검증** | FOR UPDATE 잠금 | - |
| **자동 적립** (운임 - 사용액의 10%) | rides POST | - |
| 마일리지 복리 방지 (사용분 제외 적립) | earnableAmount 계산 | - |

### 9. 결제구분 / 결제그룹 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 결제구분 CRUD | `/api/payment-types` | PaymentTypes.jsx |
| 결제그룹 CRUD | `/api/settlement-groups` | (PaymentTypes.jsx 통합) |
| 결제구분 ↔ 결제그룹 매핑 | payment_types.settlement_group_id | - |
| 결제구분 자동 매핑 (운행 작성 시) | resolvePaymentTypeId() | - |
| payment_method → payment_type_id 마이그레이션 | migration_rides_payment_type | - |
| payment_method DEPRECATED | migration_payment_method_soft_deprecated | - |

### 10. 고객 관리 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 고객 목록 (검색, 페이징) | `GET /api/customers` | Customers.jsx, CustomerList.jsx (모바일) |
| 고객 등록 | `POST /api/customers` | CustomerNew.jsx |
| 고객 수정 | `PUT /api/customers/:id` | Customers.jsx |
| 고객 삭제 (soft) | `DELETE /api/customers/:id` | - |
| 고객 코드 자동 생성 | (코드 패턴) | - |

### 11. 제휴업체 (Partners) ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 제휴업체 목록 | `GET /api/partners` | Partners.jsx, PartnerList.jsx (모바일) |
| 제휴업체 관리 | `POST/PUT/DELETE /api/partners` | PartnerManage.jsx |
| 제휴업체별 콜 통계 | `GET /api/stats/partners` | Partners.jsx |
| **partner_code 자동 생성** | migration_partner_code | - |

### 12. 사용료 / 과금 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 요금제 목록 | `GET /api/billing-plans` | Billing.jsx |
| 요금제 관리 | `/api/billing-plans` CRUD | (MASTER 전용) |
| 월별 청구 자동 계산 | `GET /api/billing/monthly` | Billing.jsx |
| 기사수 초과 시 잠금 | RiderExceededOverlay | - |
| 요금제 시즌별 특별가 | `/api/billing-plans/seasonal` | - |
| 요금제 변경 이력 | plan_change_history | - |
| 요금제 노출 제어 | is_visible | - |
| 입금 계좌 안내 | system_settings | Billing.jsx |

### 13. 권한 관리 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 통합 권한 매트릭스 | `GET /api/permissions` | Permissions.jsx |
| 권한 일괄 수정 | `PUT /api/permissions/bulk/update` | Permissions.jsx |
| 업체별 개별 권한 | `GET/PUT /api/permissions/company/:id` | - |
| 메뉴별 역할 토글 | role_permissions | Permissions.jsx |

### 14. 문의사항 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 문의 등록 | `POST /api/inquiries` | InquiryModal |
| 문의 목록 (MASTER) | `GET /api/inquiries` | Inquiries.jsx |
| 문의 답변 | `PUT /api/inquiries/:id/reply` | Inquiries.jsx |
| 본인 문의 목록 (SUPER_ADMIN) | `GET /api/inquiries/mine` | MyInquiries.jsx |
| 문의 종류 5개 | RENEWAL/UPGRADE/DOWNGRADE/GENERAL/BUG | InquiryModal |

### 15. 시스템 설정 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 시스템 설정 조회/수정 | `/api/system-settings` | SystemSettings.jsx |
| 무료 체험 기간 설정 | free_trial_days | SystemSettings.jsx |
| 가입 활성화 토글 | registration_enabled | SystemSettings.jsx |
| 입금 계좌 설정 | payment_bank/account/holder | SystemSettings.jsx |
| GPS 설정 | `/api/system-settings/gps` | - |

### 16. 감사 로그 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 감사 로그 조회 | `GET /api/audit-logs` | (관리자 화면) |
| 자동 기록 | writeAuditLog() 헬퍼 | - |
| 기록 액션 | RIDE_CREATE, MILEAGE_ADJUST, CALL_CREATE_ASSIGN, ... | - |

### 17. 대시보드 / 리포트 ✅
| 기능 | 백엔드 | 프론트 |
|---|---|---|
| 업체 대시보드 | `GET /api/stats/dashboard` | Dashboard.jsx |
| MASTER 대시보드 | `GET /api/stats/master` | MasterDashboard.jsx |
| 월간 리포트 | `GET /api/stats/monthly` | Reports.jsx |
| 일자별 통계 | `GET /api/stats/daily` | Dashboard.jsx |

### 18. 인프라 / 배포 ✅
| 기능 | 도구 |
|---|---|
| Docker Compose 멀티 컨테이너 | drivelog-api / drivelog-db / drivelog-nginx |
| Synology NAS 운영 | 192.168.0.2 |
| DDNS 외부 접속 | rnfkehdwk.synology.me:38443 |
| **배포 자동화** | `npm run deploy:all` (~30초) |
| **부분 배포** | `deploy:admin` / `deploy:mobile` / `deploy:server` |
| SSH 키 인증 | ed25519 |
| sudoers NOPASSWD (docker-compose만) | /etc/sudoers.d/drivelog-deploy |
| 검증용 데이터 자동 정리 | startCleanupScheduler (14일 경과) |

---

## 📁 프론트 페이지 목록

### 관리자 웹 (`drivelog-admin/client/src/pages/`)
| 페이지 | 상태 | 권한 |
|---|---|---|
| Login.jsx | ✅ | 모두 |
| Register.jsx | ✅ | 비로그인 |
| Dashboard.jsx | ✅ | SUPER_ADMIN |
| MasterDashboard.jsx | ✅ | MASTER |
| Reports.jsx | ✅ | MASTER, SUPER_ADMIN |
| **CallManage.jsx** | ✅ | SUPER_ADMIN |
| Rides.jsx | ✅ | MASTER, SUPER_ADMIN |
| Partners.jsx | ✅ | MASTER, SUPER_ADMIN |
| **Mileage.jsx** | 🟡 (mockData 사용 중, 재작성 필요) | MASTER, SUPER_ADMIN |
| Settlements.jsx | ✅ | MASTER, SUPER_ADMIN |
| **FareSettlement.jsx** (DailyTab + MonthlyTab) | ✅ | SUPER_ADMIN |
| **Attendance.jsx** (신규) | ✅ | SUPER_ADMIN, MASTER |
| FarePolicies.jsx | ✅ | MASTER, SUPER_ADMIN |
| Billing.jsx | ✅ | MASTER, SUPER_ADMIN |
| Users.jsx | ✅ | MASTER, SUPER_ADMIN |
| Customers.jsx | ✅ | MASTER, SUPER_ADMIN |
| PartnerManage.jsx | ✅ | MASTER, SUPER_ADMIN |
| PaymentTypes.jsx | ✅ | MASTER, SUPER_ADMIN |
| Companies.jsx | ✅ | MASTER |
| Permissions.jsx | ✅ | MASTER |
| SystemSettings.jsx | ✅ | MASTER |
| Inquiries.jsx | ✅ | MASTER |
| MyInquiries.jsx | ✅ | SUPER_ADMIN |

### 모바일 PWA (`drivelog-mobile/src/pages/`)
| 페이지 | 상태 |
|---|---|
| Login.jsx | ✅ |
| Home.jsx | ✅ |
| RideList.jsx | ✅ |
| RideNew.jsx | ✅ |
| CustomerList.jsx | ✅ |
| CustomerNew.jsx | ✅ |
| RiderNew.jsx | ✅ |
| PartnerList.jsx | ✅ |
| **CallList.jsx** (즐겨찾기 + 기사 지명) | ✅ |
| Settings.jsx | ✅ |

---

## 🔌 백엔드 라우트 목록

| 파일 | 주요 endpoint |
|---|---|
| `auth.js` | login, logout, refresh, change-password, me |
| `publicRoutes.js` | register (셀프 가입) |
| `companies.js` | CRUD, approve |
| `users.js` | CRUD (기사 관리) |
| `customers.js` | CRUD |
| `partners.js` | CRUD |
| `paymentTypes.js` | CRUD |
| `settlementGroups.js` | CRUD |
| `farePolices.js` | CRUD |
| `rides.js` | CRUD + 마일리지 통합 |
| **`mileage.js`** (신규) | summary, list, customer/:id, adjust, transactions |
| `settlements.js` | CRUD + daily + **monthly-payout** |
| `paySettings.js` | company / riders / **attendance** |
| `calls.js` | CRUD + **frequent-addresses** + 지명 |
| `billing.js` | monthly |
| `billingPlans.js` | CRUD + seasonal + history |
| `permissions.js` | bulk update + per-company |
| `systemSettings.js` | CRUD |
| `inquiries.js` | CRUD + reply |
| `auditLogs.js` | 조회 |
| `stats.js` | dashboard, monthly, daily, partners |
| `api.js` | (deprecated, mockData) |

---

## 📜 마이그레이션 이력 (실행 순서)

| # | 파일 | 목적 |
|---|---|---|
| 1 | `drivelog_setup.sql` | 초기 17개 테이블 (v1.5) |
| 2 | `migration_inquiries.sql` + `migration_fix_inquiries.sql` | 문의사항 |
| 3 | `migration_self_register.sql` | 셀프 가입 + system_settings |
| 4 | `migration_billing_plans.sql` | 요금제 + companies.plan_id |
| 5 | `migration_plan_history.sql` | 요금제 이력 + 시즌별 특별가 |
| 6 | `migration_plan_visibility.sql` | billing_plans.is_visible |
| 7 | `migration_payment_info.sql` | 입금 계좌 system_settings |
| 8 | `migration_partner_code.sql` | partner_code 자동 생성 |
| 9 | `migration_payment_types.sql` | payment_types 테이블 |
| 10 | `migration_settlement_v2.sql` | company_pay_settings + rider_pay_rates + rider_attendance |
| 11 | `migration_settlement_groups.sql` | settlement_groups 테이블 |
| 12 | `migration_calls.sql` | calls 테이블 + rides.call_id |
| 13 | `migration_calls_charset.sql` | utf8mb3 → utf8mb4 |
| 14 | `migration_calls_collation.sql` | general_ci → unicode_ci |
| 15 | `migration_companies_lat_lng.sql` | companies.lat, lng |
| 16 | `migration_permissions.sql` | role_permissions 테이블 |
| 17 | `migration_rides_payment_type.sql` | rides.payment_type_id FK |
| 18 | `migration_calls_payment_type.sql` | calls.payment_type_id FK |
| 19 | `migration_payment_method_soft_deprecated.sql` | payment_method 보존용 rename |
| 20 | `migration_2026_04_08_mileage_system.sql` | customers.mileage_balance NULL → 0 |

---

## 🚧 진행 중 작업

### 마일리지 시스템 2단계 (프론트)
- [ ] **`Mileage.jsx` 재작성** (현재 mockData 사용 — 깨진 상태)
  - 회사 통계 카드 (총 잔액, 보유 고객, 누적 적립/사용)
  - 잔액 보유 고객 목록 (검색, 정렬)
  - 고객 클릭 → 잔액 + 거래 이력 모달
  - 수동 적립/차감 버튼
  - 거래 이력 탭 (월별 필터)
- [ ] **`Rides.jsx` 운행 작성 모달**에 마일리지 사용 input
  - 고객 선택 시 잔액 표시
  - 5,000원 단위 셀렉트 (0, 5000, 10000, ..., 잔액 한도)
  - 차감 미리보기 (실 결제액 = 운임 - 마일리지)
  - 적립 미리보기 ((운임 - 마일리지) × 10%)
- [ ] **`CallManage.jsx` 콜 생성 모달**에도 동일 (선택)
- [ ] **모바일 운행 작성** (RideNew.jsx)에도 동일

### 백엔드 보완
- [ ] **rides POST 적립/사용 순서 변경**: 현재 적립 → 사용. 자연스러운 건 사용 → 적립 (이력 보기 좋음)
- [ ] **rides PUT (운행 수정) 시 마일리지 변경 처리**: delta 계산 + 보정 거래
- [ ] **rides DELETE 시 마일리지 환불**: 해당 운행의 EARN/USE 모두 보정

---

## 🎯 미착수 / 향후 작업

### 우선순위 1 — 운영 개선
- [ ] **미배정 운행 76건 정리 도구** (3월 운영 데이터)
- [ ] **검증용 운행 #1261 처리** (어제 만든 검증 데이터)
- [ ] **검증용 attendance id=1 삭제**

### 우선순위 2 — 알림 시스템
- [ ] **PWA Push 알림** — 새 콜 알림
- [ ] **카카오톡 알림톡 연동** — 정산 알림, 만료 알림
- [ ] 이메일 알림 (선택)

### 우선순위 3 — 통계/리포트 강화
- [ ] **월별 트렌드 차트** (매출, 운행수, 마일리지)
- [ ] **기사별 실적 비교** (랭킹, 평균)
- [ ] **고객별 누적 매출** (충성도)
- [ ] **시간대별 운행 분석** (피크 시간)

### 우선순위 4 — RIDER 모바일 강화
- [ ] **본인 근무시간 확인 페이지** (rider_attendance)
- [ ] **본인 정산 내역 조회** (settlements)
- [ ] **본인 마일리지 주는 고객 랭킹** (편의)

### 우선순위 5 — 자동화
- [ ] **자동 사용료 결제** (Toss Payments 등)
- [ ] **만료 7일 전 자동 알림**
- [ ] **월말 자동 정산서 생성**

---

## 🐛 알려진 이슈 / 데이터 정합성

### 1. 운행 #1261 (검증용)
- 운임 30,000원, 마일리지 5,000원 사용 (아이리스양승창)
- customer_mileage에 EARN 3,000원 (옛 적립 로직) + USE 5,000원 두 거래
- 새 적립 로직은 EARN 2,500원이 정확
- **다음 세션에서 처리 결정 필요**

### 2. attendance id=1 (검증용)
- 고현순 2026-04-08 9.5h
- 양양대리 운영 데이터에 들어감
- DELETE /api/pay-settings/attendance/1로 정리 가능

### 3. 콜 #20 (검증용)
- 메모 [자동검증] → cleanup 스케줄러가 14일 후 자동 정리

### 4. customer_mileage 거래 이력 부족
- 양양대리 잔액 합계는 1,509,000원 (231명)
- 하지만 customer_mileage 거래 이력은 단 2건
- 옛 시스템이 잔액(`customers.mileage_balance`)은 직접 업데이트했지만 거래 이력은 부분적으로만 기록
- 새 거래는 정상 기록됨 (운영상 문제 없음)

### 5. 3월 운행 76건 미배정
- rider_id=NULL 또는 미배정 사용자에 연결
- 정산 정확도 영향 — 정리 도구 필요

### 6. payment_method_deprecated 컬럼
- rides + calls에 보존용으로 남아있음
- 백엔드 코드는 payment_type_id만 사용
- 향후 수개월 안정화 후 완전 drop 가능

---

## 📈 API 버전 이력

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.0 | 2026-03 | 초기 v1.5 schema, 기본 기능 |
| v2.0 | 2026-04-04 | 정산 v2 (시급제/건별제/수수료제) |
| v2.1 | 2026-04-05 | 결제구분 / 결제그룹 |
| v2.2 | 2026-04-06 | 콜 시스템 |
| v2.3 | 2026-04-06 | 통합 권한 관리 |
| v2.4 | 2026-04-07 | rides.payment_type_id FK 마이그레이션 |
| v2.5 | 2026-04-07 | calls charset 정상화, payment_method DEPRECATED |
| **v2.6** | **2026-04-08** | **운임정산 5단계 + 근무시간 + 마일리지 백엔드** |

---

## 🚀 배포 정보

### 환경
| 항목 | 값 |
|---|---|
| NAS | Synology, 192.168.0.2 |
| SSH | rnfkehdwk@rnfkehdwk.synology.me:30000 |
| Docker | drivelog-api, drivelog-db (MariaDB 10.11), drivelog-nginx |
| DB root | `Drivelog12!@` |
| App user | sykim/`Rlatpduq12!@` |
| 외부 접속 | https://rnfkehdwk.synology.me:38443/admin/ + /m/ |
| 내부 접속 | https://192.168.0.2:8443/ |

### 카카오 API
- REST: `5bfc2766bfe2836aab70ff613c8c05be`
- JavaScript: `b1e43fe40464bf365f6122749187c09a`

### 배포 자동화 (4월 7~8일 구축)
```bash
cd /c/drivelog
npm run deploy:all   # admin + mobile + server, ~30초
npm run deploy:admin # admin만
npm run deploy:mobile # mobile만
npm run deploy:server # backend만 + API/Nginx restart
```

### 표준 NAS 명령
```bash
# 백엔드 변경 후
cd /volume1/docker/drivelog
sudo docker-compose restart api

# 프론트 변경 후
sudo docker-compose restart nginx

# DB 마이그레이션
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < /volume1/docker/drivelog/server/db/migration_FILENAME.sql

# 헬스 체크
curl -k https://192.168.0.2:8443/api/health  # v2.6
sudo docker logs drivelog-api --tail 30
```

### 테스트 계정
| 역할 | 회사코드 | ID | PW |
|---|---|---|---|
| MASTER | - | admin | Admin123! |
| SUPER_ADMIN (양양대리) | 1012 | cblim | 11223344 |
| RIDER | YANGYANG01 | rider_son | Admin123! |

---

## 💡 핵심 학습 / 패턴

### 백엔드 패턴
- **트랜잭션 안전**: 마일리지 / 운행은 모두 단일 트랜잭션 (rollback 안전)
- **FOR UPDATE 잠금**: 잔액 차감 시 동시성 보호
- **resolvePaymentTypeId**: 영문/한글/code/id 모두 자동 매핑
- **두 모드 INSERT** (attendance): 시각 입력과 시간 직접 입력 동시 지원
- **NOT NULL 우회**: clock_in dummy 값으로 채워서 직접 입력 모드 지원

### 프론트 패턴
- **React SPA 라우팅**: `window.history.pushState` + `PopStateEvent` dispatch
- **로그인 토큰**: localStorage에 직접 inject 후 reload (테스트용)
- **Vite 빌드 hash 변경**: Ctrl+Shift+R 강제 리로드
- **빌드 산출물 검증**: 한국어 문자열로 검색 (minified 함수명 무시)
- **인쇄 CSS**: `.print-area` + `.no-print` + `.print-only` 클래스 조합

### DB 마이그레이션 패턴
- **멱등성**: 컬럼/인덱스/FK 존재 체크 후 SKIP
- **순서**: DB 먼저 → 백엔드 코드 (Unknown column 에러 방지)
- **CONVERT() 우회**: charset 충돌 시 임시 대응 후 정식 charset 변환
- **데이터 보존**: 컬럼 DROP 대신 RENAME (deprecated 패턴)

### 검증 패턴
- **end-to-end**: 백엔드 endpoint → 프론트 화면 → DOM 텍스트 검증
- **예외 케이스 우선**: 성공보다 실패 케이스 먼저 검증 (5000원 단위, 잔액 부족 등)
- **자동검증 표시**: 메모에 [자동검증] 추가 → 14일 후 cleanup 스케줄러가 정리

---

## 📊 통계

### 코드베이스 규모 (대략)
- 백엔드 라우트: 22개 파일
- 관리자 페이지: 22개
- 모바일 페이지: 10개
- DB 테이블: 30개
- DB 마이그레이션: 20개
- API 엔드포인트: 100+

### 양양대리 운영 데이터
- 활성 고객: 239명
- 활성 기사: 21명+
- 마일리지 보유: 232명 (1,509,000원)
- 결제구분: 6개 (현금/기사계좌/회사계좌/나라시/미수/카드)
- 결제그룹: 2개 (기사 보유 / 회사 보유)
- 3월 운행: 97건 / 1,865,000원

---

**마지막 업데이트**: 2026-04-08
**API 버전**: v2.6
**다음 마일스톤**: 마일리지 프론트 페이지 (Mileage.jsx 재구성 + 운행 작성 모달 input)
