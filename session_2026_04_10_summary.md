# DriveLog 세션 요약 — 2026-04-10 (전일)

> **이전 세션**: `session_2026_04_09_summary.md` — 마일리지 시스템 2단계 (프론트엔드 통합)
> **이번 세션 주제**:
> - **오전**: 신규 가입 오류 디버깅 → 비밀번호 찾기/아이디 찾기 시스템 구축 → docker-compose 마운트 사고 복구 → SMTP 배포 완료
> - **오후**: 이메일 필드 추가 (계정관리/기사관리) → 브라우저 e2e 검증 → 발견된 백엔드/프론트엔드 버그 2건 수정
> **이번 세션 백업**: `backup/session_2026_04_10_summary_20260410_1100.md` (오전 작업본)

---

## 🎯 이번 세션 목표

처음엔 단순한 가입 오류 1건 디버깅으로 시작했으나, 사용자 요청으로 다음 기능들이 추가되고 검증까지 진행됨:
1. ✅ 신규 업체 가입 시 "가입 처리 중 오류가 발생했습니다" 에러 해결
2. ✅ 로그인 페이지에 아이디 찾기 / 비밀번호 찾기 추가
3. ✅ SMTP(Gmail) 기반 임시비밀번호 이메일 발송 시스템 구축
4. ✅ MASTER/SUPER_ADMIN의 임시비밀번호 직접 발급 기능
5. ✅ 임시비밀번호 사용 시 강제 비밀번호 변경 모달
6. ✅ **계정관리/기사관리에 이메일 수정 필드 추가** (오후 작업)
7. ✅ **전체 e2e 브라우저 검증 + 버그 2건 발견·수정** (오후 작업)
8. ⏸ 비밀번호 정책 강화 (추후) — 메모만 남김
9. ⏸ 개인정보 암호화 현황 검토 — 의사결정 보류

---

## ✅ 완료된 작업 (시간순)

### [오전] 1. 신규 가입 오류 디버깅 및 해결
**증상**: 셀프 가입 시 모든 항목 입력 후 "가입 처리 중 오류가 발생했습니다" alert.

**원인**: `system_settings.auto_approve_trial = 'true'` 상태에서 `publicRoutes.js`가 `companies.status = 'TRIAL'`을 INSERT 시도. 그러나 `companies.status` ENUM은 `PENDING/ACTIVE/SUSPENDED/DELETED`만 허용 → `Data truncated for column 'status'` 에러 → 500.

**해결**: `'TRIAL'` → `'ACTIVE'`. 무료체험 여부는 이미 `trial_expires_at` 컬럼으로 구분.

### [오전] 2. 개인정보 암호화 현황 정리
- ✅ 비밀번호: bcrypt 12 rounds / 리프레시 토큰: SHA-256 / 통신: HTTPS — 안전
- ⚠️ 이름, 전화, 이메일, 주소, 차량번호, 면허번호, 고객 PII: **평문 저장**
- 권고: (가) 볼륨 암호화 + DB 외부포트 차단 (ROI 최고) / (나) `users.driver_license` 컬럼만 핀포인트 AES-256
- → **의사결정 보류**

### [오전] 3. 비밀번호 찾기 / 아이디 찾기 설계 결정
- 발송 인프라: **Gmail SMTP (무료)**, 일 500통
- 임시비번 8자리, 영문 대소문자+숫자, 0/O/1/l/I 제외
- 만료 10분, 사용 후 강제 변경
- 마스킹 ID 노출 (`cb***m`)
- 업체코드 칸을 **선택 입력**으로 변경 (login_id 글로벌 UNIQUE 확인됨)
- 이메일 미등록자 fallback: inquiries에 PASSWORD_RESET 자동 등록

### [오전] 4. 코드 작업 (백엔드 + 프론트 + 인프라) — 14개 파일

