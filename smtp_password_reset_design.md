# DriveLog SMTP 비밀번호 재설정 시스템 — 설계 / 구현 / 동작 가이드

> **버전**: 1.0 (2026-04-10)
> **상태**: 코드 배포 완료, 동작 검증 대기 중
> **관련 마이그레이션**: `migration_2026_04_09_password_reset.sql`
> **관련 패키지**: `nodemailer ^6.9.16`

---

## 📐 1. 시스템 개요

### 1.1 목적
DriveLog 사용자가 비밀번호를 잊어버렸을 때, 본인 확인 절차를 거쳐 등록된 이메일로 임시 비밀번호를 발송받아 로그인 → 강제 변경할 수 있도록 함.

### 1.2 핵심 결정사항 (사용자 합의)
| 항목 | 결정값 | 비고 |
|---|---|---|
| 발송 인프라 | **Gmail SMTP (무료)** | 일 500통 제한, 비번찾기에 충분 |
| 발신 계정 | `drivelogTC@gmail.com` | DriveLog 시스템 전용 Gmail |
| 발신자 표시 | `DriveLog 알림` | 수신함에서 식별 가능 |
| 임시비번 길이 | **8자리** | 영문 대소문자 + 숫자 |
| 임시비번 만료 | **10분** | 로그인 + 변경 완료까지 |
| 강제 비번 변경 | **적용** | 임시비번 로그인 시 모달 닫기 차단 |
| 마스킹 ID 노출 | **마스킹 처리** | `cb***m` 형태 |
| 이메일 미등록 fallback | **inquiries 자동 등록** | MASTER 직접 발급 |

### 1.3 사용 시나리오 3가지

#### 시나리오 A: 사용자 셀프 비번찾기 (이메일 등록됨)
```
사용자가 로그인 화면 → "비밀번호 찾기" 클릭
  → ID + 이름 + 전화번호 입력
  → 매칭 + 이메일 있음
  → 8자리 임시비번 생성 → DB에 hash 저장 + 만료 시각 10분 후
  → password_must_change = TRUE
  → drivelogTC@gmail.com에서 사용자 개인 이메일로 발송
  → 사용자가 메일 받아서 임시비번으로 로그인
  → App.jsx가 password_must_change 감지 → 강제 변경 모달
  → 새 비번 입력 → password_must_change = FALSE → 정상 로그인
```

#### 시나리오 B: 사용자 셀프 비번찾기 (이메일 미등록)
```
사용자가 로그인 화면 → "비밀번호 찾기" 클릭
  → ID + 이름 + 전화번호 입력
  → 매칭 + 이메일 없음
  → inquiries에 PASSWORD_RESET 타입으로 자동 등록 (24시간 내 중복 방지)
  → 사용자에게 "관리자에게 전달됨" 메시지
  → MASTER가 문의함에서 확인 → 계정관리 → 🔑 임시비번 버튼
  → 8자리 발급 + 화면에 표시 (이메일 발송 안 됨)
  → MASTER가 카톡 등으로 직접 전달
  → 사용자가 임시비번 → 강제 변경 흐름 (시나리오 A와 동일)
```

#### 시나리오 C: MASTER/SUPER_ADMIN 직접 발급
```
MASTER가 계정관리 페이지 → 사용자 옆 🔑 임시비번 버튼
  → 확인 다이얼로그 → 발급
  → 8자리 임시비번 생성 → DB에 hash 저장
  → password_must_change = TRUE
  → 이메일 등록되어 있으면 자동 발송 시도
  → 결과 모달에 8자리 표시 + 복사 버튼 + 발송 결과
  → MASTER가 메일 발송 또는 화면 비번을 사용자에게 전달
```

---

## 🗄 2. 데이터베이스 스키마

### 2.1 마이그레이션 SQL
파일: `server/db/migration_2026_04_09_password_reset.sql`

```sql
-- users 테이블에 컬럼 2개 추가 (멱등성 체크)
ALTER TABLE users
  ADD COLUMN password_must_change BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT '임시 비번 사용 후 강제 변경 플래그';

ALTER TABLE users
  ADD COLUMN temp_password_expires_at DATETIME NULL
    COMMENT '임시 비번 만료 시각 (10분)';

-- inquiries.inquiry_type ENUM에 PASSWORD_RESET 추가
ALTER TABLE inquiries
  MODIFY COLUMN inquiry_type
    ENUM('RENEWAL','UPGRADE','DOWNGRADE','GENERAL','BUG','PASSWORD_RESET')
    NOT NULL DEFAULT 'GENERAL';
```

