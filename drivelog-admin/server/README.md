# DriveLog Admin Backend v1.5

## 프로젝트 구조
```
server/
├── index.js                 # Express 서버 진입점
├── .env.example             # 환경변수 템플릿
├── config/
│   └── database.js          # MariaDB 커넥션 풀
├── middleware/
│   ├── auth.js              # JWT 인증 + 역할 검증 + 멀티테넌트
│   └── audit.js             # 감사 로그 기록
├── routes/
│   ├── auth.js              # 로그인/로그아웃/토큰갱신
│   ├── rides.js             # 운행일지 CRUD
│   ├── stats.js             # 대시보드/일자별/제휴업체/마일리지 통계
│   ├── users.js             # 사용자(기사) 관리
│   ├── customers.js         # 고객 관리
│   └── partners.js          # 제휴업체 관리
└── db/
    └── drivelog_setup.sql   # 원스톱 DDL (17 테이블)
```

## 설치 및 실행

### 1. DB 세팅
```bash
mysql -u root -p < db/drivelog_setup.sql
```

### 2. DB 사용자 생성
```sql
CREATE USER 'drivelog'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON drivelog_db.* TO 'drivelog'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에서 DB_PASSWORD, JWT_SECRET 등 수정
```

### 4. 서버 실행
```bash
npm install
node index.js
```

## API 엔드포인트 목록

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/auth/login | 로그인 (JWT 발급) |
| POST | /api/auth/refresh | Access Token 갱신 |
| GET | /api/auth/me | 내 정보 조회 |
| POST | /api/auth/logout | 로그아웃 |

### 운행일지
| Method | Endpoint | 권한 | 설명 |
|--------|----------|------|------|
| GET | /api/rides | ALL | 운행 목록 (RIDER: 본인만) |
| GET | /api/rides/:id | ALL | 운행 상세 |
| POST | /api/rides | RIDER, SA | 운행일지 생성 |
| PUT | /api/rides/:id | ALL | 운행 수정 |

### 통계
| Method | Endpoint | 권한 | 설명 |
|--------|----------|------|------|
| GET | /api/stats/daily | SA, MASTER | 일자별 통계 |
| GET | /api/stats/partners | SA, MASTER | 제휴업체 콜 통계 |
| GET | /api/stats/mileage | SA, MASTER | 고객별 마일리지 |

### 사용자
| Method | Endpoint | 권한 | 설명 |
|--------|----------|------|------|
| GET | /api/users | SA, MASTER | 사용자 목록 |
| GET | /api/users/riders | ALL | 기사 드롭다운 목록 |
| POST | /api/users | SA, MASTER | 사용자 등록 |
| PUT | /api/users/:id | SA, MASTER | 사용자 수정 |

### 고객
| Method | Endpoint | 권한 | 설명 |
|--------|----------|------|------|
| GET | /api/customers | ALL | 고객 목록 + 검색 |
| POST | /api/customers | SA, MASTER | 고객 등록 |
| PUT | /api/customers/:id | SA, MASTER | 고객 수정 |
| DELETE | /api/customers/:id | SA, MASTER | 고객 삭제 (소프트) |

### 제휴업체
| Method | Endpoint | 권한 | 설명 |
|--------|----------|------|------|
| GET | /api/partners | ALL | 제휴업체 목록 |
| POST | /api/partners | SA, MASTER | 제휴업체 등록 |
| PUT | /api/partners/:id | SA, MASTER | 제휴업체 수정 |

> SA = SUPER_ADMIN, ALL = 로그인 사용자 전체

## 테스트 계정 (시드 데이터)
| 역할 | login_id | 비밀번호 |
|------|----------|----------|
| MASTER | admin | Admin123! |
| SUPER_ADMIN | sa_yang | Admin123! |
| RIDER | rider_son | Admin123! |
| RIDER | rider_lim | Admin123! |
| RIDER | rider_lee | Admin123! |
