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