실제 SQL은 INFORMATION_SCHEMA로 컬럼 존재 여부 체크 후 실행하는 멱등성 패턴 사용.

### 2.2 컬럼 의미

**`users.password_must_change` (BOOLEAN, DEFAULT FALSE)**
- `TRUE`: 사용자가 임시비번으로 로그인했고 새 비번 변경 필요
- `FALSE`: 정상 상태
- 변경 시점:
  - `TRUE`로 설정: 임시비번 발급 시 (publicRoutes/users.js)
  - `FALSE`로 해제: 사용자가 비번 변경 완료 시 (auth.js change-password)

**`users.temp_password_expires_at` (DATETIME, NULL)**
- 임시비번 만료 시각 (발급 후 10분)
- NULL: 임시비번 없는 정상 상태
- 검증 시점: 로그인 시 (auth.js login) — 만료된 경우 401 반환
- 해제: 비번 변경 완료 시 NULL로 설정

**`inquiries.inquiry_type` ENUM 추가값 `'PASSWORD_RESET'`**
- 이메일 미등록 사용자가 비번찾기 시 자동 등록되는 문의 타입
- MASTER가 처리할 수 있도록 inquiries 테이블에 표시

---

## 🔧 3. 환경변수 (Gmail SMTP)

### 3.1 필요한 환경변수 5개

| 변수명 | 값 | 설명 |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP 호스트 |
| `SMTP_PORT` | `587` | STARTTLS 포트 |
| `SMTP_USER` | `drivelogTC@gmail.com` | 발신 계정 |
| `SMTP_PASS` | `<16자리 앱 비밀번호>` | Gmail 앱 비밀번호 (계정 비번 아님) |
| `SMTP_FROM_NAME` | `DriveLog 알림` | 메일함 발신자 표시명 |

### 3.2 Gmail 앱 비밀번호 발급 절차

1. **2단계 인증 활성화**:
   - https://myaccount.google.com/security
   - "2단계 인증" 켜기 (필수 — 안 켜면 앱 비밀번호 메뉴 안 나옴)

2. **앱 비밀번호 생성**:
   - https://myaccount.google.com/apppasswords
   - 앱 이름 입력란에 "drivelog" 입력 → 생성
   - **16자리 비밀번호 메모** (예: `abcd efgh ijkl mnop`)
   - 화면 닫으면 다시 볼 수 없음

3. **NAS .env에 입력** (공백 없이):
   ```env
   SMTP_PASS=abcdefghijklmnop
   ```

⚠️ 앱 비밀번호는 **16자리 연속**으로 입력. Gmail이 4자씩 띄어 표시하지만 실제 값은 공백 없음.

### 3.3 NAS 설정 위치 2곳

**3.3.1 `/volume1/docker/drivelog/.env`**:
```env
# === SMTP (Gmail) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=drivelogTC@gmail.com
SMTP_PASS=여기에_16자리_앱비밀번호_공백없이
SMTP_FROM_NAME=DriveLog 알림
```

**3.3.2 `/volume1/docker/drivelog/docker-compose.yml`** (api 서비스의 environment 블록):
```yaml
    environment:
      ...
      RATE_LIMIT_MAX: 200
      # SMTP (Gmail) - 2026-04-09 추가
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM_NAME: ${SMTP_FROM_NAME}
```

⚠️ docker-compose는 `.env` 파일을 yml의 `${VAR}` 치환에만 사용. 컨테이너 안에 환경변수로 주입하려면 yml의 `environment:` 블록에 명시해야 함.

### 3.4 환경변수 검증 명령

```bash
# 컨테이너 안에 SMTP 환경변수가 들어갔는지 확인
sudo docker exec drivelog-api env | grep SMTP

# 5개 모두 보이면 정상:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=drivelogTC@gmail.com
# SMTP_PASS=********
# SMTP_FROM_NAME=DriveLog 알림
```

### 3.5 환경변수 변경 시 절차

`.env`나 `docker-compose.yml`의 environment를 변경하면 **반드시 down/up**:

```bash
cd /volume1/docker/drivelog
sudo docker-compose down
sudo docker-compose up -d
```

`docker-compose restart`로는 environment가 새로 안 들어감 (중요!)

