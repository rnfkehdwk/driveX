# DriveLog 세션 요약 — 2026-04-29

> **이전 세션**: `session_2026_04_28_summary.md` — 4월 28일 데이터 전체 재마이그레이션 (운행 1,258건, 잔액 2,821,200원, 미매칭 76% 해결)
> **이번 세션 주제**: 3가지 버그 픽스 (지도 검색, 콜→운행 강제 클릭, 모바일 SA 기사 조회 메뉴) + .env 일원화 + ⭐ 즐겨찾기 고객별 특화 복원
> **상태**: ✅ 코드 변경 완료, 사용자 배포는 일부만 완료. **전체 검증은 4-30 진행 예정**

---

## 🐛 픽스한 버그

### 버그 1: 지도 검색이 빈 화면 (모바일 + 관리자 모두) ✅ 배포 완료, 동작 확인됨

**근본 원인**: `drivelog-mobile/.env`와 `drivelog-admin/client/.env` 파일이 **없어서** `VITE_KAKAO_REST_KEY`가 `undefined`로 빌드됨. 빌드된 JS 분석 결과 `KakaoAK undefined` 헤더로 카카오 API 호출 → 401 → 결과 0건.

증상: 검색어 입력해도 결과가 아예 안 나옴 (빈 화면)

**해결 (최종)**:
- 처음엔 두 프로젝트에 각각 `.env` 만들었으나, 사용자 요청으로 **루트 단일 `.env`로 통합**
- `vite.config.js`에서 `loadEnv` + `define`으로 명시 주입 (envDir만으로는 일부 환경에서 `import.meta.env` 주입 실패하는 이슈 회피)
- `import.meta.env.VITE_*`는 esbuild가 점이 포함된 식별자를 통째로 치환하지 못해 또 실패 → 별도 전역 변수 `__KAKAO_REST_KEY__`, `__KAKAO_JS_KEY__`로 주입하고 코드에서 그 변수 참조

**진단 핵심**:
- 빌드된 `dist/assets/index-*.js`에서 `const Ti=void 0;` + `KakaoAK ${Ti}` 발견 → 환경변수 미주입 확정
- 마지막 빌드에서 `5bfc2766bfe2836aab70ff613c8c05be` 키가 빌드 결과에 박혀있음을 grep으로 확인

**카카오 키 (infoData.md 참고)**: REST `5bfc2766bfe2836aab70ff613c8c05be`, JS `b1e43fe40464bf365f6122749187c09a`

---

### 버그 2: 콜에서 운행일지 진입 시 출발/도착 강제 클릭 요구 ✅ 배포 완료, 검증 대기

**근본 원인 (2가지)**:
1. `calls` 테이블에 lat/lng 컬럼이 없음 → 콜 생성 시 좌표 미저장
2. `RideNew.handleSave`가 `if (!form.started_at)` 으로 막음 → fromCall 진입 시 started_at 비어 있어서 GPS 버튼 강제

**해결 방식 (옵션 A)**: `RideNew.jsx`에서 콜 진입 시 좌표 유무 무관하게 `started_at`을 현재 시각으로 자동 채움. 운임/고객 정보가 콜에서 이미 넘어왔으니 시각만 자동 보충.

```jsx
// 변경 전: started_at: hasStartCoord ? now : '',
// 변경 후: started_at: now,
//        ended_at: hasEndCoord ? now : '',
```

**옵션 B(거부)**: calls 테이블에 lat/lng 컬럼 추가 → DB 마이그레이션 필요. lat/lng는 운행에 필수가 아니라서 옵션 A 채택.

---

### 버그 3: 모바일 SA에 기사 조회 메뉴 없음 ✅ 배포 완료, 검증 대기

**현황 분석**:
- 모바일에 `RiderNew.jsx`(등록)는 있는데 `RiderList.jsx`(조회/수정)는 없었음
- 백엔드 `GET /api/users` (q, role 필터링) + `PUT /api/users/:id` 이미 잘 갖춰져 있음 (MASTER + SUPER_ADMIN)
- 모바일 `client.js`에 `updateUser`, `issueTempPassword` 누락

**구현**:

1. **`drivelog-mobile/src/api/client.js`**: `updateUser`, `issueTempPassword` 함수 추가
   ```js
   export const updateUser = (id, b) => api.put(`/users/${id}`, b).then(r => r.data);
   export const issueTempPassword = (id) => api.post(`/users/${id}/issue-temp-password`).then(r => r.data);
   ```

