# DriveLog 세션 요약 — 2026-04-11

> **이전 세션**: `session_2026_04_10_summary.md` — SMTP 비밀번호 재설정 시스템 구축  
> **이번 세션 주제**: PHASE2 PII 암호화 설계/구현 (Step 1~2 완료, Step 3~5 보류)  
> **상태**: ⏸️ 학습 후 재개 예정

---

## 🎯 이번 세션 목표

이전 세션에서 보류됐던 개인정보 암호화 작업 착수:
1. PHASE1 (Synology 볼륨 암호화) → **마지막 단계로 연기** (개발 완료 후 진행)
2. PHASE2 (컬럼 단위 AES-256 암호화) → **이번 세션 주제**

---

## ✅ 완료된 작업

### 1. PHASE2 설계 확정 (이전 세션에서 사용자가 미리 결정해놓은 내용 재확인)
- **대상 12개 컬럼** (customers.address 제외):
  - users: name, phone, email, driver_license
  - customers: name, phone, email
  - companies: ceo_name, phone, email
  - partner_companies: contact_person, phone
- **방식**: AES-256-GCM, 결정론적 IV (HMAC-SHA256 파생), `DLE1` prefix 마커
- **부분 암호화**: 검색/식별성을 위해 일부 평문 유지
- **전화번호 정규화**: 하이픈 제거 후 저장, 표시 시 클라이언트에서 하이픈 삽입

### 2. 현황 점검 (사장님이 NAS에서 실행)
DB 스키마 조사 + 데이터 건수 확인:
```
users   30건    phone 샘플: 010-XXXX-XXXX 형식 다수, 033-672-0000 지역번호
customers   248건   phone 샘플: 010-XXXX-XXXX 다수, '게좌이제' 잘못된 데이터 1건
companies   4건
partner_companies   66건
총 348건
```
→ 데이터가 작아서 백필은 몇 초면 끝날 규모. 잘못된 데이터(`게좌이제`)도 pii.js가 자동 스킵하도록 처리.

### 3. `server/utils/pii.js` 작성 (약 500줄)
결정론적 AES-256-GCM 부분 암호화 라이브러리:
- `encryptName/decryptName` (첫 글자 평문)
- `encryptPhone/decryptPhone` (앞 3 + 중간 암호화 + 뒤 4)
- `encryptEmail/decryptEmail` (앞 2 + 중간 + @domain)
- `encryptLicense/decryptLicense` (전체 암호화)
- `normalizePhone/formatPhone` (정규화/표시)
- `encryptFields/decryptFields/decryptRows` (객체 일괄)
- `SCHEMA.{users,customers,companies,partner_companies}` (테이블별 미리 정의)
- `generateKey()` (CLI 키 생성용)

**디자인 원칙**:
- 결정론적 IV: `HMAC-SHA256(KEY, fieldType + ':' + plaintext)` → 검색 가능
- cross-field 분리: 같은 평문이라도 fieldType 다르면 다른 암호문
- 멱등성: 이미 암호화된 값 재처리 시 그대로 통과 (백필 재실행 안전)
- 혼재 안전: 평문/암호문이 섞여 있어도 `DLE1` 마커로 구분
- 변조 감지: GCM auth tag로 자동 검증
- 잘못된 데이터 보호: 형식 깨진 phone은 평문 그대로 (손상 방지)

### 4. `server/utils/pii.test.js` 작성 + 검증
70개+ 단위 테스트. DB 접근 없이 메모리 내 검증만.

**초기 버그 발견 및 수정**:
- `decryptPhone` 의 정규식이 greedy 매칭으로 tail 숫자를 토큰에 포함시키는 버그
- 수정: 정규식 대신 tail 길이(4) 고정 규칙으로 역산
- 수정 후 PASS 71 / FAIL 0

### 5. `db/migration_2026_04_10_pii_encryption.sql` 작성
- 12개 컬럼 VARCHAR(255) 확장
- NOT NULL 제약 보존 (users.name/phone, customers.name)
- 멱등성 패턴 (이미 255 이상이면 스킵)
- 실행은 **안 함** — 라우트 코드 준비 후 일괄 실행 예정

### 6. `docker-compose.yml` 수정
- `PII_ENC_KEY: ${PII_ENC_KEY}` 환경변수 추가
- **나중에 주석 처리** (.env에 값 없으면 경고 → 작업 재개 시 주석 해제)
- 백업: `backup/docker-compose_20260410_2330.yml`

### 7. 영향 분석 (라우트 13개 식별)
- **직접 PII 다루는 4개**: customers, users, companies, partners
- **JOIN해서 SELECT만 하는 8개**: rides, calls, mileage, settlements, stats, paySettings, inquiries, auditLogs
- **인증 핵심 1개**: auth(JWT payload name), publicRoutes(find-id, request-password-reset 정확매칭 변경)
- **영향 없음 8개**: billing, billingPlans, paymentTypes 등

---