---

## 📦 4. 코드 구조

### 4.1 백엔드 파일 구조

```
drivelog-admin/server/
├── utils/
│   └── mailer.js                    ← Gmail SMTP 헬퍼 (신규)
├── routes/
│   ├── publicRoutes.js              ← find-id, request-password-reset
│   ├── users.js                     ← issue-temp-password
│   └── auth.js                      ← password_must_change 처리
├── db/
│   └── migration_2026_04_09_password_reset.sql
├── package.json                     ← nodemailer 의존성
├── index.js                         ← rate limit 추가
└── ...
```

### 4.2 mailer.js 주요 함수

#### `sendMail(to, subject, html, text)`
일반 이메일 발송 함수. SMTP 미설정 시 `{ok: false, error: 'SMTP_NOT_CONFIGURED'}` 반환.

#### `sendTempPasswordMail(to, userName, loginId, tempPassword, expiresMinutes)`
임시비번 메일 발송 (HTML 템플릿 포함).
- DriveLog 브랜드 컬러
- 큼직한 임시비번 표시
- 10분 만료 안내
- 텍스트 fallback

#### `generateTempPassword()`
8자리 임시비번 생성:
- 영문 대소문자 + 숫자
- **헷갈리는 문자 제외**: `0`, `O`, `1`, `l`, `I`
- crypto.randomBytes 사용 (보안)
- 사용 가능 문자: `abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789`

#### `getTransporter()`
nodemailer transporter 싱글톤. 첫 호출 시 verify로 SMTP 연결 검증.
- nodemailer 패키지 미설치 시 graceful degradation (서버 안 죽음)
- 환경변수 미설정 시 `null` 반환

### 4.3 백엔드 라우트 명세

#### `POST /api/public/find-id` (공개)
**입력**:
```json
{ "name": "임창빈", "phone": "010-1234-5678" }
```

**동작**:
1. 이름 + 전화번호(하이픈 제거 후 비교) 매칭
2. status='ACTIVE'인 사용자만 검색
3. 매칭되면 마스킹 ID + 업체명 반환

**응답 (찾음)**:
```json
{
  "found": true,
  "count": 1,
  "accounts": [
    {
      "masked_login_id": "cb***m",
      "company_name": "양양대리운전",
      "company_code": "1012",
      "created_at": "2026-03-15"
    }
  ]
}
```

**응답 (못 찾음)**:
```json
{ "found": false, "message": "일치하는 계정을 찾을 수 없습니다." }
```

**Rate Limit**: 시간당 5회/IP

#### `POST /api/public/request-password-reset` (공개)
**입력**:
```json
{ "login_id": "cblim", "name": "임창빈", "phone": "010-1234-5678" }
```

**동작**:
1. login_id + name + phone 매칭 (status='ACTIVE')
2. 매칭 + 이메일 있음 → 8자리 생성, hash 저장, 메일 발송 (method='EMAIL')
3. 매칭 + 이메일 없음 → inquiries에 PASSWORD_RESET 등록 (method='INQUIRY', 24시간 중복 방지)
4. 매칭 실패 → 일관된 응답 (method='NONE', 정보 유출 방지)

**응답 (이메일 발송)**:
```json
{
  "ok": true,
  "method": "EMAIL",
  "masked_email": "dr***C@gmail.com",
  "message": "등록된 이메일 dr***C@gmail.com로 임시 비밀번호가 발송되었습니다..."
}
```

**응답 (inquiries 등록)**:
```json
{
  "ok": true,
  "method": "INQUIRY",
  "message": "등록된 이메일이 없어 관리자에게 요청이 전달되었습니다..."
}
```

**응답 (매칭 실패, 위와 동일한 형식)**:
```json
{
  "ok": true,
  "method": "NONE",
  "message": "입력하신 정보가 등록되어 있다면 임시 비밀번호가 발송되었습니다..."
}
```

**Rate Limit**: 시간당 5회/IP

#### `POST /api/users/:id/issue-temp-password` (인증 필요)
**권한**: MASTER, SUPER_ADMIN (단 SUPER_ADMIN은 자기 업체 소속만)

**동작**:
1. 8자리 임시비번 생성
2. DB에 hash 저장 + password_must_change=TRUE + 만료 10분
3. login_fail_count, locked_until 초기화
4. password_history INSERT
5. 이메일 등록되어 있으면 발송 시도
6. audit_logs에 'TEMP_PASSWORD_ISSUE' 기록

