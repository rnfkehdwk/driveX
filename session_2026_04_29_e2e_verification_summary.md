# DriveLog 세션 요약 — 2026-04-29 (저녁: E2E 검증 + 운영 시작 준비)

> **이전 세션**: 같은 날 오후 — login_id 변경 기능 추가
> **이번 세션 주제**:
> 1. 양양대리(1012) 전체 사용자 비밀번호 11223344 일괄 초기화
> 2. 운영 시작 전 전체 워크플로우(콜 → 수락 → 운행 → 마일리지) E2E 검증
> 3. 운영 환경의 누락 패키지(web-push) 복구
> 4. calls 테이블 lat/lng 컬럼 마이그레이션 적용 (옵션 Z 결정)
> **상태**: ✅ Phase 1 자동 검증 + Phase 2 수동 푸시 검증 모두 통과, Phase 3 cleanup 완료

---

## 🎯 주요 결정 사항

### 1. 운행일지 기사 매핑 — `user_id` 기반 확인
사용자 질문에서 시작: "기사 매핑이 기사 코드(login_id)로 되나요? user_id와 별개?"
- **확인**: 모든 외래키(rides.rider_id, calls.assigned_rider_id, customer_mileage.processed_by 등)가 `users.user_id`(PK) 기반
- **결론**: login_id 변경은 안전 (이전 작업과 일치)

### 2. calls 테이블 lat/lng — 옵션 Z 채택 (이전 4-29 옵션 A 결정 번복)
- 4-29 오후에 옵션 A(코드측 우회) 채택했지만, 백엔드 코드는 여전히 lat/lng를 INSERT/SELECT 시도해서 운영 중 에러
- **새 결정**: DB에 컬럼 추가 (`migration_20260428_calls_latlng.sql`을 멱등 처리하여 적용)
- 이유: 클라이언트가 이미 lat/lng를 보내고 있고, frequent-addresses 기능이 좌표를 활용하기 때문

### 3. 비밀번호 일괄 초기화 (양양대리 전체)
- bcrypt는 매번 다른 salt → 순수 SQL로는 불가능, Node.js 스크립트로 처리
- 23명 전원 11223334로 변경 완료, 잠금 해제 + 임시비번 플래그 정리

---

## 🔧 작업 내역

### 작업 1: 비밀번호 일괄 초기화

**위치**: `drivelog-admin/server/db/bulk_password_reset/`
- `run_yangyang_pw_reset.js` — Node.js 스크립트 (사용자별 다른 bcrypt salt 적용)
- `check_before.sql` / `check_after.sql` — 사전/사후 검증
- `README.md` — 가이드

**실행 결과**: 양양대리(1012) 23명 전원 비밀번호 → `11223344`
- cblim(SA) 1명
- RIDER 22명 (rider_고현순, rider_미배정, kbkwon, kylee, test 등)
- 모두 `password_must_change=0`, `temp_password_expires_at=NULL`, `login_fail_count=0`, `locked_until=NULL`
- password_history에 23건 기록
- audit_logs에 BULK_PASSWORD_RESET 23건 기록

### 작업 2: calls 테이블 마이그레이션

**파일**: `drivelog-admin/server/db/migration_20260428_calls_latlng.sql` (이미 존재했음, 4-28 작성)
- 4-29 업데이트: `IF NOT EXISTS` 멱등 처리 추가 (부분 적용 상황 대응)

**실행 결과**:
- start_lat, start_lng, end_lat, end_lng 4컬럼 모두 DECIMAL(10,7) NULL로 추가됨
- 운영 코드 에러(`Unknown column 'start_lat'`) 해소

### 작업 3: web-push 패키지 복구

**문제**: 컨테이너 내부에서 `web-push` 패키지가 require 안 됨 → 푸시 알림이 모두 fail
**원인**: 4-15에 push 기능 추가 시 컨테이너의 named volume `node_modules`에 `npm install`이 안 돌았음
**해결**:
1. `docker exec drivelog-api npm install web-push --save` (컨테이너 내부 설치)
2. `docker-compose restart api` 후에도 처음엔 사라졌으나, 그 다음 재생성 시점에 정상 정착
3. 결과: 검증 시 `[push] VAPID 초기화 완료` + 발송 1건 성공
4. **VAPID 키는 .env에 이미 있었음** (87자/43자 정상 설정)

**참고**: nodemailer도 동일한 패턴 — 메일은 어딘가에서 동작 중이지만 시작 로그에 미설치 메시지 보임. 별도 작업으로 정리 필요.

### 작업 4: E2E 워크플로우 검증

**위치**: `drivelog-admin/server/db/workflow_verification/`
- `run_e2e_verification.js` — Phase 1 자동 검증 (DB/로직)
- `cleanup_e2e_verification.js` — Phase 3 데이터 정리 (마일리지 잔액 원복 포함)
- `MANUAL_TEST_GUIDE.md` — Phase 2 수동 푸시 검증 가이드
- `quick_check.sql` — 검증 데이터 현황 조회
- `README.md`

