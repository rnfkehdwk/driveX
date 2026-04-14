# DriveLog 세션 요약 — 2026-04-15

> **이전 세션**: `session_2026_04_11_summary.md` — PHASE2 PII 암호화 (보류)
> **이번 세션 주제**:
> 1. 운행기록 조회 마일리지 적립 안내 SMS 버튼 (완료)
> 2. Web Push 알림 시스템 구축 (코드 완료, 배포 대기)
> **상태**: ✅ 작업 1 완료 / 🟡 작업 2 코드 완료, NAS 배포 및 검증 대기

---

## 🎯 작업 1: 마일리지 적립 안내 SMS 버튼 (✅ 완료)

### 요구사항
- SA 계정이 모바일 운행기록 조회에서 각 운행마다 💬 문자 버튼 탭 → 기기 기본 문자앱 열림 + 본문 미리 채워짐
- 고객명 제외, 회사명은 자동 치환
- 고객 번호 없으면 "번호없음" 알림

### 구현 방식
- `sms:` URL 스킴 사용 (tel: 과 같은 원리) → 통신사 문자로 발송, 서버 비용 0원
- iOS/Android 둘 다 `?body=` 파라미터 지원

### 변경 파일 2개
- **`drivelog-admin/server/routes/rides.js`**: GET /api/rides SELECT에 `r.customer_id`, `cust.mileage_balance AS customer_mileage_balance` 추가
- **`drivelog-mobile/src/pages/RideList.jsx`**:
  - SA 전용 💬 문자 버튼 추가 (RIDER 숨김)
  - 적립액 있는 운행에 `적립: +N원` 녹색 텍스트
  - `handleSendSMS()` 함수: `sms:{phone}?body={encoded}` URL로 이동

### 최종 문자 본문
```
양양대리운전 입니다.
고객님 마일리지
적립 : 4,000 원
총 적립액 : 28,000원
감사합니다.
```

### 백업
- `C:\Drivelog\backup\RideList_20260414_1430.jsx`
- `C:\Drivelog\backup\rides_get_only_20260414_1430.js`

### 배포 상태
- ✅ 배포 완료 (브라우저 검증 일부 완료)
- 📸 스크린샷으로 적립액 표시 및 버튼 정상 동작 확인

### 디버깅 기록
- **첫 번째 시도**: 모바일에서 버튼 안 보임
- **원인**: `r.customer_id`로 조건 체크했는데 GET /api/rides SELECT 절에 `r.customer_id`가 없어서 응답에 누락. `cust.customer_code`(문자열 코드)는 있었지만 PK 아님.
- **해결**:
  1. SELECT에 `r.customer_id` 추가
  2. 모바일 조건을 `r.customer_id` → `r.customer_name`으로 변경 (이중 안전)

---

## 🎯 작업 2: Web Push 알림 시스템 (🟡 코드 완료, 배포 대기)

### 요구사항
- 모바일 PWA에 콜 생성 알림 (앱 닫혀 있어도 수신)
- 대상: 같은 회사 RIDER 전원
- 사용자 설정: 자동 ON (로그인 시 조용히 구독 시도)
- 알림 동작: 자동 사라짐 (`requireInteraction: false`)
- 진동: 짧게-쉬고-짧게-쉬고-짧게 패턴
- 소리: Android 시스템 기본 (채널 설정에 따름)
- 대상 기기: Android Chrome + 홈화면 설치 PWA

### 기술 스택
- **백엔드**: `web-push@^3.6.7` (node.js 패키지)
- **프론트**: Service Worker + Push API (웹 표준)
- **인증**: VAPID (Voluntary Application Server Identification)

### VAPID 키 (⚠️ 영구 보관)
```
Public Key:  BLnMotuYhMMTu54wRbExi4_oggYQrOgscjbDVZoPl_DE-2MQJGDTUyBSIsbOgx9XnDhb0tyQg6PnDcLpdggmJZk
Private Key: WSXfFD43Lud6HyfB7pu2UIDYa328FQuebpnP-Kc3tdk
Subject:     mailto:drivelogTC@gmail.com
```
- Public: 프론트 노출 OK (VAPID 프로토콜 특성상 공개키는 안전)
- Private: `.env`에만, 절대 git/프론트 금지
- 한 번 생성하면 영원히 사용 (재생성 시 기존 구독 전부 무효화됨)

### 신규 파일

**백엔드**
```
drivelog-admin/server/
├── db/migration_2026_04_15_push_subscriptions.sql   ← push_subscriptions 테이블 생성
├── utils/pushSender.js                              ← VAPID 초기화 + 발송 헬퍼
└── routes/push.js                                   ← subscribe/unsubscribe/test/public-key
```