**응답**:
```json
{
  "message": "임창빈(cblim)의 임시 비밀번호가 발급되었습니다.",
  "temp_password": "aB3xY7mK",
  "expires_in_minutes": 10,
  "has_email": true,
  "email_sent": true,
  "email_error": null,
  "target_name": "임창빈",
  "target_login_id": "cblim"
}
```

⚠️ 화면에 임시비번이 평문으로 노출되는 유일한 응답. MASTER가 화면에서 복사해 사용자에게 전달 가능.

### 4.4 auth.js 변경사항

**로그인 응답 (responseUser)에 추가**:
```js
password_must_change: !!user.password_must_change,
temp_password_expires_at: user.temp_password_expires_at || null,
```

**로그인 만료 검증 추가**:
```js
// 비번 검증 통과 후
if (user.password_must_change && user.temp_password_expires_at && new Date(user.temp_password_expires_at) < new Date()) {
  return res.status(401).json({ error: '임시 비밀번호가 만료되었습니다. 다시 비밀번호 찾기를 요청해주세요.' });
}
```

**change-password 시 플래그 해제**:
```js
await pool.execute(
  'UPDATE users SET password_hash = ?, password_must_change = FALSE, temp_password_expires_at = NULL WHERE user_id = ?',
  [hash, req.user.user_id]
);
```

### 4.5 프론트엔드 컴포넌트

#### `Login.jsx` — 모달 2개 추가
- `FindIdModal`: 이름+전화 → 마스킹 ID 표시
- `FindPasswordModal`: ID+이름+전화 → 임시비번 발송
- 메인 폼: 업체코드 칸에 "(선택)" 라벨 + "평소엔 비워두셔도 됩니다" 플레이스홀더
- 폼 하단: "아이디 찾기 | 비밀번호 찾기" 링크

#### `App.jsx` — 강제 비번 변경
```jsx
useEffect(() => {
  if (user) {
    // ...기존 라이센스 체크 등
    if (user.password_must_change) {
      setForcePwChange(true);
      setShowPwModal(true);
    }
  }
}, []);
```

`PasswordModal`에 `forced` prop 추가:
- `forced=true`: 배경 클릭 차단, 취소 버튼 숨김, 빨간색 안내 박스 추가
- `forced=false`: 평상시 사용 (사이드바 → 비밀번호 변경)

#### `Users.jsx` — 임시비번 발급 UI
- 사용자 목록 행에 `🔑 임시비번` 노란색 버튼
- 클릭 → 확인 다이얼로그 → API 호출 → 결과 모달
- 결과 모달:
  - 8자리 임시비번 큼직 표시 + 복사 버튼
  - 이메일 발송 결과 안내 (성공/실패/미등록)
  - 10분 만료 + 강제 변경 안내

#### `Register.jsx` — 이메일 필수화
- `email` 필드 라벨에 `*` 추가
- 안내 문구: "비밀번호 찾기 시 임시비번을 받을 주소입니다"
- 형식 검증: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

## 🔒 5. 보안 설계

### 5.1 다층 방어
| 계층 | 방어 |
|---|---|
| 입력 검증 | login_id, name, phone 모두 필수 |
| 정보 유출 방지 | 매칭 실패해도 일관된 응답 (계정 존재 여부 노출 안 함) |
| Brute force 방지 | 시간당 5회/IP rate limit |
| 임시비번 만료 | 10분 |
| 단방향 해시 | bcrypt 12 rounds (DB에 평문 저장 안 함) |
| 강제 변경 | 로그인 후 메인 진입 차단 |
| 동시성 안전 | 같은 사용자 24시간 내 inquiries 중복 생성 방지 |
| 감사 로그 | TEMP_PASSWORD_ISSUE 액션 audit_logs 기록 |
| 권한 분리 | SUPER_ADMIN은 자기 업체 소속만 |

### 5.2 임시비번 생성 알고리즘
```js
const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const bytes = crypto.randomBytes(8);
let pw = '';
for (let i = 0; i < 8; i++) pw += chars[bytes[i] % chars.length];
```

- crypto.randomBytes (CSPRNG, 보안 난수)
- 54개 문자에서 8자리 → 약 54^8 = 7.2 × 10^13 조합
- 시간당 5회 시도 제한 → 사실상 brute force 불가능