**Phase 1 자동 검증 결과 (모두 ✅ 통과)**:
| STEP | 검증 항목 | 결과 |
|---|---|---|
| 1 | SA 콜 생성 (status=WAITING, lat/lng 포함) + RIDER 푸시 발송 | ✅ 발송 1, 실패 0 |
| 2 | RIDER 콜 수락 (WAITING→ASSIGNED) + SA 푸시 (RIDER 제외) | ✅ 발송 1, 실패 0 |
| 3 | 운행 작성 + 마일리지 USE/EARN + 콜 COMPLETED | ✅ ride_id 7248, 마일리지 정상 |
| 4 | 잔액 정합성 + customer_mileage 거래 검증 | ✅ 788,000-5,000+2,000=785,000 |

**Phase 2 수동 검증 결과**:
- cblim 안드로이드 폰(삼성 브라우저)에 알림 2개 모두 도착 ✅
  1. "🚗 새 콜 도착" (검증주소, 25,000원)
  2. "✅ 미배정 기사가 콜 수락"

**Phase 3 cleanup 결과**:
- rides 1건, calls 1건, customer_mileage 2건, audit_logs 2건 삭제
- 고객 무명(247) 잔액 +3,000 원복 (785,000 → 788,000)
- 검증 데이터 모두 정상 정리

---

## 🐛 검증 중 발견 + 수정한 버그들

### 1. customer_mileage PK 컬럼명 잘못된 가이드
- **CLAUDE_SESSION_GUIDE.md**에 "`customer_mileage` PK = `id`"로 적혀있었음 → **틀림**
- **실제**: `mileage_id`
- 가이드 파일 수정 + 검증/cleanup 스크립트 모두 `mileage_id`로 수정

### 2. calls 테이블에 lat/lng 컬럼 없음 (운영 중)
- 이전 4-29 옵션 A 결정 후 **클라이언트 측만 우회**, 백엔드는 여전히 lat/lng INSERT 시도
- 운영 로그에 `Unknown column 'start_lat'` 에러가 GET/POST 모두 반복 발생 중
- → 옵션 Z(컬럼 추가)로 결정 변경 + 마이그레이션 적용

### 3. web-push 패키지 미설치
- `package.json`에는 web-push가 있었지만 컨테이너 volume의 node_modules에 없었음
- 4-15 push 기능 추가 시 npm install 누락
- → 수동 설치 후 영구 정착

### 4. 검증 스크립트 자체의 문제들
- 첫 시도: calls INSERT에서 lat/lng 빼고 시도 → 마이그레이션 결정 후 다시 lat/lng 넣음
- customer_mileage `id` 컬럼명 → `mileage_id`로 수정
- audit_logs `audit_id` → `log_id`로 수정 (check_after.sql)

---

## 📂 변경/생성 파일

### 신규
| 파일 | 용도 |
|---|---|
| `drivelog-admin/server/db/bulk_password_reset/run_yangyang_pw_reset.js` | 비번 일괄 초기화 스크립트 |
| `drivelog-admin/server/db/bulk_password_reset/check_before.sql` | 사전 확인 |
| `drivelog-admin/server/db/bulk_password_reset/check_after.sql` | 사후 검증 |
| `drivelog-admin/server/db/bulk_password_reset/README.md` | 가이드 |
| `drivelog-admin/server/db/workflow_verification/run_e2e_verification.js` | E2E 자동 검증 |
| `drivelog-admin/server/db/workflow_verification/cleanup_e2e_verification.js` | 검증 데이터 정리 |
| `drivelog-admin/server/db/workflow_verification/MANUAL_TEST_GUIDE.md` | 수동 검증 가이드 |
| `drivelog-admin/server/db/workflow_verification/quick_check.sql` | 검증 데이터 조회 |
| `drivelog-admin/server/db/workflow_verification/README.md` | 가이드 |

### 수정
| 파일 | 변경 |
|---|---|
| `drivelog-admin/server/db/migration_20260428_calls_latlng.sql` | IF NOT EXISTS 멱등 처리 추가 |
| `CLAUDE_SESSION_GUIDE.md` | customer_mileage PK 컬럼명 수정 (id → mileage_id) |

### NAS 환경 변경 (영구)
| 항목 | 변경 |
|---|---|
| DB: calls 테이블 | start_lat, start_lng, end_lat, end_lng 4컬럼 추가 |
| DB: users (1012) 23명 | password_hash 모두 `11223344` 해시로 변경 |
| API 컨테이너: node_modules | web-push 3.6.7 설치 |

---

## 🛠 학습 노트 (다음 세션이 참고할 것)

