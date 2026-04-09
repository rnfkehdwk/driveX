# DriveLog 작업 환경 가이드 (Claude 세션용)

> **이 문서의 목적**: 새 Claude 세션이 헤매지 않고 바로 작업에 들어갈 수 있도록 프로젝트 구조, 동작 원리, MCP 도구 사용법을 정리. 매 세션 시작 시 이 문서를 먼저 읽으면 시간/토큰 절약.

---

## 🔑 가장 중요한 사실 (먼저 알아야 할 것)

### 1. MCP 파일시스템이 연결되어 있다 — `C:\Drivelog`에 직접 읽고 쓸 수 있다

`filesystem` MCP가 `C:\Drivelog`에 read/write 권한으로 연결되어 있습니다. **사용자에게 파일 내용을 복붙해 달라고 요청하지 말 것.** 직접 읽고 직접 수정하면 됨.

사용 가능한 도구:
- `filesystem:read_text_file` — 파일 읽기 (head/tail 옵션으로 일부만도 가능)
- `filesystem:write_file` — 파일 통째로 쓰기 (덮어쓰기, 신규 둘 다)
- `filesystem:edit_file` — 부분 패치 (oldText → newText, 작은 변경에 안전)
- `filesystem:list_directory` — 디렉토리 목록
- `filesystem:read_multiple_files` — 여러 파일 한 번에
- `filesystem:create_directory`, `filesystem:move_file` — 디렉토리/이동

**툴이 안 보이면**: `tool_search` 같은 deferred tool 로더로 `filesystem write edit` 같은 키워드로 검색해서 로드.

### 2. NAS 컨테이너 환경 ≠ 로컬 소스