**프론트**
```
drivelog-mobile/src/
└── utils/pushSubscribe.js                           ← 구독/해제 헬퍼
```

### 수정 파일

**백엔드**
- `drivelog-admin/server/package.json` — `web-push ^3.6.7` 의존성 추가
- `drivelog-admin/server/index.js` — push 라우트 등록, `initVapid()` 기동 시 호출, 버전 `v2.6 → v2.7`
- `drivelog-admin/server/routes/calls.js` — POST /api/calls 성공 후 `sendToCompanyRiders()` 호출 (fire-and-forget)

**프론트**
- `drivelog-mobile/public/sw.js` — `push` / `notificationclick` / `pushsubscriptionchange` 이벤트 리스너 추가, `CACHE_NAME: drivelog-v2.4`
- `drivelog-mobile/src/api/client.js` — `fetchPushPublicKey`, `subscribePush`, `unsubscribePush`, `testPush` 함수 추가
- `drivelog-mobile/src/App.jsx` — `enablePushNotifications` import, 로그인 시 `useEffect`로 자동 구독 시도

### 백업
- `C:\Drivelog\backup\20260415_push_notification\sw.js.backup` (수정 전 원본)

### DB 스키마

```sql
CREATE TABLE push_subscriptions (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  user_id BIGINT(20) NOT NULL,
  company_id BIGINT(20) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash VARCHAR(64) NOT NULL,      -- SHA-256, UNIQUE 인덱스용
  p256dh_key VARCHAR(255) NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_endpoint_hash (endpoint_hash),
  KEY idx_user_id (user_id),
  KEY idx_company_id (company_id),
  FK user_id → users.user_id ON DELETE CASCADE,
  FK company_id → companies.company_id ON DELETE CASCADE
)
```

**왜 endpoint_hash?** Web Push endpoint URL은 200~500자라 MySQL UNIQUE 인덱스에 직접 쓰기 부적합. SHA-256 hex(64자)로 해시해서 UNIQUE 처리. `endpoint` 원본은 TEXT 컬럼에 그대로 보관.

### API 엔드포인트 (신규)

| 메소드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/api/push/public-key` | public | VAPID 공개키 반환 (프론트 구독 생성용) |
| POST | `/api/push/subscribe` | authenticated | 구독 등록 (UPSERT) |
| POST | `/api/push/unsubscribe` | authenticated | 구독 해제 |
| POST | `/api/push/test` | authenticated | 본인 기기에 테스트 푸시 (디버깅) |

### 발송 흐름

1. SA가 콜 생성 (POST /api/calls) → DB 저장 + audit log
2. `sendToCompanyRiders(companyId, payload)` 호출 (await 안 걸림, fire-and-forget)
3. `push_subscriptions` 조회: 같은 회사 + 활성 RIDER/SUPER_ADMIN 의 모든 구독
4. `Promise.allSettled`로 병렬 발송
5. 만료(410/404) 구독은 자동 삭제
6. 성공 구독은 `last_used_at` 업데이트

### Service Worker push 이벤트 처리

- `event.data.json()` 파싱 → title, body, url, tag, callId
- `showNotification(title, { body, icon, badge, vibrate, tag, renotify, data })`
- `vibrate: [200, 100, 200, 100, 200]` — 짧게 3번 패턴
- `requireInteraction: false` — 자동 사라짐 (사장님 요청)
- 알림 클릭 시 → 열린 창 focus + `client.navigate(url)`, 없으면 `openWindow`

### 알림 페이로드 예시 (콜 생성 시)

```json
{
  "title": "🚗 새 콜 도착",
  "body": "양양읍 송암리 123 → 강현면 물치리 456\n예상 요금: 25,000원",
  "url": "/m/calls",
  "tag": "call-1234",
  "callId": 1234
}
```

---

## 📋 NAS 배포 절차 (다음 작업)

### 1. `.env` 수정
```bash
sudo vi /volume1/docker/drivelog/.env
```

파일 끝에 추가:
```env
# === Web Push (VAPID) ===
VAPID_PUBLIC_KEY=BLnMotuYhMMTu54wRbExi4_oggYQrOgscjbDVZoPl_DE-2MQJGDTUyBSIsbOgx9XnDhb0tyQg6PnDcLpdggmJZk
VAPID_PRIVATE_KEY=WSXfFD43Lud6HyfB7pu2UIDYa328FQuebpnP-Kc3tdk
VAPID_SUBJECT=mailto:drivelogTC@gmail.com
```

### 2. `docker-compose.yml` 수정 — api 서비스 `environment:` 블록에 3줄 추가
```bash
sudo vi /volume1/docker/drivelog/docker-compose.yml
```

```yaml
    environment:
      # ... 기존 항목들 ...
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM_NAME: ${SMTP_FROM_NAME}
      # Web Push (VAPID) - 2026-04-15 추가
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_SUBJECT: ${VAPID_SUBJECT}
```

### 3. 로컬 배포 (사장님 PC Git Bash)
```bash
cd /c/drivelog
npm run deploy:all
```

### 4. NAS에서 패키지 설치 + DB 마이그레이션
```bash
# web-push 패키지 설치
sudo docker exec drivelog-api npm install web-push

