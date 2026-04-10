# DriveLog 세션 요약 — 2026-04-10 (전일 통합)

> **이전 세션**: `session_2026_04_09_summary.md` — 마일리지 시스템 2단계 (프론트엔드 통합)
> **이번 세션 주제**:
> - **오전**: 신규 가입 오류 디버깅 → 비밀번호 찾기/아이디 찾기 시스템 구축 → docker-compose 마운트 사고 복구 → SMTP 배포 완료
> - **오후**: 이메일 필드 추가 (계정관리/기사관리) → 브라우저 e2e 검증 → 발견된 백엔드/프론트엔드 버그 2건 수정
> - **저녁**: 잠재 버그 2건(admin RIDER 차단 + datetime grep) 처리 → 개인정보 암호화 의사결정 → Phase 0 백업 체계 구축
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
8. ✅ **admin RIDER 진입 차단 패치** (저녁 작업)
9. ✅ **routes datetime grep 감사 (안전 확인)** (저녁 작업)
10. ✅ **개인정보 암호화 의사결정 + Phase 0 백업 체계 구축** (저녁 작업)
11. ⏸ 비밀번호 정책 강화 (추후) — 메모만 남김
12. ⏸ 개인정보 암호화 코드 작업 (Phase 1~4) — 다음 세션부터

---

## ✅ 완료된 작업 (시간순)

### [오전] 1. 신규 가입 오류 디버깅 및 해결
**증상**: 셀프 가입 시 모든 항목 입력 후 "가입 처리 중 오류가 발생했습니다" alert.

**원인**: `system_settings.auto_approve_trial = 'true'` 상태에서 `publicRoutes.js`가 `companies.status = 'TRIAL'`을 INSERT 시도. 그러나 `companies.status` ENUM은 `PENDING/ACTIVE/SUSPENDED/DELETED`만 허용 → `Data truncated for column 'status'` 에러 → 500.

**해결**: `'TRIAL'` → `'ACTIVE'`. 무료체험 여부는 이미 `trial_expires_at` 컬럼으로 구분.

### [오전] 2. 개인정보 암호화 현황 정리 (1차)
- ✅ 비밀번호: bcrypt 12 rounds / 리프레시 토큰: SHA-256 / 통신: HTTPS — 안전
- ⚠️ 이름, 전화, 이메일, 주소, 차량번호, 면허번호, 고객 PII: **평문 저장**
- 권고: (가) 볼륨 암호화 + DB 외부포트 차단 (ROI 최고) / (나) `users.driver_license` 컬럼만 핀포인트 AES-256
- → **의사결정 보류** (저녁에 결정)

### [오전] 3. 비밀번호 찾기 / 아이디 찾기 설계 결정
- 발송 인프라: **Gmail SMTP (무료)**, 일 500통
- 임시비번 8자리, 영문 대소문자+숫자, 0/O/1/l/I 제외
- 만료 10분, 사용 후 강제 변경
- 마스킹 ID 노출 (`cb***m`)
- 업체코드 칸을 **선택 입력**으로 변경 (login_id 글로벌 UNIQUE 확인됨)
- 이메일 미등록자 fallback: inquiries에 PASSWORD_RESET 자동 등록

### [오전] 4. 코드 작업 (백엔드 + 프론트 + 인프라) — 14개 파일
[이전 요약과 동일 — 생략]

### [오전] 5. ⚠️ docker-compose 마운트 사고 복구
[이전 요약과 동일 — 생략]

### [오전] 6. nodemailer 배포 누락 사고
[이전 요약과 동일 — 생략]

### [오전] 7. DB 마이그레이션 실행 완료
- ✅ `users.password_must_change` (tinyint(1) DEFAULT 0)
- ✅ `users.temp_password_expires_at` (datetime NULL)
- ✅ `inquiries.inquiry_type` ENUM에 `'PASSWORD_RESET'` 추가

