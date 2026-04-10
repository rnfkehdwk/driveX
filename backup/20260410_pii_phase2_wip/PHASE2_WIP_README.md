# PHASE2: PII 암호화 작업 — 보류 상태 인계 문서

> **작성일**: 2026-04-10  
> **상태**: ⏸️ 보류 (개발 지식 학습 후 재개 예정)  
> **마지막 작업**: 검색 구현 방식(C+D/D/B) 결정 대기 중  
> **중요도**: 🔴 운영 중인 시스템의 실 데이터(양양대리 278건)를 건드리는 작업이라 신중 필요

---

## 📌 한 줄 요약

양양대리 PII(이름/전화/이메일/면허번호) 12개 컬럼을 AES-256-GCM 결정론적 부분 암호화로 보호하는 작업. 암호화 라이브러리와 마이그레이션 SQL까지 완성했으나, **실제 적용 전에 개발 지식을 더 쌓고 TDE 등 대안도 검토하기로 결정**. 작업 완전 중단이 아닌 **학습 후 재개** 상태.

---

## ✅ 이미 완료된 것

### 1. 설계 결정 (확정)
- **대상**: 12개 컬럼 (users 4개 + customers 3개 + companies 3개 + partner_companies 2개)
  - `customers.address`는 제외 결정
- **방식**: AES-256-GCM, 결정론적 IV (HMAC-SHA256 파생), `DLE1` prefix 마커
- **부분 암호화 규칙**:
  - name: 첫 글자 평문 + 나머지 암호화 (`홍DLE1xxx`)
  - phone: 앞 3 + 중간 암호화 + 뒤 4 (`010DLE1xxx5678`), **정규화 후 저장**(하이픈 제거)
  - email: 앞 2 + 암호화 + `@domain` (`hoDLE1xxx@gmail.com`)
  - license: 전체 암호화 (검색 불필요)
- **키 관리**: 환경변수 `PII_ENC_KEY` (64자 hex, NAS .env)

### 2. 작성된 파일
| 경로 | 상태 | 비고 |
|---|---|---|
| `drivelog-admin/server/utils/pii.js` | ✅ 운영본 | 약 500줄. 테스트 PASS 71/FAIL 0 |
| `drivelog-admin/server/utils/pii.test.js` | ✅ 테스트 스크립트 | DB 접근 없이 메모리 내 검증 |
| `drivelog-admin/server/db/migration_2026_04_10_pii_encryption.sql` | ✅ 작성 완료, **미실행** | 12개 컬럼 VARCHAR(255) 확장 |
| `drivelog-admin/docker-compose.yml` | ✅ 수정, **PII_ENC_KEY 주석 처리** | SMTP 블록 아래 |

### 3. 환경 현황 확인 완료
- **DB 데이터 건수**: users 30 / customers 248 / companies 4 / partner_companies 66 (총 348건)
- **현재 컬럼 타입**: 전부 VARCHAR(50~255), 마이그레이션 후 VARCHAR(255) 통일 (address 제외)
- **기존 전화번호 데이터**: 대부분 `010-XXXX-XXXX` 형식. `033-672-0000` 같은 지역번호도 존재. **`게좌이제`처럼 잘못된 데이터 1건 이상 발견** → pii.js가 자동 스킵하도록 처리됨

### 4. 테스트 결과
```
=== 1. NAME ===         14 PASS
=== 2. PHONE ===        20 PASS  
=== 3. EMAIL ===        12 PASS
=== 4. LICENSE ===       6 PASS
=== 5. SCHEMA ===       13 PASS
=== 6. 결정론 ===        4 PASS
=== 7. 변조 감지 ===     1 PASS
====================================
  PASS: 71   FAIL: 0
  ✅ ALL TESTS PASSED
```

재실행 방법:
```bash
cd C:\Drivelog\drivelog-admin\server
node utils/pii.test.js
```

---

## ⏸️ 보류된 결정 사항

### 결정 #1: 검색 구현 방식 (가장 큰 블로커)

암호화 후 `WHERE name LIKE '%길동%'` 같은 부분 검색이 깨지는 문제 해결 방법:

| 옵션 | 설명 | 작업량 | DriveLog 적합도 |
|---|---|---|---|
| **A (블라인드 인덱스)** | HMAC 해시 컬럼 | 중 | 정확매칭만 가능, 부분검색 불가 |
| **B (N-gram 인덱스)** | ngram 해시 테이블 | 큼 | 진짜 부분검색, 양양대리엔 과스펙 |
| **C (클라이언트 필터)** | 첫글자 prefix → decrypt → JS filter | 작음 | ~250건에 최적 |
| **D (prefix만)** | 첫글자/끝4자리 검색만 지원 | 최소 | 가장 단순, UX 저하 |
| **C+D 하이브리드** | C + D 조합 | 작음 | **사전 추천안** |

→ 사용자가 "개발 선배들에게 업계 표준 물어본 후 결정"하기로 함

