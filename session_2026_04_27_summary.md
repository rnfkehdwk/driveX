# Session Summary — 2026-04-27 (확장: tenants/ 폴더 도입)

## 이 세션에서 완료한 작업 (총 5건)

### 작업 1: 콜 생성 모달 레이아웃 변경 (admin + mobile)
✅ 고객/제휴업체를 출발지/도착지 위로 이동 (admin + mobile 양쪽)
✅ Mobile에 신규 고객 즉시 등록 인라인 폼 추가

### 작업 2: Contact Picker API 추가 (mobile)
✅ Android Chrome HTTPS 환경에서 "📞 연락처에서 가져오기" 버튼
✅ 한국 폰 번호 정규화 (+82 → 010)
✅ 미지원 환경 자동 폴백 (버튼 숨김)

### 작업 3: tenants/ 폴더 구조 도입 (admin)
✅ 양양대리 특화 설정/코드를 한 곳에 모아 코드 이슈 추적 용이성 확보
✅ attendance, mileage, brand 3석션 config
✅ 5,000원 단위 검증까지 config로 옮긴 일관성 마무리

### 작업 4: tenants/ 폴더 구조 도입 (mobile)
✅ admin과 동일 패턴으로 mobile에도 적용
✅ MileageUseSelect의 5000원 단위 하드코딩 → config 참조
✅ RideNew의 earnPct={10} 하드코딩 → config 참조

### 작업 5: 카카오 키 환경변수 분리 ← 이번 세션에서 신규 추가
✅ REST/JS 키 5곳을 소스 코드에서 분리
✅ mobile + admin에 .env / .env.example 생성
✅ .gitignore 업데이트 (프론트 .env 보호)
✅ 시스템 전체 단일 키 (업체별 분리 안 함)

---

## tenants/ 폴더 구조 — 상세

### 신규 파일 (4개)

```
drivelog-admin/client/src/
├── tenants/
│   ├── _common/
│   │   └── config.js          ← 모든 업체 기본값 (fallback)
│   ├── yangyang/
│   │   └── config.js          ← 양양대리 (company_id=3) 특화
│   └── index.js               ← company_id → config 매핑 진입점
└── hooks/
    └── useTenantConfig.js     ← React 훅 (현재 user의 company_id로 자동 조회)
```

### config 스키마

```javascript
{
  attendance: {
    minHourUnit: 1,        // 양양대리: 0.5
    showHalfHour: false,   // 양양대리: true
    maxHours: 24,
  },
  mileage: {
    adjustStepWon: 1000,   // 마일리지 수동 조정 단위 (input step)
    useUnitWon: 1000,      // 양양대리: 5000 (운행 시 사용 단위)
  },
  brand: {
    shortName: '대리업체', // 양양대리: '양양대리' (카톡 공유, 인쇄 헤더)
  },
}
```

### 양양대리 적용값

```javascript
// tenants/yangyang/config.js
{
  attendance: { minHourUnit: 0.5, showHalfHour: true, maxHours: 24 },
  mileage:    { adjustStepWon: 1000, useUnitWon: 5000 },
  brand:      { shortName: '양양대리' },
}
```

---

## 수정된 페이지 (3개)

### Attendance.jsx
- 하드코딩된 `HOUR_OPTIONS` (0.5h × 48단계) → `buildHourOptions(config.attendance.minHourUnit, config.attendance.maxHours)` 동적 생성
- 안내 문구 "0.5시간 단위" → "{minHourUnit}시간 단위"
- 라벨 "0.5h 단위" → "{minHourUnit}h 단위"

**양양대리 동작**: minHourUnit=0.5, maxHours=24 → 옵션 49개(0, 0.5, 1, ..., 24) — 기존과 동일
**일반 업체 동작**: minHourUnit=1 → 옵션 25개(0, 1, ..., 24)

### Mileage.jsx
- 마일리지 수동 조정 input의 `step="1000"` → `step={tenantConfig.mileage.adjustStepWon}`
- **submitAdjust의 5,000원 단위 경고 (`amt % 5000 !== 0`) → `amt % tenantConfig.mileage.useUnitWon !== 0`**
- 메시지도 동적: `${useUnit.toLocaleString()}원 단위가 아닙니다...`