2. **`drivelog-mobile/src/pages/RiderList.jsx`** 신규 생성
   - 기사 목록 조회 (검색 가능: 이름/로그인ID/연락처)
   - 통계 (활성/정지 카운트)
   - 카드 탭 → 수정 모달
   - 수정 가능 항목: 이름, 연락처, 이메일, 차량번호, 차종
   - 📞 연락처에서 가져오기 버튼 (Contact Picker API, Android Chrome 한정)
   - 활성/정지 토글 버튼
   - role=RIDER만 필터링 (SA의 본인 회사 소속)

3. **`drivelog-mobile/src/App.jsx`**: `/rider/list` 라우트 추가, `RiderList` import

4. **`drivelog-mobile/src/pages/Home.jsx`**: '기사 조회' 메뉴 추가
   - 라벨: "기사 조회" / 아이콘: 👥 / 색: `#0e7490` / `#cffafe`
   - 권한: `['MASTER', 'SUPER_ADMIN']` / 위치: '기사 등록' 바로 아래

---

## 🔄 .env 일원화 (16:20)

사용자 요청으로 **루트 .env 하나로 통합** (Vite envDir + loadEnv + define):

### 변경 사항
- `C:\Drivelog\.env` 신규 생성 (마스터 파일)
- `C:\Drivelog\.env.example` 신규 생성
- `drivelog-mobile/vite.config.js` 와 `drivelog-admin/client/vite.config.js` 모두 `loadEnv` + `define`으로 명시 주입하도록 재작성
- 두 프로젝트의 하위 `.env`, `.env.example` → backup으로 이동
- `.gitignore` 업데이트 (루트 .env 추가, 하위 .env 규칙 유지)

### 빌드 시 검증 메시지 (vite.config.js에 console.log 추가)
```
[vite] env loaded from: C:\Drivelog
[vite] VITE_KAKAO_REST_KEY: ✓ (length=32)
[vite] VITE_KAKAO_JS_KEY: ✓ (length=32)
```

### 코드 측 변경 (esbuild 호환을 위해 전역 변수 사용)
- `AddressSearchModal.jsx` (mobile + admin), `RideNew.jsx`: `import.meta.env.VITE_KAKAO_REST_KEY` → `__KAKAO_REST_KEY__`
- index.html의 `%VITE_KAKAO_JS_KEY%`는 Vite HTML 치환이 envDir 자동 따라가서 그대로 둠 (정상 동작)

### 학습 포인트
- **NAS는 .env 무관**: VITE_* 변수는 빌드 타임에 JS에 박힘. NAS는 빌드 결과물(dist)만 서빙하므로 .env 불필요
- **esbuild의 점 식별자 한계**: `define`으로 `import.meta.env.X` 같은 다중 점 식별자를 치환하면 실패. 단일 식별자(`__X__`)는 정상 작동
- **올바른 검증 방법**: minify된 변수명 `${Oy}`만 보고 판단하면 안 됨. 변수에 실제 값이 들어가 있는지 (`Oy="5bfc..."`) 확인해야 함

---

## ⭐ 즐겨찾기 고객별 특화 복원 (저녁 추가 작업)

### 발견된 문제
사용자 지적: "지도 검색창 옆 즐겨찾기로 고객명 입력하면 그 고객이 자주 출발했던 곳/도착했던 곳을 볼 수 있었는데 그게 또 없어졌어"

### 진단
- 기존 코드(모바일 CallList.jsx, 관리자 CallManage.jsx)는 ⭐ 즐겨찾기를 **회사 전체 기준**으로 보여주고 있었음
- 사용자의 원래 설계는 **고객별 특화** (각 고객마다 자주 가는 곳 top 3)
- 백엔드 라우트도 `customer_id` 필터링 미지원

### 설계 (사용자 명세)
```
이대원 - 양우 2건, 농협 하나로마트 1건, 비비큐 4건
홍길동 - 양우 1건, 농협 하나로마트 5건, 비비큐 2건

홍길동 + ⭐ 출발지 → 농협 하나로마트, 비비큐, 양우 (count DESC, top 3)
이대원 + ⭐ 출발지 → 비비큐, 양우, 농협 하나로마트 (count DESC, top 3)
```

### 구현
1. **`drivelog-admin/server/routes/calls.js`** — `GET /api/calls/frequent-addresses`에 `customer_id` 쿼리 파라미터 추가
   - 있으면: `WHERE customer_id = ?` 추가 (고객 필터링)
   - 없으면: 기존 회사 전체 동작 유지 (하위 호환)