**백엔드**:
1. `server/utils/mailer.js` (신규) — Gmail SMTP + 메일 템플릿 + 8자리 생성기
2. `server/db/migration_2026_04_09_password_reset.sql` (신규) — 컬럼 2개 + ENUM
3. `server/routes/publicRoutes.js` — find-id, request-password-reset 추가 + register 이메일 필수
4. `server/routes/users.js` — issue-temp-password 라우트 추가
5. `server/routes/auth.js` — password_must_change 플래그 + 만료 검증
6. `server/index.js` — rate limit 2개 추가 (시간당 5회/IP)
7. `server/package.json` — nodemailer ^6.9.16

**프론트**:
8. `client/src/api/client.js` — API 함수 3개
9. `client/src/pages/Login.jsx` — 업체코드 선택입력 + 모달 2개 (전면 재작성)
10. `client/src/pages/Register.jsx` — 이메일 필수
11. `client/src/App.jsx` — forced 모드 PasswordModal
12. `client/src/pages/Users.jsx` — 🔑 임시비번 버튼 + 결과 모달

**인프라**:
13. `drivelog-admin/docker-compose.yml` (로컬) — NAS 정상본과 동기화
14. `package.json` (루트) — deploy:server에 utils 추가, models 제거

### [오전] 5. ⚠️ docker-compose 마운트 사고 복구
**증상**: SMTP env 추가 후 컨테이너가 v1.5로 표시 + trust proxy/ENOENT 에러
**진단**: `docker inspect`의 Mounts가 비어있음 → `docker-compose.yml`의 api 서비스 블록에서 `volumes:` 3줄이 누락 → 이미지 박힌 옛 코드 실행 중
**복구**: python3로 yml에 volumes 3줄 삽입 → `stop && rm && up -d --no-deps api` → v2.6 정상 복구
**예방**: 로컬 yml을 NAS와 동기화 + 경고 주석 추가

### [오전] 6. nodemailer 배포 누락 사고
**증상**: `Cannot find module '../utils/mailer'`로 컨테이너 죽음
**원인**: `deploy:server` 스크립트의 scp 대상에 `utils` 폴더가 없음
**복구**: 루트 package.json 수정 + 재배포

### [오전] 7. DB 마이그레이션 실행 완료
- ✅ `users.password_must_change` (tinyint(1) DEFAULT 0)
- ✅ `users.temp_password_expires_at` (datetime NULL)
- ✅ `inquiries.inquiry_type` ENUM에 `'PASSWORD_RESET'` 추가

---

## ✅ 오후 작업 (검증 + 추가 패치)

### [오후] 8. Users.jsx에 이메일 수정 필드 추가

**문제**: 사장님이 검증 환경 구축 중 발견 — "계정관리/기사관리 모달에는 소속/이름/전화/차량번호/차종만 있고 **이메일 수정 UI가 없어서** 비번찾기 시스템 자체를 테스트할 수 없음".

**진단**:
- 백엔드 `users.js`는 이미 OK — GET 응답에 email 포함, POST/PUT의 `baseAllowed`에 `email` 포함
- 문제는 프론트엔드 `Users.jsx`만 — form state, openNew, openEdit, handleSave, 모달 입력 필드 배열에 email 누락
- App.jsx 라우터 확인: `/users` 경로 한 곳에 `<Users />` 컴포넌트 매핑 → **MASTER "계정관리"와 SUPER_ADMIN "기사관리"는 같은 컴포넌트** (사이드바 라벨만 다름) → 한 번의 패치로 두 화면 모두 커버