| 환경 | 위치 | 용도 |
|---|---|---|
| **로컬 (Windows)** | `C:\Drivelog\` | **소스 코드** — Claude가 수정하는 곳 |
| **NAS (Synology Docker)** | `/volume1/docker/drivelog/` | **빌드 산출물 + 백엔드 런타임** — 수정하지 말 것 |

**bash_tool은 컨테이너 내부 리눅스 환경**이라 `C:\Drivelog`에 접근 못 한다. Windows 파일 작업은 무조건 `filesystem:` MCP 사용. NAS 작업은 사용자가 SSH로 직접 한다 (배포는 사용자 담당).

### 3. 작업 분담

- **Claude**: 로컬 소스 코드 (`C:\Drivelog\`) 수정만
- **사용자**: NAS 배포 (`npm run deploy:all` 등), DB 직접 SQL 실행, 검증

---

## 📁 프로젝트 구조 (실제 경로)

```
C:\Drivelog\
├── drivelog-admin\               ← admin web (React + Vite, 사장님/관리자용)
│   ├── client\
│   │   ├── src\
│   │   │   ├── api\client.js     ← admin API 클라이언트 (모든 함수 export)
│   │   │   ├── pages\            ← 모든 화면
│   │   │   ├── components\       ← 공유 컴포넌트
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   └── server\                   ← 백엔드 (Node.js + Express + MariaDB)
│       ├── routes\               ← API 라우트 (auth.js, rides.js, mileage.js, ...)
│       ├── middleware\           ← auth, audit, license 등
│       ├── config\database.js    ← MariaDB 풀
│       ├── db\                   ← SQL 마이그레이션
│       └── index.js              ← Express 엔트리, 라우트 등록 + 버전
│
├── drivelog-mobile\              ← 기사용 PWA (React + Vite, NOT React Native)
│   ├── src\
│   │   ├── api\client.js         ← 모바일 API 클라이언트 (별도, admin과 다름)
│   │   ├── pages\                ← RideNew.jsx, CallList.jsx, ...
│   │   ├── components\
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json              ← deploy 스크립트 포함
│
├── drivelog-android\             ← (사용 빈도 낮음)
├── DriveX\                       ← 옛 버전
├── nginx\
├── backup\                       ← 백업 파일 보관 (Claude가 수정 전 원본을 여기 저장)
├── package.json                  ← 루트, deploy:all/deploy:admin/deploy:mobile/deploy:server 스크립트
├── deployAutomation.md
├── infoData.md
├── 1_Drivelog_ERD.md
├── 2_Drivelog_기획서.md
├── 3_Drivelog_개발현황.md
├── CLAUDE_SESSION_GUIDE.md       ← 이 문서
└── session_YYYY_MM_DD_summary.md ← 세션별 요약
```

### admin과 mobile은 완전 별개 프로젝트

- **admin client**: `drivelog-admin/client/src/api/client.js` (Tailwind 클래스 + 인라인 스타일 혼용)
- **mobile**: `drivelog-mobile/src/api/client.js` (전부 인라인 스타일, emoji 헤비)
- 두 client.js는 **export 함수 목록이 다름**. admin에 있는 함수가 mobile에 없을 수 있다. 모바일 작업할 때는 별도로 추가해야 한다.

### 모바일은 React Native가 아니다 — React Web PWA

`drivelog-mobile/package.json`을 보면 `vite`, `react-dom`, `axios`만 있다. **React Native가 아님.** `<select>`, `<input>`, 일반 HTML 요소 다 쓸 수 있고, 인라인 스타일로 모바일 톤만 맞춘 PWA.

→ admin용 컴포넌트를 거의 그대로 모바일에 재사용 가능. 단, Tailwind 클래스는 모바일에 없으므로 인라인 스타일로 변환.

---

## 🏗 백엔드 구조

### API 라우트 위치

`drivelog-admin/server/routes/` 하나에 admin과 mobile 두 클라이언트가 모두 호출. **백엔드는 단일 서버**.

주요 라우트:
- `auth.js` — 로그인/리프레시
- `rides.js` — 운행
- `calls.js` — 콜
- `customers.js` — 고객
- `mileage.js` — 마일리지 (5개 엔드포인트)
- `paySettings.js` — 시급/근무시간
- `settlements.js` — 운임 정산
- `users.js` — 사용자/기사
- `partners.js` — 제휴업체
- `paymentTypes.js` — 결제구분

### DB 키 컨벤션 — 매우 중요

| 테이블 | PK 컬럼명 |
|---|---|
| `customers` | `customer_id` (NOT `id`) |
| `rides` | `ride_id` (NOT `id`) |
| `users` | `user_id` |
| `calls` | `call_id` |
| `customer_mileage` | `id` (이건 그냥 id) |
| `partners` | `partner_id` |
| `companies` | `company_id` |

**SQL 짤 때나 응답 구조 가정할 때 `c.id` 같은 거 쓰지 말고 항상 `c.customer_id` 사용.** 이번 세션에서 검증 스크립트가 `c.get('id')`를 써서 None이 나오는 사고가 있었다.

응답 JSON에서도 동일:
```json
{"customer_id": 271, "name": "박준희", "mileage_balance": 12000}
```
`id`가 아니라 `customer_id`다.

### 권한 (role)

```js
authorize('SUPER_ADMIN', 'MASTER', 'RIDER')
```

- `SUPER_ADMIN`: 회사 사장님
- `MASTER`: Anthropic 본사 admin (다회사 관리)
- `RIDER`: 기사 (모바일 앱 사용자)

**모바일 앱이 호출하는 엔드포인트는 반드시 `RIDER`를 authorize에 포함해야 한다.** 이번 세션에서 마일리지 API가 `RIDER`를 빼먹어서 기사 앱에서 잔액 조회가 403으로 실패했다.

### 인증 토큰 필드명

로그인 API:
```js
POST /api/auth/login
{ "company_code": "1012", "login_id": "cblim", "password": "11223344" }
```

`username`이 아니라 `login_id`다. 이것도 한번 헤맨 적 있음.

---

## 🔌 API 응답 형태 — 자주 헷갈림

라우트마다 응답 구조가 통일되지 않음. 코드 짤 때 직접 라우트 파일 읽고 확인해야 함.

### 일반 패턴

**목록 응답**: `{ data: [...] }`
```js
res.json({ data: rows });
```

**단일 객체 응답**: 두 가지 패턴 혼재
```js
// 패턴 A: 객체 직접
res.json({ customer: custRows[0], transactions: txRows });

// 패턴 B: data 래핑
res.json({ data: { ... } });
```

**작성 응답**: 보통 ID 직접
```js
res.json({ ride_id: 1234, message: '저장됨' });
```

### 방어적 파싱 헬퍼 (재사용 권장)

```js
const pickArray = (res) => {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  return res.items || res.data || res.customers || res.transactions || res.list || [];
};

const pickBalance = (res) => {
  if (!res) return 0;
  if (typeof res.balance === 'number') return res.balance;
  if (typeof res.mileage_balance === 'number') return res.mileage_balance;
  if (res.customer && typeof res.customer.mileage_balance === 'number') return res.customer.mileage_balance;
  if (res.data) {
    if (typeof res.data.mileage_balance === 'number') return res.data.mileage_balance;
    if (res.data.customer && typeof res.data.customer.mileage_balance === 'number') return res.data.customer.mileage_balance;
  }
  return 0;
};
```

---

## 🚀 배포

사용자가 직접 한다. Claude는 안내만.

```bash
cd /c/drivelog