2. **`drivelog-mobile/src/pages/CallList.jsx`**:
   - 마운트 시 frequent-addresses 호출 제거
   - `selectedCust.customer_id` 변경 감지 `useEffect` 추가 → top 3 재로드
   - 고객 미선택 시 자주 가는 곳 비움
   - ⭐ 버튼 항상 표시 (이전엔 데이터 없으면 숨김)
   - 드롭다운 안내 메시지: 고객 미선택 / 데이터 없음 / 정상 목록 3가지 분기

3. **`drivelog-admin/client/src/pages/CallManage.jsx`**: 동일 패턴 적용

### UX 개선
- ⭐ 버튼이 disabled 상태로 회색이 아니라 항상 활성. 드롭다운 안에서 상황 안내
- 헤더에 선택된 고객명 표시: "⭐ 자주 가는 출발지 · 홍길동"

---

## 📂 변경 파일 전체 목록

### 신규
| 파일 | 용도 |
|---|---|
| `C:\Drivelog\.env` | 마스터 환경변수 (모노레포 단일 진실 원천) |
| `C:\Drivelog\.env.example` | 환경변수 템플릿 (Git 커밋 OK) |
| `drivelog-mobile/src/pages/RiderList.jsx` | 모바일 기사 조회/수정 페이지 |

### 수정
| 파일 | 변경 |
|---|---|
| `drivelog-mobile/vite.config.js` | loadEnv + define으로 환경변수 명시 주입 (`__KAKAO_REST_KEY__` 등) |
| `drivelog-admin/client/vite.config.js` | 동일 |
| `drivelog-mobile/src/components/AddressSearchModal.jsx` | `__KAKAO_REST_KEY__` 사용 |
| `drivelog-admin/client/src/components/AddressSearchModal.jsx` | 동일 |
| `drivelog-mobile/src/pages/RideNew.jsx` | 콜 진입 시 started_at 자동 채움 + `__KAKAO_REST_KEY__` 사용 |
| `drivelog-mobile/src/api/client.js` | updateUser, issueTempPassword 추가 |
| `drivelog-mobile/src/App.jsx` | /rider/list 라우트 추가 |
| `drivelog-mobile/src/pages/Home.jsx` | '기사 조회' 메뉴 추가 |
| `drivelog-mobile/src/pages/CallList.jsx` | ⭐ 즐겨찾기 고객별 특화 (top 3) + 항상 표시 |
| `drivelog-admin/client/src/pages/CallManage.jsx` | 동일 |
| `drivelog-admin/server/routes/calls.js` | `frequent-addresses` 라우트에 customer_id 필터 추가 |
| `.gitignore` | 루트 .env 무시 규칙 추가 |

### 삭제 (backup으로 이동)
- `drivelog-mobile/.env`, `drivelog-mobile/.env.example`
- `drivelog-admin/client/.env`, `drivelog-admin/client/.env.example`

