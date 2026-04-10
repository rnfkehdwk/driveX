# DriveLog 세션 요약 — 2026-04-10 (오전)

> **이전 세션**: `session_2026_04_09_summary.md` — 마일리지 시스템 2단계 (프론트엔드 통합)
> **이번 세션 주제**: 신규 가입 오류 디버깅 → 비밀번호 찾기/아이디 찾기 시스템 구축 → docker-compose 마운트 사고 복구

---

## 🎯 이번 세션 목표

처음엔 단순한 가입 오류 1건 디버깅으로 시작했으나, 사용자 요청으로 다음 기능들이 추가됨:
1. 신규 업체 가입 시 "가입 처리 중 오류가 발생했습니다" 에러 해결
2. 로그인 페이지에 아이디 찾기 / 비밀번호 찾기 추가
3. 비밀번호 정책 강화 (추후) 메모 남기기
4. 개인정보 암호화 현황 검토 및 권고사항 정리
5. SMTP(Gmail) 기반 임시비밀번호 이메일 발송 시스템 구축
6. MASTER/SUPER_ADMIN의 임시비밀번호 직접 발급 기능
7. 임시비밀번호 사용 시 강제 비밀번호 변경 모달

---

## ✅ 완료된 작업 (시간순)

### 1. 신규 가입 오류 디버깅 및 해결
**증상**: 셀프 가입 시 모든 항목 입력 후 "가입 처리 중 오류가 발생했습니다" alert.

**원인**: `system_settings.auto_approve_trial = 'true'` 상태에서 `publicRoutes.js`가 `companies.status = 'TRIAL'`을 INSERT 시도. 그러나 `companies.status` ENUM은 `PENDING/ACTIVE/SUSPENDED/DELETED`만 허용 → `Data truncated for column 'status'` 에러 → 500.

**해결**: `server/routes/publicRoutes.js`에서 `'TRIAL'` → `'ACTIVE'`로 수정. 무료체험 여부는 이미 `trial_expires_at` 컬럼으로 구분되므로 status에 별도 값 불필요.

**검증**: 사장님이 가입 재시도 → 정상 가입 확인.

### 2. 개인정보 암호화 현황 정리
사용자 질문 "개인정보들 DB에 전부 암호화 해서 넣고있나?"에 대한 답변:
- ✅ 비밀번호: bcrypt 12 rounds (안전)
- ✅ 리프레시 토큰: SHA-256 해시 (안전)
- ✅ 통신: HTTPS/TLS
- ⚠️ 이름, 전화, 이메일, 주소, 차량번호, 면허번호: **평문 저장**
- ⚠️ 고객 PII (이름/전화/주소): **평문**

권고사항: (가) Synology 볼륨 암호화 + DB 외부포트 차단 → 가장 ROI 높음. (나) `users.driver_license` 컬럼만 AES-256으로 핀포인트 암호화. 컬럼 단위 전체 암호화는 작업량 대비 효과 낮음 (검색 기능 영향).

→ **의사결정 보류 상태** (다음 세션에서 결정 필요)

### 3. 비밀번호 찾기 / 아이디 찾기 설계 결정
3가지 옵션 검토 후 사용자 결정:
- **옵션 다 (Gmail SMTP)** 채택
- 임시비밀번호 **8자리** (영문 대소문자+숫자, 0/O/1/l/I 제외)
- 마스킹 ID 노출 (`cb***m` 형태)
- 임시비번 만료 시간 **10분**
- 임시비번 로그인 시 **강제 비밀번호 변경** 적용

업체코드 기억 부담 문제로 추가 결정:
- DB 확인 결과 `users.login_id`에 글로벌 UNIQUE 제약 (`uk_login_id`) 존재 확인
- → **로그인 시 업체코드 칸을 선택 입력으로 변경** (평소엔 비워두면 됨)
- → 아이디/비번 찾기에서도 업체코드 없이 이름+전화로 찾기 가능