**양양대리 동작**: useUnitWon=5000 → 메시지 "5,000원 단위가 아닙니다..." (toLocaleString 덕분에 메시지까지 완전 동일)
**일반 업체 동작**: useUnitWon=1000 → 메시지 "1,000원 단위가 아닙니다..."

### FareSettlement.jsx
- 하드코딩된 `'대리업체'` 5곳 모두 → `fallbackBrand = tenantConfig.brand.shortName`
- `buildShareText` 함수에 `fallbackName` 인자 추가
- DailyTab과 MonthlyTab 각각에서 `useTenantConfig()` 호출

**양양대리 동작**: brand.shortName="양양대리" → 회사명 못 가져왔을 때 폴백이 "대리업체" → "양양대리"로 개선됨 (양양대리 사용자에게는 사실상 상시 정확하게 표시됨)

---

## 새 업체 추가 절차

향후 다른 대리업체가 가입하면:

1. **DB**: 업체 등록 (이미 자동, `companies` 테이블에 INSERT)
2. **(선택)** 특화 설정이 필요하면:
   - `tenants/seorak/config.js` 생성 (양양 config 참고)
   - `tenants/index.js`의 `TENANT_CONFIGS`에 매핑 추가
     ```js
     const TENANT_CONFIGS = {
       3: yangyangConfig,
       7: seorakConfig,    // ← 추가
     };
     ```
3. **특화 설정 없으면** 자동으로 `_common/config.js`(기본값) 적용 — 코드 변경 불필요

---

## 백업 위치
- `C:\Drivelog\backup\20260427_tenants\NOTE.md` (admin)
- `C:\Drivelog\backup\20260427_tenants\Attendance_20260427_BEFORE.jsx` (전체 원본)
- `C:\Drivelog\backup\20260427_tenants\Mileage_20260427_BEFORE_NOTE.jsx` (placeholder, git에서 복원)
- `C:\Drivelog\backup\20260427_tenants\FareSettlement_20260427_BEFORE_NOTE.jsx` (placeholder, git에서 복원)
- `C:\Drivelog\backup\20260427_mobile_tenants\NOTE.md` (mobile)
- `C:\Drivelog\backup\20260427_mobile_tenants\MileageUseSelect_20260427_BEFORE.jsx` (전체 원본)
- `C:\Drivelog\backup\20260427_mobile_tenants\RideNew_20260427_BEFORE_NOTE.jsx` (placeholder)

---

## 배포 명령

이번 세션 모든 작업이 admin + mobile 프론트엔드에 영향:

```bash
cd /c/Drivelog
npm run deploy:admin      # CallManage.jsx + Attendance.jsx + Mileage.jsx + FareSettlement.jsx + tenants/
npm run deploy:mobile     # CallList.jsx
```

백엔드 변경 없음. `deploy:server` 불필요.

---

## 검증 체크리스트

### 작업 1 + 2 (콜 생성, Contact Picker)
- [ ] Admin 콜 관리 — 고객/제휴업체가 출발지/도착지 위에 표시
- [ ] Admin — 검색 결과 없을 때 신규 등록 폼 펼쳐짐
- [ ] Mobile (Android Chrome HTTPS) — 콜 현황 SA → "+ 콜 생성"
- [ ] Mobile — 신규 고객 등록 폼에 "📞 연락처에서 가져오기" 버튼
- [ ] Mobile — 버튼 탭 → OS 연락처 픽커 → 1명 선택 → 자동 입력
- [ ] Mobile (iOS Safari) — 버튼 자동 숨김, 수동 입력 정상

### 작업 3 (tenants/)
- [ ] Attendance — 0.5h 단위 옵션 그대로 (양양대리 동작 변화 없음)
- [ ] Attendance — "0.5시간 단위" 안내 문구 그대로
- [ ] Mileage — 수동 조정 input step 1000원 그대로
- [ ] FareSettlement — 카톡 공유 시 "[양양대리] 운임정산서" 형식
- [ ] FareSettlement — 인쇄 헤더에 "양양대리 운임정산서" / "양양대리 2026-04 월별 정산서"
- [ ] 콘솔 에러 없는지 확인 (특히 import 경로)

---

## 다음 단계 (이후 세션)