### 백업 위치
`C:\Drivelog\backup\20260429_bugfix\`:
- `client_mobile_20260429_1600.js`
- `vite_config_admin_20260429_1620.js`
- `vite_config_mobile_20260429_1620.js`
- `dotenv_mobile_ARCHIVED.txt`, `dotenv_admin_ARCHIVED.txt`
- `dotenv_example_mobile_ARCHIVED.txt`, `dotenv_example_admin_ARCHIVED.txt`
- `RiderList_jsx_20260429_1600_NOTE.md`

---

## 🚀 배포 상태

### 이미 배포된 것 (4-29)
- 버그 1, 버그 2, 버그 3 + .env 일원화 + 카카오 키 빌드 적용 → `npm run deploy:all` 완료 (수회 반복)

### 아직 배포 안 된 것 (4-30 진행 예정)
- ⭐ 즐겨찾기 고객별 특화 복원 (admin/client/server 3종 모두 배포 필요)

### 배포 명령
```bash
cd /c/drivelog
npm run deploy:all
```

**중요**: ⭐ 즐겨찾기 변경은 **백엔드 라우트도 변경**됐으므로 `deploy:all` 또는 `deploy:server` 필수.

---

## ✅ 검증 체크리스트 (4-30에 진행)

### 버그 1 (지도 검색) — 배포 완료
- [ ] 모바일 콜 생성 → 출발지/도착지 검색 → 결과 정상 표시
- [ ] 모바일 운행기록 작성 → 주소 검색 → 결과 정상 표시
- [ ] 관리자 콜 관리 → 콜 생성 → 출발지/도착지 검색 → 결과 정상 표시

### 버그 2 (콜→운행) — 배포 완료
- [ ] 모바일에서 콜 수락 → 운행기록 작성 진입
- [ ] 출발/도착 버튼 안 누르고 바로 "저장하기" 눌렀을 때 정상 저장됨
- [ ] 저장된 운행 데이터에 started_at 들어있고 콜 정보(주소, 고객, 요금) 정상 매핑

### 버그 3 (기사 조회) — 배포 완료
- [ ] SA 계정으로 로그인 → 홈에 '기사 조회' 메뉴 보임 (RIDER 계정에는 안 보임)
- [ ] 메뉴 진입 → 기사 목록 표시 (활성/정지 통계)
- [ ] 검색 (이름/로그인ID/연락처) 정상 동작
- [ ] 기사 카드 탭 → 수정 모달 열림
- [ ] 이름/연락처/이메일/차량번호/차종 수정 → 저장 → 목록 갱신
- [ ] '연락처에서 가져오기' 버튼 동작 (Android Chrome HTTPS)
- [ ] 활성/정지 토글 버튼 동작

### ⭐ 즐겨찾기 고객별 특화 — 배포 대기
- [ ] 모바일 콜 생성 → 고객 미선택 + ⭐ 클릭 → "고객을 먼저 선택해주세요" 안내
- [ ] 모바일 콜 생성 → 이대원 선택 + ⭐ 출발지 클릭 → 이대원의 출발지 top 3
- [ ] 모바일 콜 생성 → 홍길동 선택 + ⭐ 출발지 클릭 → 홍길동의 출발지 top 3 (다른 정렬)
- [ ] 모바일 콜 생성 → 고객 변경 시 자주 가는 곳 자동 갱신
- [ ] 모바일 콜 생성 → 고객 ✕ 클릭으로 제거 → 자주 가는 곳 비움
- [ ] 관리자 콜 관리 → 동일하게 동작
- [ ] 헤더에 고객명 표시: "⭐ 자주 가는 출발지 · 홍길동"

---

## 🔮 다음 세션 메모

- **PII Phase 2 (암호화)**: 보류 중 (사장님 결정 대기)
- **PHASE1 (볼륨 암호화 + DB 포트 차단)**: 개발 주기 끝날 때
- **잔여 미매칭 14건**: 운영 영향 없음, 추후 admin 일괄 수정 기능 검토
- **(추가 검토 가능)** calls 테이블에 lat/lng 컬럼 추가 (현재는 옵션 A로 우회) — 정확한 운행 좌표 추적이 필요해지면 마이그레이션
- **(추가 검토 가능)** RiderList에서 비밀번호 초기화/임시비번 발급 버튼 추가 가능 (issueTempPassword API는 이미 client에 추가됨)
- **(반성)** 이번 세션에서 ⭐ 즐겨찾기를 고객별 특화 → 회사 전체로 잘못 인지하고 작업해서 사용자 신뢰를 잃을 뻔함. 다음부터 기존 기능 변경 시 **원래 설계 의도를 사용자에게 먼저 확인**하고 작업할 것.

---

## 🛠 학습 노트 (다음 세션이 참고할 것)

### Vite 환경변수 함정
1. **루트 .env를 두 프로젝트가 공유하려면** envDir만으로는 부족할 수 있음. `loadEnv` + `define`으로 명시 주입이 가장 안전.
2. **`import.meta.env.VITE_X` 형태 define은 esbuild에서 실패할 수 있음** (점이 포함된 다중 식별자 치환 한계). 단일 식별자 `__VAR__`로 우회.
3. **빌드 결과 검증할 때 minify된 변수명만 보고 판단하면 오해 발생**. `${Oy}`처럼 보여도 실제로는 `Oy="실제값"`이 별도 정의되어 있을 수 있음. **실제 키 문자열로 grep**해야 정확.
4. **NAS는 빌드 결과물(dist)만 서빙**하므로 NAS의 .env는 프론트엔드 환경변수와 무관. 빌드 PC(Windows)의 .env만 중요.

### Vite HTML 치환 (`%VAR%`)
- `index.html`에서 `%VITE_X%`는 envDir 자동 따라감. JS의 `import.meta.env.X`보다 안정적.
- 그래서 카카오 SDK URL의 JS 키는 envDir만으로 정상 작동.

---

**작성**: 2026-04-29 (16:00 첫 작성, 18:00경 ⭐ 추가 작업 반영)
**작업자**: Claude (코드) + Tomcat (배포/검증)
**관련 문서**: `CLAUDE_SESSION_GUIDE.md`, `session_2026_04_28_summary.md`