### 결정 #2: 근본적 방향 재검토
학습 후 다음 대안들도 비교 검토 예정:
- **TDE (Transparent Data Encryption)**: MariaDB 10.1+ 지원. 디스크 파일 자체 암호화. **검색/정렬 다 그대로 동작**. 코드 변경 0. PHASE1의 Synology 볼륨 암호화와 비슷한 위협 모델 커버.
- **AWS KMS / Vault 등 키 관리 서비스**: .env 평문 대비 향상
- **블라인드 인덱스(HMAC) 표준 패턴**: 업계 실무자들이 실제로 쓰는 방식
- **법적 의무 재확인**: 개인정보보호법상 **필수 암호화**는 주민번호/여권번호/면허번호/계좌번호 등. 이름/전화/이메일은 **권장** 수준

→ TDE 하나만으로 충분할 수도 있음. 그 경우 PHASE2 전체 방향이 바뀜.

### 결정 #3: 내부 이슈 (학습 주제)
현재 설계의 잠재 약점:
- 결정론적 암호화 = **빈도 분석 공격**에 약함 (같은 평문 → 같은 암호문)
- 부분 암호화(`홍DLE1xxx`) = **검증된 표준이 아닌 자작 포맷** — 버그 가능성
- `.env`에 키 평문 저장 = NAS 전체 유출 시 키도 같이 유출

---

## 🗺️ 영향받는 라우트 (라우트 수정 단계에서 손댈 곳)

### 직접 PII 다루는 라우트 (4개)
- `customers.js`: INSERT/UPDATE name/phone/email, SELECT, LIKE 검색
- `users.js`: INSERT/UPDATE name/phone/email/license, SELECT, LIKE 검색
- `companies.js`: INSERT/UPDATE ceo_name/phone/email, SELECT *, LIKE(ceo_name)
- `partners.js`: INSERT/UPDATE contact_person/phone, SELECT

### PII JOIN해서 SELECT만 하는 라우트 (8개)
- `rides.js` — LIKE 검색(driver/customer) ⚠️
- `calls.js` — GET /, /:id/accept
- `mileage.js` — LIKE 검색 ⚠️
- `settlements.js` — `ORDER BY u.name` 정렬 영향 ⚠️
- `stats.js` — LIKE 검색(mileage 통계) ⚠️
- `paySettings.js` — riders/attendance
- `inquiries.js` — user_name, replied_by_name
- `auditLogs.js` — user_name

### 인증 핵심 (가장 까다로움)
- `auth.js`:
  - login 응답 user.name/phone 복호화 필요
  - **JWT payload의 name** 도 다른 라우트에서 평문 가정하므로 로그인 시점에 decrypt 필수
- `publicRoutes.js`:
  - find-id, request-password-reset의 `WHERE u.name = ? AND REPLACE(u.phone, ...) = ?` 쿼리 → 결정론 암호화로 변경 필수

### 영향 없음 (수정 안 함)
billing.js, billingPlans.js, paymentTypes.js, settlementGroups.js, farePolices.js, systemSettings.js, permissions.js, api.js

---

## 🚫 아직 안 한 것 (재개 시 할 일)

### Step 3: 백필 스크립트
- 경로: `drivelog-admin/server/scripts/encrypt_pii_backfill.js` (미작성)
- 기능: dry-run 모드, 배치 처리, 멱등 재실행, 진행률 표시
- 실행 시점: 라우트 코드 배포 **직전** (순서 중요)

### Step 4: 라우트 코드 수정 (가장 큰 작업)
- 13개 라우트 수정
- 접근 방식 결정 필요:
  - 옵션 1: 미들웨어 자동 변환 (req.body encrypt / res.json decrypt)
  - 옵션 2: 라우트별 명시적 호출 (`pii.decryptRows(rows, pii.SCHEMA.customers)`)
  - 옵션 3: 하이브리드 (사전 추천안)
- **검색 구현은 결정 #1 해결 후 진행**

### Step 5: NAS 실행 절차서
1. NAS에서 `node -e "..."` 로 PII_ENC_KEY 생성
2. `.env`에 추가
3. docker-compose.yml의 PII_ENC_KEY 주석 해제
4. DB 백업 (mysqldump)
5. 마이그레이션 SQL 실행
6. 백필 dry-run → 실제 실행
7. 라우트 코드 배포 (`npm run deploy:server`)
8. 컨테이너 재생성 (`docker-compose down/up`)
9. 브라우저에서 동작 검증

---

## 🔄 작업 재개 방법 (새 세션에서)

### 1. 먼저 읽을 문서
```
C:\Drivelog\CLAUDE_SESSION_GUIDE.md           # 기본 가이드
C:\Drivelog\session_2026_04_11_summary.md     # 최신 세션 요약 (이 문서 포함된 세션)
C:\Drivelog\backup\20260410_pii_phase2_wip\   # PHASE2 작업물 (여기!)
  └── PHASE2_WIP_README.md                    # 이 문서
```