# 전체
npm run deploy:all

# 개별
npm run deploy:admin    # admin web
npm run deploy:mobile   # 모바일 PWA
npm run deploy:server   # 백엔드 + API/Nginx restart
```

**백엔드 변경 시 반드시 `deploy:server`** (단순 admin/mobile 배포로는 백엔드가 리스타트 안 됨).

### 배포 후 검증

```bash
# API 버전 확인
curl -k https://192.168.0.2:8443/api/health

# 컨테이너 로그
sudo docker logs drivelog-api --tail 50
```

---

## 🗄 NAS 환경 정보 (사용자 작업용 참고)

```
NAS:        Synology, 192.168.0.2
SSH:        rnfkehdwk@rnfkehdwk.synology.me:30000
Docker:     drivelog-api, drivelog-db (MariaDB 10.11), drivelog-nginx
DB root:    Drivelog12!@
DB app user: sykim / Rlatpduq12!@
외부:       https://rnfkehdwk.synology.me:38443/admin/  +  /m/
내부:       https://192.168.0.2:8443/
```

### 테스트 계정

| 역할 | 회사코드 | ID | PW |
|---|---|---|---|
| MASTER | - | admin | Admin123! |
| SUPER_ADMIN | 1012 | cblim | 11223344 |
| RIDER | YANGYANG01 | rider_son | Admin123! |

### NAS DB 작업 표준 명령

```bash
# 마이그레이션 실행
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < /volume1/docker/drivelog/server/db/migration_FILENAME.sql

# 인라인 SQL
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT * FROM customers WHERE customer_id = 271;
SQL

# 백엔드 재시작
cd /volume1/docker/drivelog
sudo docker-compose restart api

# 락 걸렸을 때 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db -e "SHOW PROCESSLIST"
```

### 자주 만나는 에러

- **`ER_LOCK_WAIT_TIMEOUT`**: 트랜잭션 락 풀림 → `docker-compose restart api`로 즉시 해결
- **`로그인 시도가 너무 많습니다`**: rate limiter (15분) → `docker-compose restart api`로 메모리 리셋 가능
- **`출발 시간은 필수입니다`**: rides POST는 `started_at` 필수 (`yyyy-MM-dd HH:mm:ss` 형식)
- **`Unknown column`**: 마이그레이션 안 돌림 → DB부터 먼저 마이그레이션
- **`인증 토큰이 필요합니다`**: 변수 비어있음 → 로그인 응답 확인부터

---

## 🛠 작업 워크플로우

### 1. 기존 파일 수정 작업 — 표준 절차

```
1. filesystem:read_text_file 로 파일 내용 파악
2. backup 폴더에 원본 저장 (filesystem:write_file로 backup/{파일명}_{날짜}.{확장자})
3. filesystem:edit_file 로 부분 패치 (작은 변경)
   또는 filesystem:write_file 로 통째 교체 (큰 변경)