### 5.3 DB 트랜잭션 + 메일 발송 분리
```js
// 1. DB 트랜잭션 (반드시 commit)
await conn.beginTransaction();
await conn.execute('UPDATE users SET ...');
await conn.execute('INSERT INTO password_history ...');
await conn.commit();

// 2. 메일 발송 (실패해도 DB는 commit 상태)
const mailResult = await sendTempPasswordMail(...);
if (!mailResult.ok) {
  console.error('메일 발송 실패');
  // 사용자에게는 일관된 응답 (보안 + UX)
}
```

이유: 메일 발송 실패 시에도 DB는 commit 상태 → 사용자가 다시 비번찾기 요청 가능. 메일 발송이 트랜잭션에 묶여있으면 메일 실패 시 DB도 롤백되어 매번 처음부터 다시 해야 함.

### 5.4 마스킹 함수
```js
// 4글자 이하: 첫 글자 + ***
// 5글자 이상: 앞 2글자 + *** + 뒤 1글자
function maskLoginId(id) {
  if (id.length <= 4) return id[0] + '***';
  return id.slice(0, 2) + '***' + id.slice(-1);
}

// 예시:
// 'cblim' → 'cb***m'
// 'admin' → 'ad***n'
// 'sa_y' → 's***'

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (local.length <= 3) return local[0] + '***@' + domain;
  return local.slice(0, 2) + '***' + local.slice(-1) + '@' + domain;
}

// 예시:
// 'drivelogTC@gmail.com' → 'dr***C@gmail.com'
// 'abc@naver.com' → 'a***@naver.com'
```

---

## 📧 6. 이메일 템플릿

### 6.1 발신 정보
- **From**: `"DriveLog 알림" <drivelogTC@gmail.com>`
- **Subject**: `[DriveLog] 임시 비밀번호 안내`

### 6.2 HTML 본문 구조
- DriveLog 로고 (`Drive` + `Log` 파란색)
- 사용자 이름 인사
- 임시비번 박스 (회색 배경, 큰 글씨, 점선 테두리)
- 빨간색 ⚠️ 경고 박스 (10분 만료, 즉시 변경 안내)
- 발신 전용 안내

### 6.3 텍스트 fallback
이메일 클라이언트가 HTML 차단 시 표시.

### 6.4 발송자 vs 수신자 (자주 헷갈림)
**중요**: 발신자(From)와 수신자(To)는 완전히 다른 개념.

| 역할 | 누구 | 비유 |
|---|---|---|
| **From (발신)** | `drivelogTC@gmail.com` | CJ대한통운 본사 (항상 같음) |
| **To (수신)** | 각 사용자의 개인 이메일 | 받는 사람 집 주소 (각자 다름) |

기사들은 **각자 본인의 개인 이메일**을 등록하면 됨. `drivelogTC@gmail.com`은 **DriveLog 시스템 발송 전용** 계정이므로 사용자에게 노출할 필요 없음.

예시:
- 사장님 (cblim) → 본인 개인 메일 (예: 네이버메일)
- 손기사 (rider_son) → 본인 개인 메일
- 김기사 → 이메일 미등록 → MASTER 직접 발급 fallback

---

## 🚀 7. 배포 절차

### 7.1 처음 설정 (1회만)

#### 1단계: NAS에 SMTP 환경변수 추가
```bash
# .env 수정
sudo vi /volume1/docker/drivelog/.env
# 파일 끝에 5줄 추가:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=drivelogTC@gmail.com
# SMTP_PASS=<16자리 앱 비밀번호>
# SMTP_FROM_NAME=DriveLog 알림

# docker-compose.yml의 api 서비스에 environment 추가
# (이미 추가되어 있음, 확인만)
sudo grep SMTP /volume1/docker/drivelog/docker-compose.yml
# 5줄 ${SMTP_*} 보여야 정상
```

#### 2단계: nodemailer 패키지 설치
```bash
sudo docker exec drivelog-api npm install nodemailer
```

(또는 `package.json`에 의존성이 있으니 컨테이너 재빌드 시 자동 설치됨)

#### 3단계: DB 마이그레이션
```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < /volume1/docker/drivelog/server/db/migration_2026_04_09_password_reset.sql
```

#### 4단계: 컨테이너 재생성 (environment 적용)
```bash
cd /volume1/docker/drivelog
sudo docker-compose down
sudo docker-compose up -d
```