### 2. 첫 작업: 학습 결과 반영
- 선배들에게 물어본 결과를 공유 → Claude가 방향 재정렬
- TDE 채택 시: PHASE2를 **아예 접고** TDE 절차서로 전환
- 애플리케이션 레벨 암호화 유지 시: 결정 #1~#3 확정

### 3. 재개 순서
```
a. docker-compose.yml의 PII_ENC_KEY 주석 해제
b. 검색 구현 방식 결정 (C+D 하이브리드 권장)
c. 라우트별 수정 계획 확정 (미들웨어 vs 명시적 호출)
d. Step 4 라우트 수정 시작 (라우트별 단위로 끊어서)
e. Step 3 백필 스크립트 작성
f. Step 5 NAS 절차서 작성
g. 사장님이 테스트 NAS 또는 새벽에 실행
```

### 4. 재검토 포인트 (학습 후 다시 볼 것)
- [ ] TDE vs 애플리케이션 레벨 — 위협 모델 비교
- [ ] 부분 암호화 자작 포맷 vs 표준 라이브러리 (tink, cryptography)
- [ ] 블라인드 인덱스 실무 패턴 (HMAC 컬럼 별도)
- [ ] 키 관리: .env vs KMS vs Vault
- [ ] 빈도 분석 공격 완화 방법
- [ ] 한국 개인정보보호법상 필수 암호화 대상 재확인

---

## 📂 이 폴더 안의 파일들

```
20260410_pii_phase2_wip/
├── PHASE2_WIP_README.md                              # 이 문서 ★
├── pii.js                                            # 백업본 (운영본의 사본)
├── migration_2026_04_10_pii_encryption.sql.REFERENCE.txt  # 참조 문서
└── (pii.test.js, 마이그레이션 원본은 운영 경로에 그대로 있음)
```

**운영 경로** (손대지 말 것 — 학습 후 재개 시 그대로 사용):
```
C:\Drivelog\drivelog-admin\server\
├── utils\
│   ├── pii.js           ← 운영본 (약 500줄, 테스트 PASS 71)
│   └── pii.test.js      ← 테스트 스크립트
└── db\
    └── migration_2026_04_10_pii_encryption.sql  ← 미실행
```

**수정된 파일**:
```
C:\Drivelog\drivelog-admin\docker-compose.yml
  → PII_ENC_KEY 라인 주석 처리됨 (작업 재개 시 주석 해제)
  → 백업: C:\Drivelog\backup\docker-compose_20260410_2330.yml (주석 처리 전)
```

---

## 📚 학습 시 참고할 것 (선배 질문용)

### 핵심 질문 5가지
1. 소상공인 SaaS(~300명)에 컬럼 암호화가 진짜 필요한가? TDE로 충분한가?
2. TDE vs 컬럼 암호화 vs 애플리케이션 레벨 — 뭐가 맞나?
3. 결정론적 암호화의 보안 약점은 뭔가? (빈도 분석)
4. 부분 암호화(`홍DLE1xxx`) 자작 포맷이 일반적인가? 표준 패턴은?
5. 키 관리는 어떻게? (.env / KMS / Vault)

### 검색 키워드
- `application-level encryption PII database`
- `deterministic encryption searchable`
- `blind index encryption sql`
- `MariaDB Data-at-Rest Encryption` (TDE)
- `개인정보 안전성 확보조치 기준 해설서` (KISA)

### 권위 있는 자료
- OWASP Cryptographic Storage Cheat Sheet
- KISA 개인정보 안전성 확보조치 기준
- MariaDB 공식 TDE 문서
- 카카오/네이버/우아한형제들 기술 블로그

---

## ⚠️ 주의사항 (재개 시 꼭 지킬 것)

1. **PII_ENC_KEY는 채팅/git에 절대 노출 금지** — NAS .env에 직접만
2. **키는 별도 안전한 곳에 백업 필수** (USB, 1Password 등) — 분실 시 데이터 영구 복구 불가
3. **DB 백업 없이 백필 실행 금지** — mysqldump 먼저
4. **dry-run 먼저** — 실제 UPDATE 전에 변환 결과 확인
5. **라우트 배포 순서 중요**:
   마이그레이션 → 백필 → 라우트 배포 → docker-compose 재생성
   (순서 틀리면 컨테이너가 평문/암호문 혼재 상태에서 에러)

---

**다음 Claude에게**: 이 문서를 먼저 읽고, 사용자가 학습해 온 새 정보를 들어본 후 방향을 재정렬하시오. 이미 작성된 pii.js는 "자작 포맷" 한계가 있으니 업계 표준 패턴으로 갈아엎을 여지도 열어둘 것. 하지만 테스트 통과된 코드이고 설계 원칙은 합리적이므로, 전면 폐기할 필요는 없을 수 있음. 사용자가 "TDE로 간다"고 하면 이 작업물은 학습 자료로 보존하고 새로 시작.