4. 변경 결과 요약 + 사용자에게 배포 명령 안내
```

### 2. edit_file vs write_file 선택 기준

- **edit_file**: 명확히 구분되는 작은 변경 (한 줄 수정, 함수 하나 추가). diff로 명확하게 보임. 매칭 텍스트 unique해야 함.
- **write_file**: 파일 절반 이상 변경, 새 파일, 구조 재편. edit_file로 했다가 매칭 실패하면 write_file로 폴백.

### 3. backup 컨벤션

```
C:\Drivelog\backup\{원본파일명}_{YYYYMMDD_HHMM}.{확장자}
```

예: `Mileage_admin_20260409_0135.jsx`, `client_mobile_20260409_0130.js`

### 4. 작업 전 확인 체크리스트

- [ ] 사용자가 어느 영역(admin/mobile/server)을 작업하는지 명확한가?
- [ ] 해당 파일이 실제로 어디 있는지 `list_directory`로 확인했는가? (가정 X)
- [ ] 백엔드 변경이면 권한(`authorize`)에 필요한 role이 다 들어있는가?
- [ ] DB 컬럼명이 `customer_id`/`ride_id` 같은 실제 컬럼명을 쓰고 있는가? (`id` 가정 금지)
- [ ] 모바일은 React Native가 아니라 React Web이라는 걸 기억하고 있는가?
- [ ] 새 함수 추가 시 admin 또는 mobile **양쪽 client.js**에 다 필요한지 확인했는가?

---

## 🐛 이전 세션에서 헤맸던 사례 (반복 금지)

### 1. NAS와 로컬 혼동
**증상**: `cd /volume1/docker/drivelog/client/src/pages`로 admin 소스를 찾으려 함 → 없음.
**진실**: 소스는 `C:\Drivelog\drivelog-admin\client\src\pages\`. NAS에는 빌드 산출물(dist)만 있음.
**교훈**: 로컬과 NAS는 분리. 소스 작업은 무조건 `C:\Drivelog\` 기준.

### 2. mobile 경로 추측 실패
**증상**: `drivelog-mobile/` 가 아니라 `mobile/`로 가정 → 파일 없음 오류.
**교훈**: 추측 대신 `list_directory`로 확인.

### 3. MCP 도구가 있는데 안 쓰고 사용자에게 복붙 요청
**증상**: 첫 작업을 outputs 폴더에 풀버전 만들고 사용자에게 "복사해 NAS에 올려주세요"라고 함.
**진실**: filesystem MCP가 `C:\Drivelog`에 직접 쓸 수 있었다. 사용자가 지적해 줘서 알게 됨.
**교훈**: 세션 시작할 때 `filesystem:list_allowed_directories` 또는 `tool_search`로 가능한 도구 확인부터.

### 4. heredoc 안에 실행 명령까지 넣어서 무한 재귀
**증상**: `cat > script.sh <<'EOF' ... bash script.sh EOF` → script가 자기 자신을 호출하는 재귀 발생.
**교훈**: heredoc 블록과 실행 명령은 분리. 또는 처음부터 filesystem:write_file로 작성.

### 5. 권한 누락 (가장 큰 시간 낭비)
**증상**: 모바일 마일리지 API가 403으로 실패 → 칩이 disabled. 원인 파악에 시간 소요.
**진실**: `authorize('SUPER_ADMIN', 'MASTER')`만 있고 `RIDER`가 빠짐.
**교훈**: 새 라우트 만들 때 호출 주체(role)를 항상 명시. 모바일에서 호출할 거면 `RIDER` 필수.

### 6. DB 컬럼 가정 실수
**증상**: 검증 스크립트가 `c.get('id')`로 customer_id를 추출하려 함 → None.
**진실**: customers 테이블 PK는 `customer_id`. rides도 `ride_id`.
**교훈**: 응답 구조 모를 때는 먼저 한 번 raw 응답을 확인. 메모리에 PK 컨벤션 적어둘 것.

### 7. 운행 POST 필수 필드 누락
**증상**: `mileage_used` 검증하려고 만든 페이로드에 `started_at`이 없어서 400.
**교훈**: 라우트 코드 직접 읽고 필수 필드 확인 (`if (!started_at) return 400` 같은 검증 부분).

### 8. 검색 파라미터 키 불일치
**증상**: admin Mileage.jsx가 `?search=`로 보내는데 백엔드는 `?q=`만 받음 → 검색 무시.
**교훈**: 백엔드 라우트의 `req.query` destructuring 부분을 보고 클라이언트와 키를 맞출 것. 또는 백엔드가 둘 다 받게.

### 9. body 필드 키 불일치
**증상**: admin이 `description`을 보내는데 백엔드는 `memo`만 받음 → 사유 무시.
**교훈**: req.body destructuring도 확인. 백엔드가 양쪽 다 받게 하는 게 가장 안전.

### 10. 로그인 필드명 혼동
**증상**: `username` 필드로 로그인 시도 → "ID와 비밀번호를 입력하세요" 에러.
**진실**: 필드명은 `login_id`.
**교훈**: auth.js 라우트 직접 확인.

---

## 📋 도메인 지식 — 양양대리 (현재 운영 중인 유일한 실제 회사)

| 항목 | 값 |
|---|---|
| company_id | **3** |
| 회사 코드 | 1012 |
| SUPER_ADMIN | cblim (임창빈, user_id=8) |
| 정산 방식 | HOURLY (시급제 12,000원/h) |
| 1시간 미만 처리 | ROUND_DOWN |
| 마일리지 적립률 | **10%** (`fare_policies.mileage_earn_pct`, **사용분 제외**) |
| 마일리지 사용 단위 | **5,000원** |
| 활성 기사 | 21명+ |
| 활성 고객 | 239명 |
| 마일리지 보유 고객 | 232명 (총 약 1,509,000원) |
| 결제그룹 | 기사보유 (group_id=2, 주황) / 회사보유 (group_id=5, 녹색) |
| payment_types | 6=현금, 7=기사계좌, 8=회사계좌, 9=나라시, 11=미수, 12=카드 |
| 회사 좌표 | lat=38.0758, lng=128.6190 (양양읍) |

### 카카오 API 키 (양양대리)
- REST: `5bfc2766bfe2836aab70ff613c8c05be`
- JavaScript: `b1e43fe40464bf365f6122749187c09a`

### 마일리지 정책

- **적립**: `(운임 - 마일리지 사용분) × 10%` (마일리지로 결제한 부분에는 적립 안 줌, 복리 방지)
- **사용**: 5,000원 단위로만, 잔액 한도 내에서
- **회계**: 운임은 원금 그대로 기록 + `mileage_used` 별도 컬럼
- **수수료**: 원금 기준 계산
- **사장님 운영 흐름**: 콜 생성 시 마일리지 입력, 또는 운행 중 고객이 즉석 요청 시 기사가 모바일에서 입력

### 마일리지 시스템 핵심 파일

| 파일 | 역할 |
|---|---|
| `drivelog-admin/server/routes/mileage.js` | 5개 엔드포인트 (목록/통계/단일/조정/거래이력). RIDER 권한 포함됨. |
| `drivelog-admin/server/routes/rides.js` POST | 운행 작성 시 마일리지 USE + EARN 트랜잭션 처리 |
| `customer_mileage` 테이블 | 거래 이력 (type=EARN/USE, balance_after, ride_id) |
| `customers.mileage_balance` | 현재 잔액 (UPDATE 시 항상 customer_mileage에 거래 기록) |
| `fare_policies.mileage_earn_pct` | 회사별 적립률 |
| `drivelog-admin/client/src/pages/Mileage.jsx` | admin 마일리지 페이지 (3탭: 일자별/고객별/잔액관리) |
| `drivelog-admin/client/src/api/client.js` | admin API (`fetchMileageList`, `fetchMileageSummary`, `fetchCustomerMileage`, `adjustMileage`, `fetchMileageTransactions`) |
| `drivelog-mobile/src/components/MileageUseSelect.jsx` | 모바일 운행 작성 시 마일리지 입력 컴포넌트 (5,000원 단위 칩 셀렉터) |
| `drivelog-mobile/src/api/client.js` | 모바일 API (`fetchCustomerMileage`만 있음) |
| `drivelog-mobile/src/pages/RideNew.jsx` | 모바일 운행 작성 페이지, MileageUseSelect 통합 |

### rides POST 필수 필드 (몰랐다가 헤맴)

```js
const {
  pickup_rider_id, customer_id, partner_id,
  start_address, start_detail, start_lat, start_lng,
  end_address, end_detail, end_lat, end_lng,
  started_at,    // 필수, "yyyy-MM-dd HH:mm:ss"
  ended_at,      // 있으면 status='COMPLETED'
  total_fare, cash_amount,
  mileage_used,  // 5000 단위, 잔액 한도 내, 백엔드가 USE 거래 + 잔액 차감 + 원금 기준 적립
  payment_method, payment_type_id,
  rider_memo,    // memo 아님!
} = req.body;
```

`memo`가 아니라 `rider_memo`. `cash_amount`는 보통 `payment_method === 'CASH'`일 때 `total_fare`와 같게.

---

## 📝 새 세션 시작 시 권장 첫 행동

1. 이 문서 (`CLAUDE_SESSION_GUIDE.md`) 먼저 읽기
2. `infoData.md`, 최신 `session_*.md` 읽기
3. `filesystem:list_allowed_directories`로 MCP 권한 확인
4. 사용자 요청에 작업 영역 (admin/mobile/server) 확인
5. 확인 없이는 파일 경로 가정하지 말고 `list_directory`로 한 번씩 확인
6. 작업 전 항상 백업 (`backup/` 폴더에 `_YYYYMMDD_HHMM` 접미사로)

---

## ⚠️ 절대 하지 말 것

1. **사용자에게 파일 내용 복붙해 달라고 하기** — 이미 filesystem MCP 있음
2. **`/mnt/user-data/outputs/`에 파일 만들고 사용자에게 다운받으라고 하기** — 직접 `C:\Drivelog\`에 쓰면 됨
3. **bash_tool로 `C:\Drivelog\` 접근 시도** — 컨테이너 환경이라 안 됨
4. **백엔드 라우트에 `RIDER` 권한 빼먹기** — 모바일에서 호출 안 됨
5. **DB 응답 구조에서 `id` 필드 가정** — 대부분 `customer_id`/`ride_id` 같이 명시적
6. **모바일을 React Native로 가정** — 그냥 React Web PWA임
7. **운행 POST에 `started_at` 빼고 보내기** — 400 에러
8. **확인 없이 파일 경로 추측** — 어제 `mobile/` vs `drivelog-mobile/`로 헤맴

---

## 🔄 변경 이력

- 2026-04-09: 최초 작성. 마일리지 시스템 작업 세션의 학습 내용 반영.
</content>