### tenants/ 확장 가능성
- 다른 페이지에서도 양양대리 특화 패턴 발견 시 config로 이전
  - 예: 결제구분 코드 매핑(이미 DB), 마일리지 사용 단위(useUnitWon — 백엔드에서 사용)
- mobile에도 동일 구조 도입 검토 (`drivelog-mobile/src/tenants/`)
- 백엔드 server에도 동일 구조 도입 시 양양대리 5,000원 단위 검증 등 백엔드 로직 분리 가능

### 향후 슬러그 도입 (필요 시)
- `companies.slug VARCHAR(30) UNIQUE NULL` 컬럼 추가
- 라우터에 `/:tenant?` prefix 옵션 추가
- 단, 양양대리는 slug=NULL 유지하여 URL 변경 없음

### 보류된 작업 (이전 세션에서)
- ~~v2.7 Web Push 알림 코드 미배포 상태~~ → ✅ **이미 대포됨 (NAS 체크 결과 확인)**
- ~~PII Phase 2 진행 보류 중~~ → ⏸ **진행 안 함 (사장님 결정)**
- ~~Gmail 앱 비밀번호 재발급 필요~~ → ✅ **완료**

---

## 🧪 Chrome MCP 자동 테스트 결과 (2026-04-27 석 배포 후 수행)

이번 세션의 다섯 가지 작업을 양양대리 운영 환경에서 실제 검증.

### 검증 이력 요약

| 작업 | 검증 항목 | 결과 |
|---|---|---|
| 1 | Admin 콜모달: 고객/제휴업체 위로 이동 확인 | ✅ |
| 1 | Admin: "테스트신규고객12345" 타입 → 인라인 등록 폼 펼쳐짐 | ✅ |
| 2 | Mobile 콜모달: 고객/제휴업체 위로 이동 | ✅ |
| 2 | Mobile: 신규 고객 등록 폼 정상 | ✅ |
| 2 | Contact Picker: 데스크톱에서 supportsContactPicker=false → 버튼 자동 숨김 | ✅ |
| 3 | Admin Attendance: 근무시간 셀렉트 49개 옵션 (0, 0.5, 1, ..., 24) | ✅ |
| 3 | Admin Attendance 라벨: "근무시간 (0.5h 단위)" | ✅ |
| 3 | Admin Mileage 수동조정 input: step="1000" | ✅ |
| 3 | Admin Mileage 3000원 입력 → "5,000원 단위가 아닙니다" 다이얼로그 | ✅ |
| 3 | Admin FareSettlement 월별 공유: "📊 [양양대리] 2026-04 월별 정산" 출력 | ✅ |
| 3 | Admin FareSettlement print-only h1: "양양대리 운임정산서" | ✅ |
| 4 | Mobile MileageUseSelect: 5000원 단위 칩 [0, 5000, 10000, 15000, 20000, 25000] | ✅ |
| 4 | Mobile RideNew: earnPct=10 → (25000-5000)×0.10 = 2000원 예상 적립 표시 | ✅ |
| 5 | 카카오 REST: "양양시청" 검색 → 속초시청 관련 14.7km 결과 정상 | ✅ |
| 5 | 카카오 JS SDK: %VITE_KAKAO_JS_KEY% 치환 + window.kakao.maps 로드 성공 | ✅ |
| 5 | 카카오 미니맵: 속초시청 위치 + "출발" 마커 렌더링 정상 | ✅ |
| - | API 버전: v2.7 운영 중 (Web Push 포함) | ✅ |
| - | 콘솔 에러: admin/mobile 모두 0건 | ✅ |
| - | 양양대리 사용자 경험 변화: 0% (FareSettlement fallback은 "대리업체"→"양양대리"로 개선) | ✅ |

### 핵심 증거
- 양양대리 config가 정확히 적용됨 (mileage.useUnitWon=5000, mileage.earnPct=10, attendance.minHourUnit=0.5, brand.shortName="양양대리")
- 데스크톱 고객 잠재적 접근에 대한 Contact Picker 가용성 체크가 정확하게 False로 판정되어 버튼이 숨겨짐 (Android Chrome에서만 노출될 것)
- 카카오 키 환경변수 분리 후에도 실제 API 호출 및 SDK 로드 정상

---

## 🔮 이후 세션에서 고려할 수 있는 작업