⚠️ **반드시 down/up** (restart 안 됨)

### 7.2 검증
```bash
# 1. 컨테이너 상태
sudo docker ps | grep drivelog-api
# Up X seconds (healthy) 보여야 정상

# 2. 환경변수
sudo docker exec drivelog-api env | grep SMTP
# 5개 줄 보여야 정상

# 3. 로그 (SMTP 연결 OK 또는 verify 결과)
sudo docker logs drivelog-api --since 1m
# [mailer] SMTP 연결 OK (drivelogTC@gmail.com) 보여야 정상
# 또는 첫 메일 발송 시점에 verify 호출

# 4. 헬스체크
curl -k https://192.168.0.2:8443/api/health
# {"version":"2.6"} 보여야 정상

# 5. 마이그레이션 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db -e "SHOW COLUMNS FROM users WHERE Field LIKE 'password_must%' OR Field LIKE 'temp_password%';"
```

### 7.3 코드 변경 후 배포
```bash
# 사장님 PC (Git Bash)
cd /c/drivelog
npm run deploy:all
```

이게 admin + mobile + server를 모두 NAS로 전송 + restart api nginx 자동 실행.

---

## 🐛 8. 트러블슈팅

### 8.1 "Cannot find module '../utils/mailer'"
**원인**: deploy:server가 utils 폴더를 안 올림
**해결**: `package.json`의 `deploy:server` 스크립트에 `drivelog-admin/server/utils` 추가 후 재배포

### 8.2 SMTP 연결 실패
```
[mailer] SMTP 연결 검증 실패: Invalid login
```
**원인**:
- 앱 비밀번호 잘못됨 또는 만료
- 2단계 인증 비활성화
- .env의 SMTP_PASS에 공백/오타

**해결**:
1. https://myaccount.google.com/apppasswords 에서 새로 발급
2. .env의 `SMTP_PASS=` 줄을 새 16자리로 교체 (공백 없이!)
3. `docker-compose down && up -d`

### 8.3 메일이 도착 안 함
**확인 순서**:
1. `sudo docker logs drivelog-api --since 5m | grep mailer` — 발송 시도 로그 확인
2. `[mailer] 발송 완료: <messageId> → <email>` 보이면 발송은 성공한 것
3. 수신자 메일함의 **스팸함** 확인 (Gmail 발신은 처음엔 스팸으로 분류될 수 있음)
4. 발송이 실패했으면 에러 메시지 확인 (Invalid login, ECONNREFUSED 등)

### 8.4 임시비번으로 로그인 안 됨
**증상**: "임시 비밀번호가 만료되었습니다"
**원인**: 발급 후 10분 초과
**해결**: 비번찾기 다시 요청 (새 임시비번 발급)

### 8.5 "강제 비번 변경 모달이 안 닫혀요"
**정상 동작입니다.** 임시비번으로 로그인 시 새 비번 변경 전엔 서비스 이용 불가. 새 비번 변경 후 자동으로 닫힘.

### 8.6 SMTP 환경변수가 컨테이너에 안 들어감
**원인**: docker-compose.yml의 environment 블록에 SMTP_* 5줄이 빠졌거나, .env에 값이 없거나, `restart`만 했음
**해결**:
1. `sudo grep SMTP /volume1/docker/drivelog/docker-compose.yml` — 5줄 있는지
2. `sudo cat /volume1/docker/drivelog/.env | grep SMTP` — 값 있는지
3. `cd /volume1/docker/drivelog && sudo docker-compose down && sudo docker-compose up -d` — restart 아님!
4. `sudo docker exec drivelog-api env | grep SMTP` — 들어갔는지 확인

---

## 📊 9. 동작 시나리오 다이어그램

### 9.1 시나리오 A: 이메일 등록된 사용자 (정상 흐름)