# DB 마이그레이션
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < /volume1/docker/drivelog/server/db/migration_2026_04_15_push_subscriptions.sql

# 테이블 생성 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  -e "SHOW CREATE TABLE push_subscriptions\G"
```

### 5. 컨테이너 재생성 (environment 반영 — **반드시 down/up**)
```bash
cd /volume1/docker/drivelog
sudo docker-compose down
sudo docker-compose up -d
```

⚠️ `docker-compose restart`로는 새 환경변수 안 들어감 (SMTP 때도 같은 함정)

### 6. 검증 체크리스트
```bash
# (a) VAPID 환경변수 주입 확인
sudo docker exec drivelog-api env | grep VAPID
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
# VAPID_SUBJECT=...

# (b) VAPID 초기화 로그 확인
sudo docker logs drivelog-api --tail 50 | grep push
# [push] VAPID 초기화 완료

# (c) API 버전 확인
curl -k https://192.168.0.2:8443/api/health
# {"status":"ok","version":"2.7",...}

# (d) VAPID 공개키 엔드포인트 확인
curl -k https://192.168.0.2:8443/api/push/public-key
# {"public_key":"BLnMotu..."}

# (e) push_subscriptions 테이블 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  -e "SELECT COUNT(*) FROM push_subscriptions"
# 0 (아직 구독 없음)
```

### 7. 브라우저 검증 (폰에서)
1. **폰 홈화면의 DriveLog 아이콘**으로 앱 실행 (일반 Chrome 탭 아님 — PWA 상태여야 함)
2. Ctrl+Shift+R 개념: Android Chrome 설정 → 앱 정보 → 저장공간 → 캐시 삭제 (또는 PWA 완전 재설치)
3. 로그인 → 브라우저가 "알림을 표시하시겠습니까?" 다이얼로그 → **허용**
4. DB에 구독 생성됐는지 확인:
   ```bash
   sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
     -e "SELECT id, user_id, company_id, LEFT(endpoint,60) AS endpoint_preview, created_at FROM push_subscriptions"
   ```
5. **테스트 푸시** 발송 (curl로 직접):
   ```bash
   # 먼저 토큰 받기
   TOKEN=$(curl -sk -X POST https://192.168.0.2:8443/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"company_code":"1012","login_id":"cblim","password":"11223344"}' \
     | jq -r '.accessToken')

   # 본인 기기에 테스트 푸시
   curl -sk -X POST https://192.168.0.2:8443/api/push/test \
     -H "Authorization: Bearer $TOKEN"
   ```
   → 폰에 "🔔 DriveLog 테스트 알림" 도착해야 함

6. **실제 콜 생성 테스트**: admin 웹에서 콜 생성 → 폰에 "🚗 새 콜 도착" 알림 + 진동 확인
7. **백그라운드 테스트**: 앱을 백그라운드로 보내거나 완전 종료 → 다시 콜 생성 → 알림 오는지 확인 (진짜 푸시의 위력)

---

## 🐛 트러블슈팅 가이드

### "알림 허용" 다이얼로그가 안 뜸
- PWA가 홈화면 설치 상태가 아닐 가능성. 일반 Chrome 탭에서는 동작하지만 설치 PWA가 더 안정적
- 이전에 거절한 이력 있음 → Android: 앱 정보 → 권한 → 알림 → 허용으로 수동 변경

### 구독은 등록됐는데 알림이 안 옴
- `sudo docker logs drivelog-api --tail 100 | grep push` 로그 확인
- `[push] 회사 3: 발송 N, 실패 0, 삭제 0` 같은 라인 있어야 정상
- 실패 다수면 VAPID 키 불일치 (프론트와 백엔드가 다른 키 사용) — 프론트는 `GET /api/push/public-key`로 받으니 불일치 불가능, 확실히 재발송 원인은 서버 측

### Service Worker가 업데이트 안 됨
- `CACHE_NAME: drivelog-v2.3 → v2.4` 로 변경했으므로 새 SW가 activate 시 기존 캐시 삭제됨
- 그래도 안 되면: Android Chrome → 설정 → 사이트 설정 → 모든 사이트 → DriveLog 도메인 → 데이터 삭제 후 재접속
- 또는 홈화면 아이콘 제거 후 재설치 (manifest scope 기억 초기화)

### `web-push` 패키지 설치 실패
- NAS에서 `sudo docker exec drivelog-api npm install web-push` 로그 확인
- 컨테이너가 read-only 파일시스템일 경우 이미지 재빌드 필요 (그런데 nodemailer는 이미 동일 패턴으로 추가했으니 이 경우는 아닐 가능성)

### Android 알림이 무음으로만 옴
- Android 알림 채널 설정 문제. 앱 정보 → 알림 → DriveLog 채널 → 소리/진동 ON
- 첫 알림 수신 시 Android가 채널을 자동 생성하므로, 허용 후 첫 알림은 기본값 적용됨

---

## 🧠 이번 세션 학습

### Web Push 아키텍처 이해
1. **VAPID 인증**: 서버가 자기 자신을 증명하는 공개키 암호. 공개키는 노출되어도 안전, 비공개키로 JWT 서명.
2. **Service Worker 필수**: 앱 닫혀 있어도 브라우저가 SW를 띄워서 push 이벤트 처리. PWA의 핵심.
3. **endpoint 고유성**: 구독마다 endpoint URL이 고유. 같은 기기에서도 SW 교체 시 endpoint 바뀔 수 있음 → UPSERT 패턴 필수.
4. **410 Gone 처리**: 사용자가 알림 거절/앱 삭제 시 endpoint가 무효화됨. 발송 시 410 오면 DB에서 삭제해야 구독 테이블이 안 썩음.

### fire-and-forget 패턴
- SMTP 비번찾기 때 확립한 패턴 재사용
- DB commit → 비동기 발송 (`.catch(err => log)`) → 응답 즉시 반환
- 발송 실패가 핵심 기능(콜 생성)을 깨지 않게 함

### DB 스키마 결정
- endpoint TEXT + endpoint_hash VARCHAR(64) UNIQUE 패턴
- 긴 URL을 UNIQUE 키로 쓸 수 없는 MySQL 제약 우회
- FOREIGN KEY ON DELETE CASCADE로 사용자/회사 삭제 시 자동 정리

### Service Worker 캐시 버전 관리
- `CACHE_NAME` 문자열 변경이 곧 SW 업데이트 신호
- `activate` 이벤트에서 옛 캐시 삭제
- 이것 안 하면 구 SW가 계속 캐시에서 fetch, 새 기능 반영 안 됨

### 실수 방지 메모
- docker-compose environment 블록 추가 후 **반드시 down/up** (restart 금지) — SMTP 때 배운 것 재확인
- VAPID 키는 한 번 생성 후 영구 사용 — 재생성하면 모든 기존 구독 무효화 (CATASTROPHIC)
- `useEffect` deps에 `user?.user_id` 쓴 이유: user 객체 전체 ref로 비교하면 렌더마다 트리거될 수 있음

---

## 📝 다음 세션 시작용 메시지 (복사용)

### A. 푸시 알림 배포 및 검증 재개
```
푸시 알림 NAS 배포 및 검증 진행.

먼저 아래 문서 읽고 시작:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_15_summary.md

VAPID 키는 이미 생성됨 (세션 요약 문서 참고).
배포 절차 6단계부터 진행하면 됨.
```

### B. 다른 작업
```
다른 작업 먼저 진행할게.

먼저 아래 읽고 시작:
- C:\Drivelog\CLAUDE_SESSION_GUIDE.md
- C:\Drivelog\session_2026_04_15_summary.md

오늘 작업: [주제]
```

---

## 🏢 양양대리 운영 현황 (변경 없음)

| 항목 | 값 |
|---|---|
| company_id | 3 |
| 회사 코드 | 1012 |
| 활성 고객 | 248명 |
| 활성 기사 | 30명 |
| API 버전 | v2.6 (배포 후 v2.7) |
| 비밀번호 찾기 | 배포 완료 |
| 마일리지 SMS 버튼 | ✅ 배포 완료 |
| 푸시 알림 | 🟡 코드 완료, 배포 대기 |

---

**작성**: 2026-04-15
**API 버전**: 현재 v2.6, 다음 배포 후 v2.7
**운영 영향**: 없음 (푸시 코드 배포 전, 로컬 소스만 수정됨)