### 푸시 실제 동작 검증 (Web Push)
- v2.7은 배포되었으나 실제 구독이 되었는지 push_subscriptions 테이블 조회 필요
- Android Chrome PWA에서 구독 권한 다이얼로그 뜨는지
- 실제 콜 생성 시 기사 폰에 알림 도착하는지

### Mobile Contact Picker 실제 동작 검증
- Android Chrome HTTPS에서 "📞 연락처에서 가져오기" 버튼 실제 노출 확인
- 버튼 탭 → OS 연락처 픽커 동작
- 한국 번호 정규화 (+82 → 010)

### tenants/ 확장 가능성
- 다른 페이지에서도 양양대리 특화 패턴 발견 시 config로 이전
  - 예: 결제구분 코드 매핑, 시급 12,000원 등 (이미 DB에 있으나 코드에서 참조 방식 일관성 점검)
- 백엔드 server에도 동일 구조 도입 시 양양대리 5,000원 단위 검증 등 백엔드 로직 분리 가능

### 새 업체 추가 준비
- companies.slug 컴럼 추가 (필요 시 URL 분리용 인프라)
- 실제 새 업체 가입 시 tenants/{slug}/config.js 생성 및 index.js 매핑 추가

---

# 🌙 달아서 세션 (2026-04-27 밤 ~ 2026-04-28 새벽)

## 추가로 완료한 작업 (총 4건)

다음날 아침까지 이어진 세션에서 추가 작업 다수 수행.

---

### 작업 6: 콜 수락 취소 시 대기 복구 버그 수정 (backend)

**문제**: SUPER_ADMIN(사장님)이 모바일에서 직접 콜 수락 → 수락 취소를 눌러도 콜이 CANCELLED로 영구 취소되고 다른 기사에게 다시 노출되지 않음.

**원인**: `PUT /api/calls/:id/cancel` 엔드포인트가 역할 기준으로만 분기. RIDER만 WAITING으로 복구, 나머지(SA 포함)는 무조건 CANCELLED.

**해결**: `drivelog-admin/server/routes/calls.js` 분기 기준을 "역할"에서 "본인이 수락한 콜인가"로 변경:
- 본인 수락 콜 (ASSIGNED/IN_PROGRESS && assigned_rider_id === me) → WAITING 복구 (RIDER, SUPER_ADMIN 동일)
- 그 외 SA/MASTER → CANCELLED 영구 취소
- audit log에 CALL_RELEASE / CALL_CANCEL 구분 기록 추가
- CANCELLED 중복 취소 방어 (400)

**백업**: `C:\Drivelog\backup\calls_20260427_1104.js`

---

### 작업 7: 모바일 SA 고객 수정 기능 (mobile)

**문제**: 모바일 고객 조회 화면에서 SA 계정이 고객을 수정할 수 없음 (단순 조회만 가능했던 이유: 원래 기사용 PWA로 설계되었고 SA는 admin 웹에서 수정하는 구조였음).

**해결**: 동일 세션에서 이어진 Contact Picker 확장과 병행.

#### 변경 파일 (3개)
| 파일 | 변경 |
|---|---|
| `drivelog-mobile/src/api/client.js` | `updateCustomer(id, body)` 함수 추가 |
| `drivelog-mobile/src/pages/CustomerNew.jsx` | 연락처 라벨 옆에 픽커 버튼 추가 (Android Chrome HTTPS 한정) |
| `drivelog-mobile/src/pages/CustomerList.jsx` | SA/MASTER 한정 카드 탭 → 수정 모달, 모달에 픽커 버튼 포함 |

#### 권한 정책
- 고객 수정은 SA/MASTER만 가능 (백엔드 PUT /customers/:id 권한 그대로)
- RIDER에게는 모바일에서도 수정 버튼/액션 비노출 (카드 cursor: default, 탭 핸들러 없음, `›` 화살표 없음)
- 백엔드 customers.js 변경 없음