### 1. **Docker volume의 node_modules 함정**
- `package.json`에 dependency 추가만으론 부족 — 컨테이너 내부에서 `npm install` 직접 실행 필요
- 또는 image 재빌드 (Dockerfile에 `npm ci --production`이 있어서 새 image 빌드 시 자동 반영)
- 점검 명령:
  ```bash
  docker exec drivelog-api node -e "console.log(require.resolve('패키지명'))"
  ```

### 2. **bcrypt 해시 ≠ 고정값**
- 같은 비밀번호도 매번 다른 해시 (salt 다름)
- DB에서 직접 UPDATE로는 일괄 변경 불가 — Node.js로 사용자별 해시 생성 후 UPDATE 해야 함
- 보안상으로도 고정 해시는 위험

### 3. **MariaDB 10.11 — IF NOT EXISTS 멱등 ALTER**
```sql
ALTER TABLE x ADD COLUMN IF NOT EXISTS col_name TYPE NULL;
```
- 부분 적용 상황에도 안전
- 모든 마이그레이션 SQL은 멱등하게 작성하는 게 좋음

### 4. **마이그레이션 파일 미적용 사고 패턴**
- 파일은 존재 (4-28 작성된 `migration_20260428_calls_latlng.sql`)
- 그러나 적용은 안 함 (옵션 A로 우회 결정 후 잊혀짐)
- 결과: 운영 중 INSERT 에러 누적
- **교훈**: 운영 코드를 그대로 두면서 우회하기로 결정한 경우, **마이그레이션 파일은 즉시 폐기 또는 명시적으로 .deferred 같은 접미사로 분리**

### 5. **Phase 1 자동 검증 + Phase 2 수동 검증 패턴 (재사용 가능)**
- DB/로직은 자동 스크립트로 (재실행 가능, cleanup 포함)
- UI/푸시/실제 사용자 경험은 수동 (자동화 어려운 영역)
- 검증 데이터에 식별 태그(`[E2E_VERIFY_YYYYMMDD]`)를 박아서 cleanup 안전성 확보
- 마일리지 같은 누적 데이터는 잔액 원복 SQL 미리 준비 필수

### 6. **운영 로그 분석 시 — 누적 에러와 신규 에러 구분**
- `docker-compose restart`는 컨테이너 재생성 안 할 수 있음 (로그 누적)
- 깨끗한 검증 위해 `docker-compose down api && docker-compose up -d api` 또는
- `docker logs drivelog-api --since 1m` 같이 시간 기반 필터로 확인

### 7. **양양대리(1012) 푸시 구독 현황**
- 현재: cblim 1명만 안드로이드 삼성 브라우저로 구독 (4-15 등록, 4-25 마지막 사용)
- RIDER들은 아직 알림 권한 미허용 상태
- → 운영 시작 시 모든 RIDER에게 알림 권한 허용 안내 필요

---

## ✅ 운영 시작 체크리스트

운영 시작 전 마지막 점검:

- [x] 양양대리 23명 전원 비번 11223344로 초기화 완료
- [x] calls 테이블 lat/lng 4컬럼 마이그레이션 완료
- [x] web-push 패키지 컨테이너 정착 완료
- [x] E2E 워크플로우 자동 검증 통과 (콜 → 수락 → 운행 → 마일리지)
- [x] 푸시 알림 실제 수신 확인 (cblim 폰)
- [x] 검증 데이터 정리 (cleanup) 완료, 잔액 원복 확인
- [ ] **운영 시작 안내**: 모든 사용자에게 비번 11223344 + 즉시 변경 안내
- [ ] **RIDER들 알림 권한 허용 안내**: 모바일 페이지 처음 접속 시 권한 허용
- [ ] (선택) nodemailer 패키지 컨테이너 정착 — 메일은 동작 중이지만 시작 로그에 미설치 메시지 보임

---

## 🔮 다음 세션 메모

- **PII Phase 2 (암호화)**: 보류 중 (사장님 결정 대기)
- **PHASE1 (볼륨 암호화 + DB 포트 차단)**: 개발 주기 끝날 때
- **nodemailer 시작 로그 미설치 메시지** 정리 (메일은 동작하지만 깨끗하게)
- **운영 모니터링**: 다음 1주일 동안 audit_logs, 잠금 발생, 푸시 발송 실패율 모니터링
- **임시비번 안 바꾼 사용자 대응**: 1주일 후 재안내 또는 강제 임시비번 발급

---

**작성**: 2026-04-29 (저녁)
**작업자**: Claude (스크립트/코드/검증) + Tomcat (배포/실행/수동 검증)
**관련 문서**: `CLAUDE_SESSION_GUIDE.md`, `session_2026_04_29_summary.md`, `session_2026_04_29_login_id_edit_summary.md`