```
[브라우저]                [백엔드 publicRoutes]              [DB]              [Gmail SMTP]
    |                            |                            |                       |
    |--POST /find-id------------>|                            |                       |
    |   {name, phone}            |                            |                       |
    |                            |--SELECT users WHERE...----->|                       |
    |                            |<--rows---------------------|                       |
    |                            |                            |                       |
    |<-- {found, accounts: [..]} |                            |                       |
    |                            |                            |                       |
    | (사용자가 ID 확인 후       |                            |                       |
    |  비번찾기 진행)            |                            |                       |
    |                            |                            |                       |
    |--POST /request-password--->|                            |                       |
    |   {login_id, name, phone}  |                            |                       |
    |                            |--SELECT users WHERE...----->|                       |
    |                            |<--user (with email)--------|                       |
    |                            |                            |                       |
    |                            | tempPw = generate8()       |                       |
    |                            | hash = bcrypt(tempPw)      |                       |
    |                            |                            |                       |
    |                            |--BEGIN-------------------- >|                       |
    |                            |--UPDATE users SET hash,---->|                       |
    |                            |   password_must_change=T,  |                       |
    |                            |   temp_password_expires_at |                       |
    |                            |--INSERT password_history-->|                       |
    |                            |--COMMIT-------------------->|                       |
    |                            |                            |                       |
    |                            |--sendTempPasswordMail()------------------------- ->|
    |                            |<--{ok: true}-------------------------------------- |
    |                            |                            |                       |
    |<-- {method: 'EMAIL',       |                            |                       |
    |     masked_email}          |                            |                       |
    |                            |                            |                       |
    | (사용자가 이메일 확인)     |                            |                       |
    |                            |                            |                       |     ↓
    |                            |                            |              [사용자 메일함]
    |                            |                            |              임시비번 8자리 표시
    |                            |                            |
    | (임시비번으로 로그인)      |                            |
    |--POST /auth/login--------->|                            |
    |   {login_id, password}     |                            |
    |                            |--SELECT users-------------->|
    |                            |<--user (password_hash,     |
    |                            |        must_change=T)------|
    |                            |                            |
    |                            | bcrypt.compare(OK)         |
    |                            | 만료 체크: OK              |
    |                            | JWT 발급                   |
    |                            |                            |
    |<-- {accessToken, user: {   |                            |
    |     password_must_change:T,|                            |
    |     ...}}                  |                            |
    |                            |                            |
    | App.jsx가 must_change 감지 |                            |
    | → 강제 변경 모달 표시      |                            |
    | (배경 클릭/취소 차단)      |                            |
    |                            |                            |
    |--PUT /auth/change-password>|                            |
    |   {current_password,        |                            |
    |    new_password}           |                            |
    |                            |--bcrypt.compare 등--------->|
    |                            |--UPDATE users SET hash,    |
    |                            |   must_change=F,           |
    |                            |   expires_at=NULL---------->|
    |                            |                            |
    |<-- {message: 변경됨}       |                            |
    |                            |                            |
    | localStorage.clear()       |                            |
    | 재로그인 화면              |                            |
```

### 9.2 시나리오 B: 이메일 미등록 사용자 (Fallback)

```
[브라우저]                [백엔드]                            [DB]
    |                       |                                  |
    |--POST /request-pw---->|                                  |
    |                       |--SELECT users WHERE...--------- ->|
    |                       |<--user (email=NULL)-------------|
    |                       |                                  |
    |                       |--SELECT inquiries WHERE         |
    |                       |  user_id=? AND type=PW_RESET    |
    |                       |  AND status=PENDING             |
    |                       |  AND created_at > 24h ago------ >|
    |                       |<--empty (no recent)-------------|
    |                       |                                  |
    |                       |--INSERT inquiries (PASSWORD_RESET) ->|
    |                       |                                  |
    |<--{method: 'INQUIRY'} |                                  |
    |                       |                                  |
    | (사용자에게 안내)     |                                  |
    | "관리자에게 전달됨"   |                                  |
    |                       |                                  |
    |                       |                                  |
    | (MASTER 로그인 →     |                                  |
    |  계정관리 페이지)    |                                  |
    |                       |                                  |
    |--POST /users/:id/    >|                                  |
    |  issue-temp-password  |                                  |
    |                       |--UPDATE users SET hash,         |
    |                       |  must_change=T 등--------------- >|
    |                       |                                  |
    |                       | (이메일 없으므로 발송 안 함)    |
    |                       |                                  |
    |<--{temp_password,     |                                  |
    |    has_email: false}  |                                  |
    |                       |                                  |
    | 화면에 8자리 표시     |                                  |
    | MASTER가 사용자에게   |                                  |
    | 카톡 등으로 전달      |                                  |
```

---

## 📋 10. 체크리스트 (다음 세션용)