### [오후] 8. Users.jsx에 이메일 수정 필드 추가
[이전 요약 8번과 동일]

### [오후] 9. 브라우저 e2e 검증 — 14개 항목 통과
[이전 요약 9번과 동일]

### [오후] 10. 🐛 발견된 버그 2건 수정 + 배포
[이전 요약 10번과 동일 — find-id 500 + App.jsx useEffect deps]

### [오후] 11. test 계정 비밀번호 상태 변화
[이전 요약 11번과 동일 — 현재 `Test1234!`]

---

## ✅ 저녁 작업 (잠재 버그 처리 + 의사결정 + 백업 구축)

### [저녁] 12. 🐛 잠재 버그 1: admin이 RIDER 진입 차단 안 함

**증상 (이론)**: RIDER가 admin web (`/admin/`)에 자기 ID/PW로 로그인 시도하면:
- 백엔드 `/auth/login`은 정상 토큰 발급 (모바일 PWA가 같은 엔드포인트 사용)
- admin SPA가 user를 받아들이고 → 모든 `RoleGuard`가 `roles=['MASTER','SUPER_ADMIN']`로 RIDER 차단 → `<Navigate to="/" />` → `/`도 RIDER 차단 → **무한 redirect**
- 동시에 `navGroups = isMaster ? master : superAdmin` → RIDER일 때 superAdmin 메뉴 표시 → **사이드바 깨짐**

**패치 — 2층 방어**:

1. **Login.jsx `doLogin()`**: 로그인 응답에 `data.user.role === 'RIDER'`면 token/user 저장 안 하고 alert로 모바일 PWA URL 안내 + 리턴 (1차 차단)
   ```js
   if (data?.user?.role === 'RIDER') {
     localStorage.removeItem('autoLogin_admin');
     localStorage.removeItem('savedPw_admin');
     setError('기사(운행기사) 계정은 관리자 페이지에 접속할 수 없습니다. 모바일 앱(/m/)으로 접속해주세요.');
     setLoading(false);
     return;
   }
   ```

2. **App.jsx `useEffect([user])`**: 안전망으로 user 로드 후 RIDER이면 자동 logout (localStorage에 RIDER user가 남아있는 엣지케이스 대응)
   ```js
   if (user.role === 'RIDER') {
     localStorage.removeItem('accessToken');
     localStorage.removeItem('refreshToken');
     localStorage.removeItem('user');
     // ...
     setUser(null);
     alert('기사 계정은 관리자 페이지를 이용할 수 없습니다. 모바일 앱(/m/)으로 접속해주세요.');
     navigate('/login');
     return;
   }
   ```

**백업**: 
- `backup/Login_admin_20260410_1700.jsx` (원본)
- `backup/App_admin_20260410_1700.jsx` (원본)
- `backup/App_admin_20260410_1700_NOTE.txt` (변경 의도 메모)

**배포**: `npm run deploy:admin` 완료, 사용자 검증 완료 ✅

### [저녁] 13. 🔍 잠재 버그 2: routes datetime grep 감사

**조사 내용**: `drivelog-admin/server/routes/` 22개 파일 전체 grep — `.toISOString()` 사용처 점검

**결과 — `.toISOString()`을 DB로 직접 보내는 곳 0건** ✅

| 파일 | 위치 | 용도 | 위험도 |
|---|---|---|---|
| `publicRoutes.js` | register 응답 | `trial_expires_at`을 `'YYYY-MM-DD'` 슬라이스해서 응답 JSON에만 사용 | ✅ 안전 |
| `publicRoutes.js` | find-id (오후 패치) | created_at이 Date 객체일 때 안전 처리용 | ✅ 안전 |
| `settlements.js` | `/daily` | `today` 변수를 `'YYYY-MM-DD'`로 만들어 SQL `BETWEEN`에 사용 | ✅ 안전 |