이메일 미등록 사용자 처리:
- (가) 신규 가입 시 이메일 필수화
- (나) 기존 사용자 비번찾기 시 이메일 없으면 inquiries에 PASSWORD_RESET 자동 등록 → MASTER 직접 발급 fallback

### 4. 코드 작업 (백엔드 + 프론트 + 인프라)
변경된 파일 13개:

**백엔드**:
1. `server/utils/mailer.js` (신규) — Gmail SMTP + 임시비번 메일 템플릿 + 8자리 생성기
2. `server/db/migration_2026_04_09_password_reset.sql` (신규) — 컬럼 2개 + ENUM 추가
3. `server/routes/publicRoutes.js` — `find-id`, `request-password-reset` 추가 + register 이메일 필수화
4. `server/routes/users.js` — `issue-temp-password` 라우트 추가 (8자리 자동 생성)
5. `server/routes/auth.js` — 로그인 응답에 `password_must_change` 플래그 + 임시비번 만료 검증 + change-password 시 플래그 해제
6. `server/index.js` — find-id, password-reset rate limit 추가 (시간당 5회/IP)
7. `server/package.json` — `nodemailer ^6.9.16` 의존성 추가

**프론트**:
8. `client/src/api/client.js` — `findUserId`, `requestPasswordReset`, `issueTempPassword` 추가
9. `client/src/pages/Login.jsx` — 업체코드 선택입력 + 아이디/비번 찾기 모달 2개 (전체 재작성)
10. `client/src/pages/Register.jsx` — 이메일 필수 + 형식 검증
11. `client/src/App.jsx` — `forced` 모드 PasswordModal (강제 비번 변경 시 닫기 차단)
12. `client/src/pages/Users.jsx` — `🔑 임시비번` 버튼 + 결과 표시 모달

**인프라**:
13. `drivelog-admin/docker-compose.yml` — NAS 정상 버전과 동기화 (volumes 섹션 + SMTP env + 경고 주석)
14. `package.json` (루트) — deploy:server 스크립트에서 `models` 제거, `utils` 추가

### 5. ⚠️ docker-compose 마운트 사고 (장시간 디버깅)

**증상**: 사장님이 .env에 SMTP 추가 + docker-compose down/up 실행 후 컨테이너가 v1.5로 보이고 trust proxy 에러 + ENOENT 에러 발생.

**원인 진단 과정** (시간순):
1. **DB 연결 실패**: `Access denied for user 'drivelog'@...`
   - docker-compose.yml에 `DB_USER: drivelog`로 박혀있었음 (사장님 의도는 sykim)
   - sed로 `sykim`으로 수정
2. **컨테이너는 살았지만 v1.5 표시**: 
   - 호스트의 `/server/index.js`는 v2.6 (4181 bytes, 14:31 수정)
   - 컨테이너 안의 `/app/index.js`는 v1.5 (2973 bytes, 3월 17일 수정)
   - **마운트가 깨져서 이미지에 박힌 옛날 코드를 실행 중**
3. **`docker inspect` 결과**: `"Mounts": []` (마운트 비어있음)
4. **`docker-compose config` 결과**: api 블록에 volumes 섹션 자체가 없음
5. **결정적 단서**: `docker-compose.yml` 직접 확인 결과 api 서비스 블록에서 `volumes:` 3줄이 누락되어 있었음. 어느 시점에 yml 편집하다 사고.

**해결**:
- python3 스크립트로 `restart: always` 다음에 volumes 3줄 (`./server:/app`, `/app/node_modules`) 삽입
- `docker-compose stop api && rm -f api && up -d --no-deps api`로 컨테이너 강제 재생성
- 마운트 정상 확인 + v2.6 표시 + healthy 상태 복구

**예방 조치**:
- 로컬 `C:\Drivelog\drivelog-admin\docker-compose.yml`을 NAS 정상 버전과 동일하게 갱신
- yml 파일 상단에 ⚠️ 주석 추가: "api 서비스의 volumes 섹션은 절대 삭제하지 말 것"
- 다음에 NAS yml이 깨지면 로컬 파일을 복사해 즉시 복원 가능