### 10.1 동작 검증 체크리스트
- [ ] 사장님 PC에서 `npm run deploy:all` 정상 완료
- [ ] NAS의 `/server/utils/mailer.js` 존재 확인
- [ ] NAS의 컨테이너 환경변수에 SMTP_* 5개 모두 존재
- [ ] DB 마이그레이션 완료 (password_must_change, temp_password_expires_at, PASSWORD_RESET ENUM)
- [ ] 컨테이너 healthy 상태 + v2.6 표시
- [ ] 양양대리 정상 로그인 + 데이터 보임
- [ ] 로그인 화면에 업체코드 "(선택)" + 아이디/비번 찾기 링크 표시
- [ ] 아이디 찾기 모달 동작 (이름+전화 → 마스킹 ID)
- [ ] 비밀번호 찾기 모달 동작 (ID+이름+전화 → 메일 발송)
- [ ] 발송된 메일 도착 확인 (스팸함 포함)
- [ ] 임시비번 8자리 형식 확인 (대소문자+숫자, 0/O/1/l/I 없음)
- [ ] 임시비번으로 로그인 → 강제 변경 모달
- [ ] 강제 변경 모달 닫기 차단 확인
- [ ] 새 비번 변경 → 정상 로그인 복구
- [ ] 계정관리에서 🔑 임시비번 버튼 발급 → 결과 모달 표시
- [ ] audit_logs에 TEMP_PASSWORD_ISSUE 기록 확인
- [ ] 신규 가입 시 이메일 필수 검증

### 10.2 보안 체크리스트
- [ ] **Gmail 앱 비밀번호 폐기/재발급** (오늘 두 번 노출됨!)
- [ ] 새 비밀번호는 채팅에 공유하지 않고 NAS에서 직접 .env 수정
- [ ] 컨테이너 재생성 후 SMTP 정상 동작 재검증

### 10.3 스팸 방지 (선택)
Gmail에서 발송한 메일이 스팸함으로 가는 경우를 줄이려면:
- [ ] SPF 레코드 (불가능 — Gmail이 자동 처리)
- [ ] 발신자 이름 명확히 (`DriveLog 알림` ✅)
- [ ] HTML + 텍스트 fallback 둘 다 제공 (✅)
- [ ] Subject가 스팸 키워드 안 포함 (✅)
- [ ] 사용자가 처음 받은 메일을 "스팸 아님"으로 표시 권장

---

## 🎯 11. 핵심 약속 사항 정리

| 항목 | 약속 |
|---|---|
| 발송 비용 | **무료** (Gmail SMTP) |
| 일 발송 한도 | 500통 (Gmail 제한) |
| 임시비번 길이 | 8자리 |
| 임시비번 만료 | 10분 |
| 마스킹 형식 | 앞 2 + *** + 뒤 1 |
| 강제 비번 변경 | 임시비번 로그인 시 |
| 이메일 미등록 | inquiries fallback (관리자 직접 발급) |
| Brute force | 시간당 5회/IP |
| 감사 로그 | TEMP_PASSWORD_ISSUE 기록 |
| 권한 분리 | SUPER_ADMIN은 자기 업체만 |

---

## 📚 12. 관련 파일 종합

### 백엔드
- `drivelog-admin/server/utils/mailer.js`
- `drivelog-admin/server/routes/publicRoutes.js`
- `drivelog-admin/server/routes/users.js`
- `drivelog-admin/server/routes/auth.js`
- `drivelog-admin/server/index.js`
- `drivelog-admin/server/package.json`
- `drivelog-admin/server/db/migration_2026_04_09_password_reset.sql`

### 프론트
- `drivelog-admin/client/src/api/client.js`
- `drivelog-admin/client/src/pages/Login.jsx`
- `drivelog-admin/client/src/pages/Register.jsx`
- `drivelog-admin/client/src/pages/Users.jsx`
- `drivelog-admin/client/src/App.jsx`

### 인프라
- `drivelog-admin/docker-compose.yml` (로컬, 백업용)
- `/volume1/docker/drivelog/docker-compose.yml` (NAS, 실 운영)
- `/volume1/docker/drivelog/.env` (NAS, 환경변수)
- `package.json` (로컬 루트, deploy 스크립트)

---

**작성**: 2026-04-10
**버전**: 1.0
**상태**: 코드 배포 완료, 동작 검증 대기 중
**다음 단계**: 브라우저 동작 검증 → Gmail 앱 비밀번호 재발급
</content>