**핵심 발견**: `config/database.js`에 **`dateStrings: true`** 설정 → mysql2가 SELECT 시 DATETIME을 자동으로 string 반환. INSERT/UPDATE는 모두 `new Date()` 객체를 직접 바인딩하면 mysql2가 자동 변환. **현재 코드 상 datetime 처리 위험은 없음.**

**결론**: 추가 코드 변경 불필요. 보고서로만 정리.

### [저녁] 14. 개인정보 암호화 의사결정 (학습 + 결정)

사용자 학습 내용:
1. **마스킹 vs 암호화**: 사용자가 본 `010-DEID6998DE-2354` 패턴은 마스킹이 아니라 **부분 컬럼 암호화** (deterministic AES-256)
2. **AES-256 vs SHA-256 차이**: 양방향(키 필요) vs 단방향(키 없음). 사용자 명확히 이해
3. **한국 개인정보보호법 기준**:
   - 양방향 암호화 의무: 주민번호, 여권번호, **운전면허번호**, 외국인등록번호, 신용카드, 계좌번호, 바이오정보
   - 그 외 PII (이름/전화/이메일/주소): "안전한 보관" 의무 (인프라 보호로 충족 가능)
   - 사업자번호, 법인 대표자명, 사업장 주소: PII 아님 (공개정보)
4. **결합용이성 (개인정보보호법 제2조 1호 나목)**: "2가지 이상 합성 시 식별 가능한 데이터"는 PII

**사용자 결정 — 양양대리 적용 범위**:

| 분류 | 처리 방식 | 대상 컬럼 |
|---|---|---|
| **분류 A (필수)** | AES-256 부분 암호화 | users.name, phone, email / customers.name, phone, email, address / users.driver_license (전체 암호화, 법적 의무) |
| **분류 B (포함)** | AES-256 부분 암호화 | companies.ceo_name, phone, email / partner_companies.contact_person, phone |
| **분류 C (제외)** | 평문 유지 | 사업자번호, 법인 정보, 차량번호 등 공개정보 |
| **분류 D (NO)** | 이번 단계에서 제외 | manual_gps_points.lat/lng (위치정보보호법 별도) |

**암호화 방식**: **결정론적 AES-256 부분 암호화** (가운데/일부만 암호화, 앞뒤 평문 유지로 검색·통계 가능)

**예시**:
```
원본:        010-1234-5678
저장:        010-DLE1{base64}-5678
                  ─────┬─────
                  암호화된 가운데
```

**작업 견적**: 약 22시간 (3~5 세션 분산)
- Phase 0: 백업 체계 (1h) ← **이번 세션 진행**
- Phase 1: 인프라 보호 (1h) — Synology 볼륨 암호화 + DB 외부 포트 차단
- Phase 2: utils/pii.js PoC (3h)
- Phase 3: 라우트 적용 (10h)
- Phase 4: 마이그레이션 + 회귀 테스트 (3h)

### [저녁] 15. ✅ Phase 0: 백업 체계 구축 완료

**문제 인식**: 양양대리는 운영 중인 시스템인데 **백업이 한 번도 없는 상태**. 마이그레이션 작업 전에 백업이 절대 필수 + 평소에도 백업은 기본 안전망.

**구축 결정**:
- 보관 위치: `/volume1/docker/drivelog/backup/` (NAS 내부)
- 폴더 구조: `backup_YYYYMMDD/drivelog_db_YYYYMMDD_HHMMSS.sql.gz` (날짜별 폴더)
- 자동 백업 주기: 매일 새벽 3시 (DSM 작업 스케줄러)
- 보관 기간: 14일
- PC1, PC2 복사: 사용자가 정기적으로 직접