**패치 (`Users.jsx` 5곳)**:
1. `useState` form 초기값에 `email: ''` 추가
2. `openNew` 초기화에 `email: ''` 추가
3. `openEdit`에 `email: u.email || ''` 추가
4. `handleSave` 수정 분기: body에 `email: form.email || null` + 클라이언트 형식 검증 (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
5. `handleSave` 등록 분기: 형식 검증 + 빈값일 때 body에서 제외
6. 모달 입력 필드 배열에 `{ k: 'email', label: '이메일 (비밀번호 찾기용)', ph: 'example@gmail.com', type: 'email' }` 추가 (이름/연락처 다음, 차량번호 앞)

**백업**: `C:\Drivelog\backup\Users_jsx_20260410_1430.jsx` (원본 그대로)

### [오후] 9. 브라우저 e2e 검증 — 통과한 항목

| # | 검증 항목 | 결과 |
|---|---|---|
| 1 | 모달의 이메일 필드 표시 + 기존 값 자동 로드 (test 계정의 `dwlee7788@naver.com`) | ✅ |
| 2 | PUT으로 이메일 변경 → DB 반영 → GET 재확인 → 원복 (4단계 e2e) | ✅ |
| 3 | 로그인 화면 — 업체코드 (선택) 라벨 + "평소엔 비워두셔도 됩니다" placeholder | ✅ |
| 4 | "아이디 찾기 \| 비밀번호 찾기" 링크 | ✅ |
| 5 | **아이디 찾기 모달** — 이름+전화 입력 → "✅ 1개 계정을 찾았습니다" + 양양대리 cb\*\*\*m + 가입일 카드 | ✅ |
| 6 | **🔑 임시비번 발급 결과 모달** — 8자리, 복사 버튼, "이메일 자동 발송" 메시지, 만료/안내 텍스트 | ✅ |
| 7 | 임시비번 형식 (`uaK4wtnY` — 8자, 대소문자+숫자, 0/O/1/l/I 없음) | ✅ |
| 8 | **Gmail SMTP 메일 발송** — 사장님 메일함 도착 확인 완료 (사장님 보고) | ✅ |
| 9 | 임시비번으로 로그인 200 OK + JWT 발급 | ✅ |
| 10 | localStorage user에 password_must_change=true, temp_password_expires_at 주입 | ✅ |
| 11 | **강제 비밀번호 변경 모달 표시** (취소 버튼 없음, forced 모드) | ✅ |
| 12 | password_history 재사용 차단 동작 ("최근 사용한 비밀번호 재사용 불가") | ✅ |
| 13 | 새 비밀번호 변경 → 자동 로그아웃 → 로그인 페이지 redirect | ✅ |
| 14 | 새 비밀번호로 재로그인 200 OK + password_must_change 해제 | ✅ |

### [오후] 10. 🐛 발견된 버그 + 수정 — 2건

#### 🐛 버그 1: `publicRoutes.js` find-id 무조건 500 에러

**증상**: `POST /api/public/find-id` 호출 시 항상 500 — "아이디 찾기에 실패했습니다." (UI 모달은 정상 동작)

**원인**: find-id 라우트의 응답 매핑에서 `r.created_at.toISOString().slice(0, 10)` 호출. 사장님 NAS의 mariadb 드라이버 설정상 datetime이 **Date 객체가 아닌 string으로 반환**됨. string에는 `.toISOString()` 메서드가 없어 `TypeError` → catch 블록 → 500.

**다른 라우트는 왜 안 터졌나**: `register`나 `me` 등 다른 곳은 created_at을 클라이언트로 그대로 넘기거나(타입 변환 안 함), 별도 처리. find-id는 `slice(0,10)`을 적용하려 했던 게 화근.

**패치**: 안전 처리 패턴으로 변경
```js
let createdAtStr = null;
if (r.created_at) {
  if (typeof r.created_at === 'string') createdAtStr = r.created_at.slice(0, 10);
  else if (r.created_at instanceof Date) createdAtStr = r.created_at.toISOString().slice(0, 10);
}
```

**배포**: 사장님 `npm run deploy:server` 실행 → 200 OK 검증 완료, 모달에 cb\*\*\*m 카드 정상 표시

#### 🐛 버그 2: `App.jsx` useEffect deps `[]` — 임시비번 로그인 시 강제 변경 모달이 안 뜸

**증상**: 임시비번으로 로그인 성공 후 password_must_change=true가 localStorage에 정상 주입됐는데 강제 변경 모달이 화면에 안 뜸. 페이지 새로고침(`location.reload()`) 한 번 하면 즉시 뜸.

**원인**: App.jsx의 `useEffect(() => { ..., if (user.password_must_change) setShowPwModal(true); }, [])` — deps가 빈 배열이라 **첫 마운트 시점에만 동작**. 그런데 사용자가 임시비번으로 로그인하면 Login 컴포넌트가 `onLogin(setUser)` 호출 → user state만 바뀌고 App은 unmount/remount 안 됨 → useEffect 재실행 안 됨 → 모달 안 뜸.

**진단 단서**:
- localStorage user.password_must_change = `true` (boolean) — 정상
- localStorage user.temp_password_expires_at = `"2026-04-10 10:45:39"` (string) — 정상
- DOM에 강제 변경 모달 텍스트(`임시 비밀번호로 로그인`) 없음 → 모달 자체가 렌더 안 됨
- `location.reload()` 후엔 즉시 모달 표시됨 → useEffect가 마운트 시에만 동작했단 결정적 증거

**패치 (`App.jsx` 1줄)**:
```js
// useEffect(() => { ... }, []);
useEffect(() => { ... }, [user]);  // user가 변할 때마다 재평가
```

**부작용 검토**: user가 변할 때마다 health/expired/rider 체크가 재실행되는데 모두 idempotent하고 setState도 동일값이면 React가 무시 → 무해.

**영향 범위**: 사장님이 실제 사용자 흐름(임시비번 받아서 admin/모바일 로그인)에서도 동일 버그 발생할 예정이었음 → **반드시 배포 필요**.

**배포 필요**: `npm run deploy:admin` (admin client만 변경, server는 영향 없음)

### [오후] 11. test 계정 비밀번호 상태 변화

검증 과정에서 test 계정 비밀번호가 다음 순서로 변경됨:
1. 초기: `11223344`
2. (검증 1단계) `request-password-reset` API 직접 호출 → 임시비번으로 변경 + dwlee7788@naver.com에 메일 발송
3. (검증 2단계) `issue-temp-password` API로 새 임시비번 `uaK4wtnY` 발급 + 새 메일 발송 (이전 임시비번 무효화)
4. (검증 3단계) `uaK4wtnY`로 로그인 → 강제 변경 모달 → 새 비번 시도
5. **password_history 재사용 차단**으로 11223344 재설정 실패
6. **현재 비밀번호: `Test1234!`** (password_history 충돌 회피용 임시값)
7. password_must_change = FALSE, temp_password_expires_at = NULL (정상 상태)

**11223344로 복구하려면**:
```bash
# NAS에서
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db -e \
  "DELETE FROM password_history WHERE user_id = 51;"
# 그다음 admin 계정관리 → test 옆 🔑 임시비번 → 메일 받기 → 새 비번 11223344로 변경
```
또는 그냥 `Test1234!`로 두어도 무방 (검증용 계정이므로).

---

## 🚧 다음 세션에서 진행할 작업

### 1. App.jsx 패치 배포 (최우선, 5분)
```bash
cd /c/drivelog
npm run deploy:admin
```
배포 후 cblim 본인 계정 비번찾기 흐름 검증:
- 로그인 화면 → "비밀번호 찾기" → cblim/임창빈/01096981868
- `rnfkehdrn@naver.com`에서 메일 받기
- 임시비번으로 로그인 → **강제 변경 모달 즉시 표시** (이게 패치 검증 핵심)
- 새 비번 → 자동 로그아웃 → 11223344로 재로그인 (password_history 충돌 시 다른 비번)

### 2. test 계정 11223344로 복구 (선택, 사장님 의향 따라)
위 11번 항목의 SQL DELETE 후 임시비번 재발급 → 11223344로 변경

### 3. ⚠️ Gmail 앱 비밀번호 폐기/재발급 (보안, 미해결)
오전 세션에서 사장님이 채팅에 두 번 노출함. 아직 폐기/재발급 안 함. 절차:
1. https://myaccount.google.com/apppasswords → drivelog 항목 삭제 → 새로 발급
2. **NAS에서 직접** (채팅 공유 금지):
   ```bash
   sudo vi /volume1/docker/drivelog/.env  # SMTP_PASS 교체
   cd /volume1/docker/drivelog && sudo docker-compose down && sudo docker-compose up -d
   ```

### 4. 🔍 잠재 버그 — admin이 RIDER 진입 차단 안 함
검증 중 발견. RIDER가 admin URL에 직접 들어오면:
- 사이드바: SUPER_ADMIN 메뉴가 보임 (`navGroups = isMaster ? master : superAdmin` — RIDER 케이스 없음)
- 모든 라우트: RoleGuard에 막혀서 빈 화면 또는 무한 리다이렉트
- App.jsx의 `RoleGuard`에서 `roles=[MASTER, SUPER_ADMIN]`이면 RIDER는 `<Navigate to="/" />` ← 자기 자신으로 redirect (무한 루프 회피는 라우터 동작에 의존)

**패치 권장**: Login 응답에서 RIDER role 차단 (admin 로그인 자체 거부), 또는 App.jsx에서 RIDER면 즉시 강제 로그아웃 + 모바일 안내 메시지. 본 세션 작업 범위 외이므로 다음 세션 과제로.

### 5. 🔍 잠재 버그 — 다른 라우트에도 datetime 처리 같은 버그 가능성
mariadb 드라이버가 datetime을 string으로 반환하는 환경 → `created_at.toISOString()` 또는 `.getTime()` 같은 Date 메서드 호출하는 다른 라우트들에 잠재 버그 가능. 한 번 grep 권장:
```bash
cd /c/drivelog/drivelog-admin/server
grep -rn "\.toISOString\|getTime\|getFullYear" routes/
```
찾은 라우트마다 string/Date 양쪽 안전 처리 적용.

### 6. 보류된 결정 사항 (오전부터)
- **개인정보 암호화 범위**: (가) 볼륨 암호화만 / (나) driver_license만 추가 / (다) 모든 PII
- **비밀번호 정책 강화** (추후): 영문 대소문자 + 숫자 + 특수문자 8자 이상

### 7. 미완 작업 (이전 세션부터)
- **검증 데이터 정리** (운행 #1261, #1263, attendance id=1)
- **rides PUT/DELETE 시 마일리지 보정** 처리
- **콜 단계에서 마일리지 입력** (옵션)

---

## 📦 변경 파일 종합 (오전 + 오후 통합)

### 백엔드
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `server/utils/mailer.js` | 신규 (오전) | Gmail SMTP 헬퍼 |
| `server/db/migration_2026_04_09_password_reset.sql` | 신규 (오전) | 컬럼 2개 + ENUM |
| `server/routes/publicRoutes.js` | 수정 (오전) | TRIAL→ACTIVE + find-id + request-password-reset + 이메일 필수화 |
| `server/routes/publicRoutes.js` | **수정 (오후, 버그픽스)** | **find-id created_at 안전 처리** |
| `server/routes/users.js` | 수정 (오전) | issue-temp-password 라우트 |
| `server/routes/auth.js` | 수정 (오전) | password_must_change 플래그 |
| `server/index.js` | 수정 (오전) | rate limit 2개 |
| `server/package.json` | 수정 (오전) | nodemailer |

### 프론트
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `client/src/api/client.js` | 수정 (오전) | API 함수 3개 |
| `client/src/pages/Login.jsx` | 전면 재작성 (오전) | 업체코드 선택입력 + 모달 2개 |
| `client/src/pages/Register.jsx` | 수정 (오전) | 이메일 필수 |
| `client/src/App.jsx` | 수정 (오전) | forced 모드 PasswordModal |
| `client/src/App.jsx` | **수정 (오후, 버그픽스)** | **useEffect deps `[]` → `[user]`** |
| `client/src/pages/Users.jsx` | 수정 (오전) | 🔑 임시비번 버튼 + 결과 모달 |
| `client/src/pages/Users.jsx` | **수정 (오후)** | **이메일 수정 필드 추가 (5곳 패치)** |

### 인프라
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `drivelog-admin/docker-compose.yml` (로컬) | 수정 (오전) | NAS 정상본 동기화 + 경고 주석 |
| `package.json` (루트) | 수정 (오전) | deploy:server에 utils 추가 |
| `/volume1/docker/drivelog/docker-compose.yml` (NAS) | 수정 (오전) | volumes 복구 + SMTP env |
| `/volume1/docker/drivelog/.env` (NAS) | 수정 (오전) | SMTP 5개 |

### 백업 (오후 추가분)
- `backup/Users_jsx_20260410_1430.jsx` — 이메일 필드 추가 직전 원본
- `backup/session_2026_04_10_summary_20260410_1100.md` — 오전 작업본 요약 보존

(오전 백업은 별도 보존 — `backup/publicRoutes_20260409_*.js` 등)

---

## 🐛 디버깅 이슈 모음 (학습용)

### [오전] 1. companies.status ENUM 제약
ENUM 컬럼에 새 값 INSERT할 땐 ENUM 정의 먼저 확인. 에러 패턴 `Data truncated for column 'X'`.

### [오전] 2. docker-compose.yml volumes 누락
- 진단: `docker inspect <container> | grep -A 10 '"Mounts"'` 비어있으면 즉시 의심
- 검증: `docker exec stat /app/index.js` vs 호스트 파일 stat 비교
- restart: always 다음에 environment로 바로 가는 건 정상이지만 volumes가 빠지면 이미지 박힌 코드가 실행됨

### [오전] 3. deploy:server 누락 폴더
- 새 폴더 추가 시 (utils/) 루트 package.json의 deploy:server scp 대상에도 반드시 추가
- NAS에서 `ls server/` 했을 때 새 폴더 없으면 deploy 누락

### [오전] 4. 환경변수 vs .env 주입
- docker-compose에서 `.env` 파일은 yml의 `${VAR}` 치환에만 쓰임
- 컨테이너에 환경변수로 주입하려면 yml `environment:` 또는 `env_file:`에 명시
- environment 변경 후엔 `restart` 아니라 반드시 `down → up -d`

### [오전] 5. MCP filesystem 백업 전략
edit_file로 부분 수정하면 git diff로 추적 가능 → 별도 백업 적게 필요. write_file로 통째 덮어쓰기 전엔 read_text_file로 원본 확보 후 backup 폴더 복사.

### [오후] 6. mariadb 드라이버 datetime 반환 타입 가변
- mariadb/mysql 드라이버는 옵션에 따라 datetime을 Date 객체 또는 string으로 반환
- `r.created_at.toISOString()` 같은 Date 메서드 호출 전 항상 타입 체크
- 안전 패턴:
  ```js
  if (typeof v === 'string') ...
  else if (v instanceof Date) v.toISOString()
  ```

### [오후] 7. React useEffect deps `[]` 함정
- Login 후 setUser → user state만 바뀌면 App 컴포넌트는 unmount/remount 안 됨
- `useEffect(() => {}, [])`는 첫 마운트에서만 동작 → user 변화에 반응 못 함
- 로그인 후 즉시 처리할 로직(자동 모달 등)은 항상 `[user]` 또는 `[user?.특정필드]` 포함

### [오후] 8. SUPER_ADMIN의 "기사관리" = MASTER의 "계정관리" (같은 컴포넌트)
- `/users` 한 라우트에 `<Users />` 단일 매핑
- 사이드바 라벨만 navGroups에서 다르게 표시 ("기사관리" vs "계정관리")
- → 한 컴포넌트 패치로 두 화면 동시 커버됨 (확인 필수)

### [오후] 9. 검증 작업의 부작용 — 사용자 비번 변경
- `request-password-reset`/`issue-temp-password` API 직접 호출하면 진짜로 비번이 임시비번으로 바뀜 + 메일 발송됨
- password_history 정책(최근 3개 재사용 금지) 때문에 원래 비번으로 즉시 복구 불가
- 검증 시작 전 영향받을 계정의 원래 비번 복구 경로(SQL DELETE 등) 미리 계획해 둘 것

---

## 💡 핵심 학습 / 패턴

### 디버깅 패턴
- **컨테이너 진단 3종**: `docker ps` (살아있나) + `docker inspect | grep Mounts` (마운트) + `docker exec env | grep KEY` (환경변수)
- **로그 함정**: `docker logs --tail N`은 시간순 마지막 N줄. 재시작 사이클 있으면 죽음+부활이 섞임. `--since 1m` 권장.
- **500 에러는 '매칭 실패' 아님**: 200 + found:false vs 500을 구분. 500은 거의 항상 코드/SQL 예외. catch 블록의 console.error 메시지를 NAS 로그에서 확인할 것.

### 검증 패턴 (이번 세션에서 새로 정립)
- **e2e 검증 때 비파괴 → 파괴 순서로**: 먼저 GET, UI 표시, API 응답 형식 확인 → 그다음 PUT/POST 같은 상태 변경
- **검증 대상 계정의 원상태 복구 경로 미리 확보**: 비번 검증은 password_history 충돌 가능성, 데이터 변경은 백업 SQL 등
- **JS 직접 호출 검증**: 정확한 클릭 좌표가 어긋나면 fetch 직접 호출이 더 빠르고 안정. localStorage 토큰 주입으로 로그인도 가능 (개발/검증용)

### 보안 패턴
- 채팅에 평문 비밀번호 보내면 즉시 폐기/재발급 (Gmail 앱 비밀번호 미해결!)
- 이메일 발송 결과를 사용자에게 일관 응답 (계정 존재 노출 방지)
- 임시비번: 짧은 만료 + 강제 변경 + audit_logs 기록

### 코드 패턴
- **트랜잭션 + 메일 분리**: DB commit 후 메일 발송. 메일 실패해도 DB는 commit (재요청 가능)
- **graceful degradation**: nodemailer 없어도 try-catch로 서버 안 죽음
- **datetime 안전 처리**: string/Date 양쪽 처리 (드라이버 옵션 의존성 회피)

---

## 📋 다음 세션 시작용 첫 메시지 (추천)

```
DriveLog 비번찾기 시스템 마무리 + 잠재 버그 정리.

먼저 아래 문서들 읽고 컨텍스트 파악해줘:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_10_summary.md
- C:\Drivelog\smtp_password_reset_design.md

오늘 작업:
1. App.jsx 패치 배포 (npm run deploy:admin) — useEffect deps 버그픽스
2. cblim 본인 계정 비번찾기 흐름 e2e 검증 (사장님 직접)
3. (선택) test 계정 11223344 복구
4. (선택) Gmail 앱 비밀번호 폐기/재발급 — 보안
5. (선택) datetime 처리 잠재 버그 grep 점검
6. (선택) admin RIDER 진입 차단 패치
7. (선택) 개인정보 암호화 범위 결정 + 비번 정책 강화
```

---

## 🏢 양양대리 운영 현황 (변경 없음)

| 항목 | 값 |
|---|---|
| company_id | 3 |
| 회사 코드 | 1012 |
| 마일리지 적립률 | 10% (사용분 제외) |
| 마일리지 사용 단위 | 5,000원 |
| 활성 고객 | 239명 |
| 마일리지 보유 고객 | 232명 (총 약 1,509,000원) |
| API 버전 | v2.6 |

### 주요 테스트 계정 (양양대리, company_code 1012)

| 역할 | login_id | 비밀번호 | 이메일 | 비고 |
|---|---|---|---|---|
| MASTER | admin | Admin123! | - | 시스템 관리자 |
| SUPER_ADMIN | cblim | 11223344 | rnfkehdrn@naver.com | 임창빈, user_id=8 |
| RIDER | test | **Test1234!** | dwlee7788@naver.com | 테스트, user_id=51, 검증 후 변경됨 |
| RIDER | rider_son | Admin123! | - | 손영록 (이전 세션) |

---

**작성**: 2026-04-10 통합본 (오전 + 오후)
**다음 마일스톤**: App.jsx 패치 배포 + cblim 본인 비번찾기 e2e 검증
**API 버전**: v2.6
**컨테이너 상태**: drivelog-api healthy, find-id 버그 수정 배포 완료, mailer.js 정상 발송 확인
**대기 중인 클라이언트 배포**: App.jsx useEffect deps 패치 (`npm run deploy:admin`)