## ⏸️ 보류된 작업 (학습 후 재개)

### 사용자 결정
> "이거는 다른 개발자 선배들한테 물어보고 암호화를 어떤식으로 진행하고 개인정보보호는 어떤식으로 진행하는지 물어봐서 내 개발 지식을 좀 쌓고 진행해보자. 너무 수박 겉핥기로 단편적인 기억만 있어서 여러 많은 컬럼에 대한 모든 결정을 내리는데 어렵네"

매우 합리적인 판단. 운영 중인 시스템의 실 데이터를 건드리는 작업이라 신중하게 가는 것이 맞음.

### 미결 사항
1. **검색 구현 방식** (C+D 하이브리드 / D만 / B ngram 중 선택)
2. **근본 방향 재검토** — TDE가 더 적합할 수 있음
3. **자작 포맷 vs 표준 패턴** — 블라인드 인덱스 등

### 안 한 작업 (재개 시)
- Step 3: 백필 스크립트 작성
- Step 4: 라우트 코드 수정 (13개)
- Step 5: NAS 실행 절차서

---

## 📦 작업물 정리 위치

### 운영 파일 (그대로 둠, 재개 시 사용)
```
drivelog-admin/server/utils/pii.js                          ← 운영본
drivelog-admin/server/utils/pii.test.js                     ← 테스트
drivelog-admin/server/db/migration_2026_04_10_pii_encryption.sql  ← 미실행
drivelog-admin/docker-compose.yml                           ← PII_ENC_KEY 주석 처리됨
```

### 백업/인계 폴더 (새로 생성)
```
C:\Drivelog\backup\20260410_pii_phase2_wip\
├── PHASE2_WIP_README.md                              ★ 인계 문서 (학습 후 첫 번째로 읽을 것)
├── pii.js                                            ← 백업본
└── migration_2026_04_10_pii_encryption.sql.REFERENCE.txt
```

### 기존 백업
```
C:\Drivelog\backup\docker-compose_20260410_2330.yml   ← docker-compose.yml 수정 전 원본
```

---

## 🔄 다음 세션 시작용 권장 메시지

### A. 학습 끝나고 바로 재개하는 경우
```
PHASE2 PII 암호화 작업 재개. 선배들에게 물어본 결과를 공유할게.

먼저 아래 문서들 읽고 컨텍스트 파악해줘:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_11_summary.md
- C:\Drivelog\backup\20260410_pii_phase2_wip\PHASE2_WIP_README.md

학습 결과: [여기에 내용]
이걸 기반으로 방향 재정렬해줘.
```

### B. 다른 작업부터 먼저 하는 경우
```
PHASE2는 아직 보류. 다른 작업 먼저 할게.

먼저 아래 읽고 시작해줘:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_11_summary.md

오늘 작업: [여기에 주제]
```

---

## 🧠 이번 세션에서 학습한 것

### 설계 관점
1. **결정론적 암호화의 본질** — 같은 평문 → 같은 암호문이어야 검색이 가능. 랜덤 IV는 안 됨.
2. **GCM의 auth tag** — 변조 감지용. CBC/CTR과 달리 무결성 보장.
3. **base64url vs base64** — URL-safe 문자집합 (`-_` 대신 `+/`), 패딩 없음.
4. **부분 암호화의 트레이드오프** — 검색 편의성 ↔ 정보 누출 (첫 글자, 뒤 4자리 등)
5. **cross-field IV 분리** — 같은 값이라도 컬럼이 다르면 다른 암호문 (cross-column 추측 방지)

### 구현 관점
1. **멱등성의 중요성** — 백필 도중 실패해도 재실행 안전해야 함
2. **혼재 상태 대응** — 평문과 암호문이 섞여 있어도 마커로 구분
3. **잘못된 데이터 보존** — 형식 검증 실패 시 손상보다는 원본 유지
4. **정규식 greedy 버그** — base64url 문자집합이 `[A-Za-z0-9_-]` 라서 평문 tail(숫자)과 구분 안 됨. 고정 길이 규칙으로 역산해야 함.

### 프로세스 관점
1. **테스트 스크립트의 가치** — DB 건드리기 전에 로직 버그 발견 (PHONE decrypt 버그)
2. **멈출 줄 아는 것도 중요** — 단편적 지식으로 밀어붙이기보다 학습 후 재시도

---

## 🏢 양양대리 운영 현황 (변경 없음)

| 항목 | 값 |
|---|---|
| company_id | 3 |
| 회사 코드 | 1012 |
| 활성 고객 | 248명 |
| 활성 기사 | 30명 |
| API 버전 | v2.6 |
| 비밀번호 찾기 시스템 | 배포 완료, 브라우저 검증 미완 |

---

**작성**: 2026-04-11  
**API 버전**: v2.6  
**PHASE2 상태**: Step 1~2 완료, Step 3~5 보류 (학습 후 재개)  
**운영 영향**: 없음 (코드 배포 안 함, DB 마이그레이션 안 함)