**백업**: `C:\Drivelog\backup\20260427_mobile_customer_edit\`

---

### 작업 8: PWA 캐시 자동 갱신 인프라 구축 (mobile)

**문제**: PWA(홈화면에 추가된 앱) 사용자는 새 빌드 배포해도 옛 캐시된 코드가 계속 뜨면서 새 기능이 반영 안 됨. Contact Picker 이전부터 떨어져있던 문제가 이번에 고객 조회 수정 작업 검증 시 드러남.

**근본 원인**:
1. sw.js의 `CACHE_NAME = 'drivelog-v2.4'` 고정 → 빌드해도 sw.js가 안 바뀌면 브라우저가 새 SW를 안 받음
2. HTML이 SW에 의해 캐시됨 → 새 JS 해시 파일명을 못 알게 됨
3. SW 업데이트 체크가 안 일어남 → PWA가 백그라운드에 살아있으면 영원히 옛 버전

**해결 전략 (1~4번 + 5번 적용)**:
1. `__BUILD_ID__`를 sw.js에 자동 주입 (vite plugin) → 매 빌드마다 sw.js 자체 변경
2. HTML은 SW 캐시 대상에서 완전 제외 (`fetch: cache: 'no-store'`)
3. SW 등록 후 60분마다 + visibilitychange 복귀 시 `registration.update()`
4. 새 SW 설치 완료 시 메인 앱에 메시지 (`drivelog:sw-update-ready` CustomEvent)
5. App.jsx의 `UpdateToast` 컴포넌트가 "✨ 새 버전이 설치되었어요 [새로고침]" 표시 → 사용자 동의 후 SKIP_WAITING → controllerchange → 자동 reload

#### 변경 파일 (4개)
| 파일 | 변경 |
|---|---|
| `drivelog-mobile/vite.config.js` | `__BUILD_ID__` define + `injectSwBuildId` plugin (writeBundle 후처리로 sw.js 치환) |
| `drivelog-mobile/public/sw.js` | v3.0 — BUILD_ID 기반 CACHE_NAME, HTML network-only, JS/CSS cache-first (해시 파일명), SKIP_WAITING 메시지 핸들러 |
| `drivelog-mobile/index.html` | SW 등록 후 60분 polling, visibilitychange 시 update, controllerchange 자동 reload |
| `drivelog-mobile/src/App.jsx` | `UpdateToast` 컴포넌트 추가 + `<UpdateToast />` 마운트 |

#### 동작 매커니즘
```
[빌드]
  vite build → injectSwBuildId가 sw.js의 __BUILD_ID__ 자리에 타임스탬프(36진) 주입
          → 매 빌드마다 sw.js 파일 자체가 변함

[사용자 PWA]
  60분/포커스 시 → registration.update() → 새 SW 자동 다운로드 + 설치
          → 'installed' 상태 + controller 존재 시 dispatchEvent('drivelog:sw-update-ready')
          → UpdateToast 표시
          → 사용자 [새로고침] 탭
          → reg.waiting.postMessage('SKIP_WAITING') → SW 즉시 활성화
          → controllerchange → window.location.reload()
          → 새 index.html → 새 JS 해시 파일명 로드
```

#### 사용자 UX 보호
- 입력 도중 갑자기 reload 안 됨 (토스트로 동의 요청)
- 토스트 [✕] 닫아도 임시 사라질 뿐, 다음에 PWA 다시 열 때 자동 반영
- 첫 설치 시에는 토스트 안 뜸 (controller 없을 때 쪽게만 trigger)

#### 최초 1회 수동 조치 (폰)
기존 PWA에는 옛 SW(`drivelog-v2.4`)가 깔려있어 이번 한 번만 완전 재설치 필요:
1. PWA 아이콘 길게 눌러 제거
2. Chrome 설정 → 사이트 설정 → `rnfkehdwk.synology.me` → 저장공간 삭제
3. (권장) `chrome://serviceworker-internals/`에서 Unregister
4. Chrome 완전 종료 → 재실행 → 새로 접속 → "홈화면에 추가"

이후 모든 배포는 PWA 에서 자동 반영 (최대 60분 이내 또는 앱 포커스 시 즉시).

