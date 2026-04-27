# Session Summary — 2026-04-25

## 작업 개요
1. 콜 생성 페이지 레이아웃 변경 (admin + mobile)
2. 모바일에 Contact Picker API 추가 (연락처에서 1탭 선택)

---

## 작업 1: 콜 생성 모달 레이아웃 변경

### Admin (`drivelog-admin/client/src/pages/CallManage.jsx`)
**변경 전 순서**: 출발지/도착지 → 고객/제휴업체 → 요금/결제 → 기사 지명 → 메모

**변경 후 순서**: **고객/제휴업체 → 출발지/도착지** → 요금/결제 → 기사 지명 → 메모

신규 고객 즉시 등록 폼은 코드에 이미 존재(검색 결과 없을 때 자동 표시되는 인라인 폼).

### Mobile (`drivelog-mobile/src/pages/CallList.jsx` — SA 전용 콜 생성 모달)
**변경 전 순서**: 출발지 → 도착지 → 카카오지도 → 고객 → 제휴업체 → 요금/결제 → 메모 → 기사 지명

**변경 후 순서**: **고객 → 제휴업체 → 출발지 → 도착지** → 카카오지도 → 요금/결제 → 메모 → 기사 지명

추가된 코드:
- `createCustomer` API import
- state: `newCustPhone`, `newCustSaving`
- `handleCreateNewCustomer` 함수 (admin과 동일 로직)
- 검색 결과 없을 때 신규 고객 등록 인라인 폼 (이름, 전화번호, 등록 버튼)

---

## 작업 2: Contact Picker API (모바일 전용)

### 배경
- 사용자 요청: "특정 버튼 탭 → 폰 최근 통화에서 가져오기"
- 기술 제약: 웹 PWA는 OS 통화 기록 직접 접근 불가
- 대안: Contact Picker API로 "연락처에서 1탭 선택" 구현

### 추가된 코드 (`drivelog-mobile/src/pages/CallList.jsx`)

**가용성 체크**:
```js
const supportsContactPicker = typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
```

**핸들러** `handlePickContact`:
- `navigator.contacts.select(['name', 'tel'], { multiple: false })` 호출
- 사용자가 1명을 선택하면 이름/번호 받기
- 한국 폰 번호 정규화: `+82 10-1234-5678` → `010-1234-5678`
- 11자리: `010-XXXX-XXXX`, 10자리: `0XX-XXX-XXXX` 포맷
- 사용자 취소나 실패 시 조용히 무시 (console.warn만)

**UI**: 신규 고객 등록 폼의 "전화번호" 라벨 옆에 작은 버튼 "📞 연락처에서 가져오기"
- `supportsContactPicker`가 true일 때만 표시 (Android Chrome HTTPS 전용)
- iOS Safari, 데스크톱 등 미지원 환경에서는 버튼이 자동으로 숨겨짐
- 미지원 환경 사용자는 그대로 수동 입력 가능

### 동작 흐름 (Android Chrome)
1. SA가 콜 현황 → 우측 상단 "+ 콜 생성" 탭
2. 고객 검색창에 이름 입력 → 검색 결과 없음
3. 인라인 신규 등록 폼 펼쳐짐 (이름은 입력한 검색어로 자동 채움)
4. "📞 연락처에서 가져오기" 탭
5. OS 연락처 픽커 열림 → 1명 선택
6. 이름과 번호가 폼에 자동 입력됨 (필요시 수정 가능)
7. "+ 등록하고 선택" 탭 → 고객 신규 등록 + 자동 선택
8. 콜 생성 진행

---

## 백업
- `C:\Drivelog\backup\20260425_call_layout\NOTE.md` — 작업 메모
- `C:\Drivelog\backup\20260425_call_layout\CallManage_admin_20260425_BEFORE.jsx` — admin 원본
- `C:\Drivelog\backup\20260425_call_layout\CallList_mobile_20260425_BEFORE_HEADER.jsx` — mobile placeholder

---

## 배포 명령
백엔드 변경 없음, 프론트엔드만 배포:
```bash
cd /c/Drivelog
npm run deploy:admin
npm run deploy:mobile
```

---

## 검증 체크리스트

### Admin (PC 브라우저)
- [ ] 콜 관리 → "+ 콜 생성" 모달이 열림
- [ ] **고객/제휴업체가 출발지/도착지 위에 표시됨**
- [ ] 고객 검색창에 없는 이름 입력 시 신규 등록 폼이 인라인으로 펼쳐짐
- [ ] 등록 후 자동 선택되어 콜 생성 가능

### Mobile (Android Chrome HTTPS)
- [ ] 모바일 → 콜 현황 (SA 권한) → 우측 상단 "+ 콜 생성"
- [ ] **고객/제휴업체가 출발지/도착지 위에 표시됨**
- [ ] 고객 검색창에 없는 이름 입력 시 신규 등록 폼이 인라인으로 펼쳐짐
- [ ] 전화번호 라벨 옆에 "📞 연락처에서 가져오기" 버튼이 보임
- [ ] 버튼 탭 시 권한 요청 후 OS 연락처 픽커가 열림
- [ ] 연락처 1명 선택 시 이름/번호가 자동 채워짐
- [ ] 한국 번호 포맷(`010-XXXX-XXXX`)으로 정규화됨
- [ ] "+ 등록하고 선택" 탭 시 고객 등록 + 자동 선택됨

### Mobile (iOS Safari) — 미지원 환경 검증
- [ ] **"📞 연락처에서 가져오기" 버튼이 보이지 않음** (자동 숨김)
- [ ] 수동 입력은 정상 동작

---

## 다음 세션 메모
- v2.7 Web Push 알림 코드 미배포 상태(이전 세션에서 작성)
- PII Phase 2 진행 보류 중 (search-after-encryption 결정 대기)
- Gmail 앱 비밀번호 재발급 필요 (이전 노출됨)