### 6. nodemailer 설치 + mailer.js 배포 사고
**증상**: nodemailer는 컨테이너에 설치 성공했는데 컨테이너가 `Cannot find module '../utils/mailer'` 에러로 죽음.

**원인**: 루트 `package.json`의 `deploy:server` 스크립트가 업로드 폴더 목록에 `utils`를 포함하지 않음. mailer.js는 로컬에만 있고 NAS로 안 올라간 상태.

**해결**:
1. 로컬 `package.json`의 deploy:server 스크립트 수정 — `models` 제거, `utils` 추가
2. `npm run deploy:all` 재실행 → utils/mailer.js 정상 업로드
3. `docker-compose up -d api`로 컨테이너 다시 생성

### 7. DB 마이그레이션 실행 완료
`migration_2026_04_09_password_reset.sql` 실행 결과:
- ✅ `users.password_must_change` (tinyint(1), NOT NULL DEFAULT 0)
- ✅ `users.temp_password_expires_at` (datetime, NULL)
- ✅ `inquiries.inquiry_type` ENUM에 `'PASSWORD_RESET'` 추가

---

## 🚧 다음 세션에서 진행할 작업

### 1. 브라우저 동작 테스트 (최우선)
사용자가 이번 세션에서 코드 배포 + 인프라 셋업까지 끝냈으나, 실제 브라우저 테스트는 안 함.

**테스트 체크리스트**:
- [ ] 양양대리 정상 로그인 + 데이터 정상 (활성 고객 239명, 마일리지 등)
- [ ] 로그인 화면 변경 확인:
  - [ ] 업체코드 칸 "(선택)" 라벨 + "평소엔 비워두셔도 됩니다" 플레이스홀더
  - [ ] 하단 "아이디 찾기 | 비밀번호 찾기" 링크
- [ ] 아이디 찾기 모달:
  - [ ] 본인 이름+전화 입력 → 마스킹 ID (`cb***m`) + 업체명 표시
- [ ] 비밀번호 찾기 모달:
  - [ ] cblim+임창빈+전화 입력 → 등록 이메일로 발송 → 메일 도착 확인
  - [ ] 8자리 임시비번 표시 (a-z, A-Z, 2-9, 0/O/1/l/I 제외)
  - [ ] 임시비번으로 로그인 → 강제 변경 모달 (닫기 차단)
  - [ ] 새 비번 변경 → 정상 로그인
- [ ] 계정관리 임시비번 발급 버튼:
  - [ ] 🔑 임시비번 노란 버튼 표시
  - [ ] 클릭 → 결과 모달에 8자리 + 복사 버튼
  - [ ] 이메일 등록 사용자: 자동 발송 메시지
  - [ ] 이메일 미등록 사용자: 직접 전달 메시지
- [ ] 신규 가입 시 이메일 필수 검증

**테스트 시 주의**:
- 본인(cblim) 비밀번호로 테스트하면 비번이 임시비번으로 바뀜 → 새 비번(11223344) 재설정 필요
- 안전하게 하려면 본인 계정에 개인 이메일 등록 후 비번찾기 → 본인 메일함에서 받기 → 새 비번으로 11223344 입력

### 2. ⚠️ Gmail 앱 비밀번호 폐기/재발급 (필수, 보안)
이번 세션에서 사장님이 채팅에 앱 비밀번호를 두 번 노출함:
- 1차: `eluo zhah kujq gnpd` (재발급 안내함)
- 2차: `lwuofrxxthwiqwru` (.env 내용 공유 시)

**처리 절차**:
1. https://myaccount.google.com/apppasswords 접속
2. `drivelog` 항목 **삭제**
3. 새로 발급 → 16자리
4. **절대 채팅에 공유하지 말고** NAS에서 직접:
   ```bash
   sudo vi /volume1/docker/drivelog/.env
   # SMTP_PASS= 줄을 새 16자리로 교체 (공백 없이)
   ```