**백업**: `C:\Drivelog\backup\20260427_pwa_cache_fix\`

---

### 작업 9: Contact Picker 통일 — 나머지 입력 화면 포함 (mobile)

**문제**: 이전 Contact Picker 작업에서 고객 관련 3곳만 적용 → 사용자 궁극 의도는 "전화번호 입력하는 모든 곳". 기사 등록, 제휴업체 등록/수정에도 필요.

**해결**: 다른 화면 2곳에도 동일 패턴 적용.

#### 변경 파일 (2개)
| 파일 | 변경 |
|---|---|
| `drivelog-mobile/src/pages/RiderNew.jsx` | `normalizeKoreanPhone`, `supportsContactPicker`, `handlePickContact` 추가, phone 칸 옆 파란색 픽커 버튼 |
| `drivelog-mobile/src/pages/PartnerList.jsx` | 동일 패턴, 모달안 phone 칸 옆 보라색 픽커 버튼 (페이지 테마 일치). 등록/수정이 같은 모달 공유라 한 번에 양쪽 적용 |

#### 화면별 값 채우기 동작
| 화면 | 픽커 선택 시 채우는 필드 | 이유 |
|---|---|---|
| 고객 등록 (CustomerNew, CallList 인라인) | name + phone (이름 비어있을 때) | 이름 = 고객 이름 |
| 고객 수정 (CustomerList 모달) | phone만 | 수정 모달, 이름 이미 채움 |
| 기사 등록 (RiderNew) | name + phone (이름 비어있을 때) | 이름 = 기사 이름 |
| 제휴업체 (PartnerList) | phone + contact_person (담당자 비어있을 때) | name은 *업체명*, 픽커의 사람 이름은 담당자로 감 |

#### 적용 완료 후 전체 위치 (5곳)
1. 콜 생성 모달 → 신규 고객 인라인 등록 (CallList.jsx) — 세션 1
2. 고객 등록 페이지 (CustomerNew.jsx) — 세션 2 작업 7
3. 고객 조회 → SA 한정 카드 탭 → 수정 모달 (CustomerList.jsx) — 세션 2 작업 7
4. 기사 등록 페이지 (RiderNew.jsx) — 세션 2 작업 9
5. 제휴업체 등록/수정 모달 (PartnerList.jsx) — 세션 2 작업 9

**백업**: `C:\Drivelog\backup\20260427_picker_extension\`

---

## 달아서 세션 배포 명령

```bash
cd /c/drivelog
npm run deploy:server   # 작업 6 — calls.js cancel 분기 수정
npm run deploy:mobile   # 작업 7, 8, 9 — 모바일 전반
```

또는 `npm run deploy:all` 한 방에.

배포 로그에서 확인해야 하는 핵심 메시지:
```
[inject-sw-build-id] sw.js BUILD_ID = lz4q8k    ← 매 배포마다 다름
```

---

## 달아서 세션 검증 체크리스트

### 작업 6 — 콜 수락 취소
- [ ] SA 모바일에서 콜 직접 수락 → 수락 취소 → 해당 콜이 다시 대기 목록에 뜨고, 다른 기사도 볼 수 있음
- [ ] RIDER가 콜 수락 → 수락 취소 → 동일하게 대기 복구 (기존 동작 유지)
- [ ] SA가 대기 중 콜에서 "취소" 클릭 → CANCELLED 영구 취소 (기존 동작 유지)
- [ ] RIDER가 남의 수락 콜 취소 시도 → 403 거부 (기존 동작 유지)

### 작업 7 — 모바일 고객 수정
- [v] SA 모바일 고객 조회 → "탭하여 수정" 안내 + `›` 화살표 표시
- [v] 카드 탭 → 수정 모달 열림 + 기존 값 미리 채움
- [v] 이름/연락처/주소/메모 수정 후 저장 → 목록 반영
- [v] RIDER는 카드 탭해도 모달 안 열림 (수정 불가)

### 작업 8 — PWA 캐시 자동 갱신
- [v] 폰 PWA 1회성 재설치 후 새 코드 정상 로드
- [ ] 다음 배포 후 60분 이내 또는 앱 포커스 시 "✨ 새 버전이 설치되었어요" 토스트 자동 표시
- [ ] [새로고침] 버튼 탭 → 자동 reload → 새 코드 적용
- [ ] 첫 설치 시에는 토스트 안 뜨는지 확인

### 작업 9 — Contact Picker 통일
- [v] 고객 조회 수정 모달에서 픽커 버튼 동작 (세션 2 작업 7에서 검증 완료)
- [v] 고객 등록 페이지에서 픽커 버튼 동작 (세션 2 작업 7에서 검증 완료)
- [ ] 기사 등록 (`/m/rider/new`) → 연락처 옆 파란색 픽커 버튼 → 탭 → 이름+번호 자동 채움
- [ ] 제휴업체 관리 → "+ 등록" 또는 기존 항목 탭 → 모달의 연락처 옆 보라색 픽커 버튼 → 탭 → 번호+담당자 자동 채움

---

## 달아서 세션 교훈 (이후 세션에서 기억할 것)

### 교훈 1: "전화번호 입력하는 모든 곳"은 자명하지 않다
이번 세션 작업 7에서 Contact Picker를 "고객 관련 화면 3곳"으로 적용했으나, 사용자 의도는 "모든 곳"이었음. 작업 9에서 그 누락이 드러나 추가 2곳 더 적용.

**함의**: 다음에 "X 기능을 모든 Y에 적용" 요구가 오면 **작업 전 전수 조사 결과 리스트를 명시적으로 확인받을 것**:
- "전화번호 입력 화면 모두 조사 결과 고객·기사·제휴업체 5곳 나왔습니다. 이 모두에 적용할까요?"

### 교훈 2: PWA 캐시 문제는 "코드는 맞은데 안 보임" 패턴으로 나타남
세션 1에서 Contact Picker 코드를 추가했으나 사용자가 "한 번도 안 보였다"고 함. 대부분 PWA 캐시 문제임. NAS에 코드는 정상 있으나 PWA에는 옛 널이 박혀 있음.

**진단 방법**:
1. NAS에서 `grep -o "키워드" assets/*.js | wc -l`  — `grep -c`는 minify된 한줄 파일을 1로 세서 잘못된 수치가 나옴
2. 일반 Chrome 탭 시크릿에서 검증 → 보이면 PWA 캐시 확정
3. 이번 작업 8의 자동 갱신 인프라가 들어가 있으므로 앞으로는 다시 발생하지 않을 것

### 교훈 3: minified JS에 `grep -c`는 항상 1
```bash
# 잘못된 방법
grep -c "연락처에서 가져오기" assets/index-*.js   # 항상 1 나옴 (라인 컴)

# 올바른 방법
grep -o "연락처에서 가져오기" assets/index-*.js | wc -l   # 실제 등장 횟수
```

### 교훈 4: vite plugin으로 writeBundle 후처리는 public/ 정적 파일에도 동작
sw.js는 `public/` 폴더에 있어서 단순 복사됨. transform 훅은 안 먹으므로 `writeBundle` 훅에서 출력 폴더의 파일을 찾아 직접 readFile/writeFile로 치환해야 함. 이 패턴은 앞으로 다른 정적 파일 동적 치환에도 재사용 가능.

---

## 달아서 세션 배포 후 명시적 1회성 조치 (사용자)

### 폰에서 기존 PWA 완전 재설치 (한 번만)
이번 PWA 캐시 인프라 최초 적용 시에는 옛 SW(`drivelog-v2.4`)가 새 SW 메커니즘을 모르므로 **단 한 번만** 수동 조치 필요:

```
1. 홈화면 PWA 아이콘 기게 눌러 제거
2. Chrome 메뉴 → 설정 → 사이트 설정 → rnfkehdwk.synology.me → 저장공간 삭제
3. (권장) chrome://serviceworker-internals/ 에서 rnfkehdwk Unregister
4. Chrome 완전 종료 (최근 앱 목록에서 스와이프)
5. Chrome 재실행 → https://rnfkehdwk.synology.me:38443/m/ → 로그인 → 홈화면에 추가
```

이후 변경은 모두 자동 반영 (최대 60분 이내 또는 앱 포커스 시 즉시).

---

## 달아서 세션 이후 다음 단계

### 단기 (다음 세션 추천)
- [ ] 작업 6 검증 체크리스트 완료 (콜 수락 취소 동작)
- [ ] 작업 9 검증 체크리스트 완료 (기사/제휴업체 픽커)
- [ ] PWA 자동 갱신 실제 동작 관찰 (다음 배포 후 토스트 뜨는지)

### 중기
- [ ] PII Phase 2 재개 결정 (경험 있는 개발자 조언 이후)
- [ ] PHASE1 (볼륨 암호화 + DB 포트 차단) — 개발 주기 끝

### 참고
- diag.html은 운영에 영향 없이 남겨둔 상태 (향후 브라우저 환경 디버깅에 재활용 가능)
- 필요 시 제거: `drivelog-mobile/public/diag.html`