**작성된 파일** (5개, `C:\Drivelog\backup\scripts\`):
1. `PHASE0_INDEX.md` — 전체 흐름 + 체크리스트
2. `PHASE0_FIRST_BACKUP.md` — 첫 풀백업 명령 가이드
3. `drivelog_backup.sh` — 자동 백업 스크립트 (날짜별 폴더 + 무결성 검증 + 14일 자동 정리 + 디스크 부족 방어 + 로그 기록)
4. `PHASE0_AUTO_BACKUP_SETUP.md` — DSM 작업 스케줄러 등록 가이드
5. `PHASE0_RESTORE_GUIDE.md` — 비상 복원 절차 (체크리스트 포함)

**스크립트 특징**:
```bash
# 핵심 안전장치
set -e / set -u                          # 에러 발생 시 즉시 종료
export PATH="/usr/local/bin:..."         # DSM 스케줄러 환경 호환
"Dump completed" 마커 검증               # 덤프 무결성 확인
임시 파일 → 검증 → 압축 → rename         # 실패 시 깔끔히 정리
디스크 500MB 미만 시 7일 이전 강제 삭제   # 공간 방어
14일 이상 폴더 통째로 삭제                # 자동 정리
backup.log에 모든 실행 기록              # 추적 가능
```

**진행 흐름** (사용자 직접 NAS 작업):
1. ✅ 백업 폴더 생성 (`mkdir -p /volume1/docker/drivelog/backup`)
2. ✅ 권한 트러블슈팅 (Permission denied → `chown rnfkehdwk:users` 해결)
3. ✅ 첫 풀백업 수동 실행 → 49KB sql.gz 생성 + 무결성 OK
4. ✅ 자동 백업 스크립트 NAS에 업로드 + 권한 부여
5. ✅ 두 번째 수동 실행 (날짜별 폴더 구조 검증)
6. ✅ DSM 작업 스케줄러 등록 (매일 03:00, root, `bash /volume1/docker/drivelog/drivelog_backup.sh`)
7. ✅ 스케줄러 즉시 실행 테스트
8. ✅ PC1, PC2로 첫 백업 복사 완료

**중간 트러블슈팅 1건**:
- **권한 에러**: `sudo docker exec ... > /volume1/backup/...` 명령에서 `Permission denied`
- **원인**: `sudo`는 docker exec에만 적용, `>` 리다이렉트는 사용자(rnfkehdwk) 권한
- **해결**: `sudo chown -R rnfkehdwk:users /volume1/docker/drivelog/backup/`

**중간 경로 변경 1건**:
- **원래 안**: `/volume1/backup/drivelog/`
- **사용자 요청 변경**: `/volume1/docker/drivelog/backup/` (drivelog 디렉토리 안에 통합)
- **재작성**: 스크립트의 BACKUP_ROOT 경로 + 모든 가이드 문서 갱신

**중간 구조 변경 1건**:
- **원래 안**: 평면 구조 (`backup/drivelog_db_*.sql.gz`)
- **사용자 요청 변경**: 날짜별 폴더 (`backup/backup_20260410/drivelog_db_*.sql.gz`)
- **이유**: 14일치 파일이 한 폴더에 쌓이면 지저분 + 폴더 단위 복사가 편함
- **재작성**: 스크립트 + 삭제 로직 (파일 단위 → 폴더 단위)

**완료 시점 백업 통계**:
- 백업 폴더: `/volume1/docker/drivelog/backup/`
- 첫 백업: `backup_20260410/drivelog_db_20260410_220818.sql.gz` (49 KB)
- 백업 로그: `backup.log` 정상 기록
- 폴더 권한: rnfkehdwk:users (일반 사용자도 접근 가능)
- 옛 파일 정리: `backup_OLD/`에 4월 7일 부분 백업 SQL 4개 + 평면 구조 백업 1개 보관
- DSM 스케줄러: 활성화, 매일 03:00 자동 실행

---

## 🚧 다음 세션에서 진행할 작업

### 🎯 다음 세션 핵심: Phase 1부터 시작

이번 세션 끝 시점에 사용자께서 결정한 진행 방향:
- ✅ Phase 0 (백업 체계) 완료
- ⏭ 다음 세션: Phase 1 (인프라 보호) 부터 시작

### 1. Phase 0 검증 (다음 세션 시작 시 5분)
- 자동 백업이 새벽 3시에 정상 동작했는지 확인
  ```bash
  ls -la /volume1/docker/drivelog/backup/backup_$(date +%Y%m%d)/
  tail -30 /volume1/docker/drivelog/backup/backup.log
  ```
- 만약 동작 안 했으면 → 스케줄러 설정 재점검

### 2. Phase 1: 인프라 보호 (약 1시간)

**2-1. docker-compose.yml의 db 서비스 외부 포트 차단**
- 현재 NAS의 docker-compose.yml에서 `drivelog-db` 서비스에 `ports: ["3306:3306"]` 같은 게 있는지 확인
- 있다면 제거 (백엔드 컨테이너는 docker network로 접근하므로 외부 포트 불필요)
- 변경 후 `docker-compose down && up -d` (restart 아님)

**2-2. Synology 볼륨 암호화 (사용자 결정 필요)**
- 옵션 1: NAS 전체 볼륨을 새 암호화 볼륨으로 마이그레이션 (시간 많이 걸림)
- 옵션 2: 별도 암호화 공유 폴더 만들고 DriveLog 데이터 이동 (작업 큼)
- 옵션 3: 일단 외부 포트 차단만 하고 볼륨 암호화는 별도 일정으로 (실용적)
- **사용자 NAS 구조 확인 후 결정**

### 3. Phase 2: utils/pii.js PoC (약 3시간, 다음 세션 또는 그 다음)
- AES-256 결정론적 부분 암호화 헬퍼 함수 작성
- IV 파생 방식 (HMAC) 구현
- 유닛 테스트 작성 (encrypt/decrypt round-trip)
- prefix marker (`DLE1`) 구현
- 더블 암호화 방지 로직

### 4. Phase 3: 라우트 적용 (약 10시간, 분산 권장)
- users → customers → companies → partners 순서
- 라우트별 검색 로직 재작성 (`find-id` 등)
- audit_logs 처리

### 5. Phase 4: 마이그레이션 + 회귀 테스트 (약 3시간)
- 평문 → 암호문 일괄 변환 스크립트
- 양양대리 DB 적용 (백업 확인 후)
- 브라우저 회귀 테스트

### 6. 미완 작업 (이전부터 누적)
- ⚠️ **Gmail 앱 비밀번호 폐기/재발급** (보안, 미해결)
- 비밀번호 정책 강화 (영문 대소문자 + 숫자 + 특수문자 8자 이상)
- test 계정 11223344 복구 (선택)
- 검증 데이터 정리 (운행 #1261, #1263, attendance id=1)
- rides PUT/DELETE 시 마일리지 보정
- 콜 단계에서 마일리지 입력 (옵션)

---

## 📦 변경 파일 종합 (오전 + 오후 + 저녁 통합)

### 백엔드
| 파일 | 변경 유형 | 시점 |
|---|---|---|
| `server/utils/mailer.js` | 신규 | 오전 |
| `server/db/migration_2026_04_09_password_reset.sql` | 신규 | 오전 |
| `server/routes/publicRoutes.js` | 수정 (TRIAL→ACTIVE + find-id + request-password-reset + 이메일 필수) | 오전 |
| `server/routes/publicRoutes.js` | **버그픽스 (find-id created_at 안전 처리)** | 오후 |
| `server/routes/users.js` | 수정 (issue-temp-password) | 오전 |
| `server/routes/auth.js` | 수정 (password_must_change 플래그) | 오전 |
| `server/index.js` | 수정 (rate limit 2개) | 오전 |
| `server/package.json` | 수정 (nodemailer) | 오전 |

### 프론트
| 파일 | 변경 유형 | 시점 |
|---|---|---|
| `client/src/api/client.js` | 수정 (API 함수 3개) | 오전 |
| `client/src/pages/Login.jsx` | 전면 재작성 (업체코드 선택 + 모달 2개) | 오전 |
| `client/src/pages/Login.jsx` | **수정 (RIDER 진입 차단 1차 방어)** | 저녁 |
| `client/src/pages/Register.jsx` | 수정 (이메일 필수) | 오전 |
| `client/src/App.jsx` | 수정 (forced PasswordModal) | 오전 |
| `client/src/App.jsx` | **버그픽스 (useEffect deps `[]` → `[user]`)** | 오후 |
| `client/src/App.jsx` | **수정 (RIDER 안전망 자동 logout)** | 저녁 |
| `client/src/pages/Users.jsx` | 수정 (🔑 임시비번 버튼 + 결과 모달) | 오전 |
| `client/src/pages/Users.jsx` | **수정 (이메일 필드 추가 5곳)** | 오후 |

### 인프라 / 운영
| 파일 | 변경 유형 | 시점 |
|---|---|---|
| `drivelog-admin/docker-compose.yml` (로컬) | 수정 (NAS 동기화) | 오전 |
| `package.json` (루트) | 수정 (deploy:server에 utils 추가) | 오전 |
| `/volume1/docker/drivelog/docker-compose.yml` (NAS) | 수정 (volumes 복구 + SMTP env) | 오전 |
| `/volume1/docker/drivelog/.env` (NAS) | 수정 (SMTP 5개) | 오전 |
| `/volume1/docker/drivelog/backup/` (NAS, 신규) | 백업 폴더 + 스크립트 + 자동 백업 | **저녁** |
| `/volume1/docker/drivelog/drivelog_backup.sh` (NAS, 신규) | **자동 백업 스크립트** | **저녁** |
| DSM 작업 스케줄러 | **신규 (DriveLog DB 자동 백업, 매일 03:00)** | **저녁** |

### 백업 (오후 + 저녁)
- `backup/Users_jsx_20260410_1430.jsx` — 이메일 필드 추가 직전
- `backup/Login_admin_20260410_1700.jsx` — RIDER 차단 직전
- `backup/App_admin_20260410_1700.jsx` — RIDER 차단 직전
- `backup/App_admin_20260410_1700_NOTE.txt` — 변경 의도 메모
- `backup/session_2026_04_10_summary_20260410_1100.md` — 오전 작업본 요약
- `backup/scripts/` (5개 파일) — Phase 0 가이드 + 백업 스크립트
- NAS `backup/backup_OLD/` — 이전 부분 백업 보관

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
- 양양대리는 `dateStrings: true` 설정 → string 반환
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

### [저녁] 10. RoleGuard 무한 redirect
- admin SPA에서 모든 RoleGuard가 같은 role 차단 + 그 role을 `<Navigate to="/" />`로 보내면 무한 루프
- 해결: 진입 자체를 막아야 함 (Login 응답 검사 + App.jsx 안전망)
- 교훈: 라우터 redirect는 "어디로 갈지" 명확해야 함. role mismatch 시 "/login" 또는 강제 logout이 안전

### [저녁] 11. sudo 리다이렉트 권한 함정 (Phase 0 트러블슈팅)
- `sudo docker exec ... > /file` 명령에서 `>` 리다이렉트는 sudo 권한 밖
- root가 만든 폴더에 일반 사용자가 파일 쓰기 시도 → Permission denied
- 해결 1: `sudo chown user:group /folder`로 폴더 owner 변경
- 해결 2: `sudo bash -c '... > /file'` (전체를 sudo로)
- 해결 3: `... | sudo tee /file > /dev/null`

### [저녁] 12. DSM 작업 스케줄러 환경
- cron보다 환경변수가 더 빈약 (PATH 등)
- 스크립트 상단에 `export PATH="/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin:$PATH"` 추가 필수
- 직접 실행(`/path/script.sh`)보다 `bash /path/script.sh` 호출이 더 안전 (실행 권한 + shebang 의존성 제거)

---

## 💡 핵심 학습 / 패턴

### 디버깅 패턴
- **컨테이너 진단 3종**: `docker ps` (살아있나) + `docker inspect | grep Mounts` (마운트) + `docker exec env | grep KEY` (환경변수)
- **로그 함정**: `docker logs --tail N`은 시간순 마지막 N줄. 재시작 사이클 있으면 죽음+부활이 섞임. `--since 1m` 권장.
- **500 에러는 '매칭 실패' 아님**: 200 + found:false vs 500을 구분. 500은 거의 항상 코드/SQL 예외.

### 검증 패턴
- **e2e 검증 때 비파괴 → 파괴 순서로**: 먼저 GET, UI 표시, API 응답 형식 확인 → 그다음 PUT/POST 같은 상태 변경
- **검증 대상 계정의 원상태 복구 경로 미리 확보**: 비번 검증은 password_history 충돌 가능성, 데이터 변경은 백업 SQL 등
- **JS 직접 호출 검증**: 클릭 좌표 어긋나면 fetch 직접 호출이 더 빠르고 안정. localStorage 토큰 주입으로 로그인도 가능

### 보안 패턴
- 채팅에 평문 비밀번호 보내면 즉시 폐기/재발급 (Gmail 앱 비밀번호 미해결!)
- 이메일 발송 결과를 사용자에게 일관 응답 (계정 존재 노출 방지)
- 임시비번: 짧은 만료 + 강제 변경 + audit_logs 기록
- **백업 없는 운영은 그 자체로 위험** (Phase 0 결정)
- **권한 분리**: 단일 RoleGuard 패턴이 무한 redirect 함정 가능 → 진입 자체 차단

### 코드 패턴
- **트랜잭션 + 메일 분리**: DB commit 후 메일 발송. 메일 실패해도 DB는 commit (재요청 가능)
- **graceful degradation**: nodemailer 없어도 try-catch로 서버 안 죽음
- **datetime 안전 처리**: string/Date 양쪽 처리 (드라이버 옵션 의존성 회피)
- **2층 방어**: 1차 차단 (Login.jsx) + 2차 안전망 (App.jsx)
- **useEffect deps**: 사용자 상태 변화에 반응할 로직은 빈 deps `[]` 금지

### 운영 패턴 (저녁 새로 정립)
- **백업 자동화 3요소**: 무결성 검증 + 자동 정리 + 로그 추적
- **백업 보관 전략**: NAS 1차 + PC1, PC2 정기 복사 (다층 방어)
- **스크립트 안전장치**: `set -e`, `set -u`, `export PATH`, 임시 파일 → 검증 → rename
- **DSM vs cron**: Synology는 DSM 작업 스케줄러 쓰고 cron 쓰지 말 것 (DSM 업데이트 시 cron 초기화)

### 암호화 학습 (저녁 새로 학습)
- **SHA-256 vs AES-256**: 단방향 vs 양방향, 같은 256비트지만 의미 다름 (해시 출력 vs 키)
- **비밀번호는 bcrypt** (SHA-256보다 의도적으로 느림 → brute force 방어)
- **결정론적 vs 비결정론적 암호화**: 검색 가능 vs 빈도 분석 방어. 양양대리는 결정론적 선택
- **부분 컬럼 암호화**: `010-DEID{암호화}-5678` 같은 패턴, 한국 실무 표준
- **DEID/ENC: prefix 의미**: 마이그레이션 판별 + 복호화 분기 + 버전 관리 + 더블 암호화 방지
- **개인정보보호법 정확히 알기**: 양방향 의무 항목(주민/면허/카드/계좌)과 일반 PII 구분

---

## 📋 다음 세션 시작용 첫 메시지 (추천)

```
DriveLog 개인정보 암호화 작업 — Phase 1 시작.

먼저 아래 문서들 읽고 컨텍스트 파악해줘:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_10_summary.md

오늘 작업:
0. Phase 0 검증 (어제 자동 백업이 새벽 3시에 정상 동작했는지)
1. Phase 1 시작:
   - NAS docker-compose.yml의 db 서비스 외부 포트 확인 + 차단
   - Synology 볼륨 암호화 옵션 검토 (사용자 NAS 구조 확인 후 결정)
2. (선택) Phase 2 시작 — utils/pii.js PoC

미해결 보안 작업:
- Gmail 앱 비밀번호 폐기/재발급 (오전 세션부터 미해결)
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

## 🔐 백업 체계 (저녁 신규)

| 항목 | 값 |
|---|---|
| 백업 위치 | `/volume1/docker/drivelog/backup/` |
| 폴더 구조 | `backup_YYYYMMDD/drivelog_db_*.sql.gz` |
| 자동 백업 시각 | 매일 03:00 (DSM 작업 스케줄러) |
| 보관 기간 | 14일 |
| 압축 형식 | gzip -9 |
| 첫 백업 크기 | 49 KB (압축 후) |
| 스크립트 경로 | `/volume1/docker/drivelog/drivelog_backup.sh` |
| 스케줄러 등록 명령 | `bash /volume1/docker/drivelog/drivelog_backup.sh` |
| 로그 파일 | `/volume1/docker/drivelog/backup/backup.log` |
| PC1, PC2 복사 | 사용자 정기 수동 (주 1회 권장) |
| 복원 가이드 | `C:\Drivelog\backup\scripts\PHASE0_RESTORE_GUIDE.md` |

---

## 🔒 개인정보 암호화 작업 계획 (저녁 결정)

| Phase | 작업 | 시간 | 상태 |
|---|---|---|---|
| **Phase 0** | 백업 체계 구축 | 1h | ✅ **완료** |
| **Phase 1** | 인프라 보호 (Synology 볼륨 암호화 + DB 외부 포트 차단) | 1h | ⏭ 다음 세션 |
| **Phase 2** | utils/pii.js PoC + 유닛 테스트 | 3h | 대기 |
| **Phase 3** | 라우트 적용 (users → customers → companies → partners) | 10h | 대기 |
| **Phase 4** | 마이그레이션 + 회귀 테스트 | 3h | 대기 |
| **합계** | | **약 18h** | (3~5 세션 분산) |

### 적용 대상 컬럼 (분류 A + B)

| 테이블 | 컬럼 | 처리 |
|---|---|---|
| users | name, phone, email | AES-256 부분 |
| users | driver_license | AES-256 전체 (법적 의무, 현재 사용 안 하나 미래 대비) |
| customers | name, phone, email, address | AES-256 부분 |
| companies | ceo_name, phone, email | AES-256 부분 |
| partner_companies | contact_person, phone | AES-256 부분 |

### 처리 방식
- **결정론적 AES-256 부분 암호화** (가운데 일부만 암호화, 앞뒤 평문 유지)
- **prefix marker**: `DLE1` (DriveLog Encrypted v1)
- **IV 파생**: HMAC-SHA256 기반 (key + plaintext)
- **검색**: 같은 키로 입력값을 암호화 후 비교
- **키 관리**: NAS `.env`의 `PII_ENC_KEY` (32바이트 hex), 권한 600

---

**작성**: 2026-04-10 통합본 (오전 + 오후 + 저녁)
**다음 마일스톤**: Phase 1 (인프라 보호) 진입
**API 버전**: v2.6
**컨테이너 상태**: drivelog-api healthy, find-id 버그 수정 + RIDER 차단 패치 배포 완료
**백업 상태**: ✅ 자동 백업 활성 (DSM 스케줄러 매일 03:00)
**다음 세션 첫 작업**: Phase 0 검증 (자동 백업 동작 확인) → Phase 1 시작