5. 컨테이너 재생성:
   ```bash
   cd /volume1/docker/drivelog
   sudo docker-compose down
   sudo docker-compose up -d
   ```

### 3. 보류된 결정 사항
- **개인정보 암호화 범위**: (가) 볼륨 암호화만 / (나) driver_license만 추가 / (다) 모든 PII
- **비밀번호 정책 강화** (추후): 영문 대소문자 + 숫자 + 특수문자 8자 이상

### 4. 미완 작업 (이전 세션부터)
- **검증 데이터 정리** (운행 #1261, #1263, attendance id=1)
- **rides PUT/DELETE 시 마일리지 보정** 처리
- **콜 단계에서 마일리지 입력** (옵션)

---

## 📦 변경 파일 종합 (이번 세션)

### 백엔드
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `server/utils/mailer.js` | 신규 | Gmail SMTP 헬퍼 + 메일 템플릿 + 8자리 생성기 |
| `server/db/migration_2026_04_09_password_reset.sql` | 신규 | 컬럼 2개 + ENUM 추가 |
| `server/routes/publicRoutes.js` | 수정 | TRIAL→ACTIVE 버그 수정 + find-id, request-password-reset 라우트 추가 + 이메일 필수화 |
| `server/routes/users.js` | 수정 | issue-temp-password 라우트 추가 |
| `server/routes/auth.js` | 수정 | password_must_change 플래그 처리 |
| `server/index.js` | 수정 | rate limit 2개 추가 |
| `server/package.json` | 수정 | nodemailer 의존성 추가 |

### 프론트
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `client/src/api/client.js` | 수정 | API 함수 3개 추가 |
| `client/src/pages/Login.jsx` | 전면 재작성 | 업체코드 선택입력 + 모달 2개 |
| `client/src/pages/Register.jsx` | 수정 | 이메일 필수화 |
| `client/src/App.jsx` | 수정 | forced 모드 PasswordModal |
| `client/src/pages/Users.jsx` | 수정 | 임시비번 버튼 + 결과 모달 |

### 인프라
| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `drivelog-admin/docker-compose.yml` (로컬) | 수정 | NAS 정상 버전과 동기화 + 경고 주석 |
| `package.json` (루트) | 수정 | deploy:server에 utils 추가, models 제거 |
| `/volume1/docker/drivelog/docker-compose.yml` (NAS) | 수정 | volumes 섹션 복구 + SMTP env 5개 |
| `/volume1/docker/drivelog/.env` (NAS) | 수정 | SMTP 환경변수 5개 추가 |

### 백업
- `backup/publicRoutes_20260409_1050.js`
- `backup/publicRoutes_20260409_1130.js`
- `backup/BACKUP_README_20260409_1130.md`
- `backup/users_20260409_1130_summary.js`
- NAS: `docker-compose.yml.backup_20260409`, `docker-compose.yml.before_volumes_fix`, `docker-compose.yml.backup_*` (timestamp)

---

## 🐛 이번 세션에서 디버깅한 이슈 (학습용)

### 1. companies.status ENUM 제약
- **교훈**: ENUM 컬럼에 새 값을 INSERT할 땐 반드시 ENUM 정의를 먼저 확인. ERD 문서에 적힌 값이 실제 DB와 일치하는지 마이그레이션 후 검증 필요.
- **에러 패턴**: `Data truncated for column 'X'` → ENUM 또는 길이 제약 위반

### 2. docker-compose.yml의 volumes 섹션 누락
- **교훈**: docker-compose.yml은 들여쓰기가 매우 민감하고, `restart: always` 다음에 `environment:`로 바로 가는 건 정상이지만 `volumes:`가 빠져있으면 이미지에 박힌 코드만 실행됨.
- **진단법**: `docker inspect <container> | grep -A 10 '"Mounts"'`로 마운트 확인. 비어있으면 즉시 의심.
- **검증법**: `sudo docker exec <container> stat /app/index.js` vs `sudo stat /volume1/docker/drivelog/server/index.js` — Size와 Modify 비교

### 3. deploy:server 스크립트 누락 폴더
- **교훈**: 새 폴더 추가 시 (예: utils/) 루트 `package.json`의 deploy:server scp 대상 목록에도 반드시 추가
- **진단법**: NAS에서 `ls /volume1/docker/drivelog/server/` 했을 때 새 폴더 없으면 deploy 누락

### 4. 환경변수 vs .env 주입 방식
- **교훈**: docker-compose에서 `.env` 파일은 yml 내부 `${VAR}` 치환에만 쓰임. 컨테이너 안에 환경변수로 주입하려면 yml의 `environment:` 또는 `env_file:`에 명시해야 함.
- 사장님 시스템: `${SMTP_HOST}` 같은 변수가 yml에 명시되어 있어야 .env 값이 컨테이너로 전달됨

### 5. docker-compose restart vs up --force-recreate
- **교훈**: `restart`는 컨테이너만 재시작하므로 environment 변경사항이 안 들어감. environment를 바꿨으면 반드시 `down → up -d` 또는 `up -d --force-recreate`

### 6. MCP filesystem 사용 시 백업 전략
- **교훈**: edit_file로 부분 수정하면 git diff로 변경 추적 가능 → 별도 백업 파일 만들 필요 적음. write_file로 통째 덮어쓰기 전엔 read_text_file로 원본 확보 후 backup 폴더에 복사.

---

## 💡 핵심 학습 / 패턴

### 디버깅 패턴
- **로그가 옛날 에러와 새 에러를 섞어서 보여주는 함정**: `docker logs --tail N`은 시간순 마지막 N줄. 재시작 사이클이 있으면 죽음+부활이 같은 화면에 나옴. `--since 1m`로 최근만 확인.
- **컨테이너 진단 3종**: `docker ps` (살아있나) + `docker inspect | grep Mounts` (마운트) + `docker exec env | grep KEY` (환경변수)

### 보안 패턴
- 채팅에 평문으로 보낸 비밀번호는 즉시 폐기/재발급
- 이메일 발송 결과를 사용자에게 일관되게 응답 (계정 존재 여부 노출 방지)
- 임시비번 만료(10분) + 사용 후 강제 변경 + audit_logs 기록

### 코드 패턴
- **트랜잭션 + 메일 발송 분리**: DB commit 후 메일 발송. 메일 실패해도 DB는 commit 상태 유지 → 사용자가 다시 요청 가능
- **graceful degradation**: nodemailer 없어도 require try-catch로 서버 안 죽음
- **마스킹 함수 재사용**: maskLoginId, maskEmail을 publicRoutes.js 상단에 분리

---

## 📋 다음 세션 시작용 첫 메시지 (추천)

```
DriveLog 비밀번호 찾기 / 아이디 찾기 시스템 검증.

먼저 아래 문서들 읽고 컨텍스트 파악해줘:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_10_summary.md
- C:\Drivelog\smtp_password_reset_design.md (SMTP 설계 문서)

오늘 작업:
1. 브라우저에서 비밀번호 찾기 / 아이디 찾기 / 임시비번 발급 동작 검증
2. (검증 끝나면) Gmail 앱 비밀번호 폐기/재발급
3. (선택) 개인정보 암호화 범위 결정
4. (선택) 이전 세션 미완 작업 - 검증 데이터 정리, rides PUT/DELETE 마일리지 보정
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

---

**작성**: 2026-04-10 오전
**다음 마일스톤**: SMTP 비번찾기 시스템 동작 검증 + Gmail 앱 비번 재발급
**API 버전**: v2.6
**컨테이너 상태**: drivelog-api healthy, mailer.js 정상 로드, DB 마이그레이션 완료
</content>
