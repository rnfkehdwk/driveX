# 백업 정보 — 2026-04-27 카카오 키 환경변수 분리

## 목적
카카오 REST/JS 키를 소스 코드에서 분리하여 `.env`로 관리.
시스템 전체 단일 키 (업체별 분리 안 함).

## 변경 대상

### 신규 파일
- `drivelog-mobile/.env.example` (git 포함, 키 없는 템플릿)
- `drivelog-mobile/.env` (git 제외, 실제 키)
- `drivelog-admin/client/.env.example`
- `drivelog-admin/client/.env`

### 수정 파일
- `drivelog-mobile/src/pages/RideNew.jsx` — `KAKAO_REST_KEY` 하드코딩 → `import.meta.env.VITE_KAKAO_REST_KEY`
- `drivelog-mobile/src/components/AddressSearchModal.jsx` — 동일
- `drivelog-mobile/index.html` — JS 키 → `%VITE_KAKAO_JS_KEY%`
- `drivelog-admin/client/src/components/AddressSearchModal.jsx` — REST 키 동일
- `drivelog-admin/client/index.html` — JS 키 동일
- `drivelog-mobile/.gitignore` — `.env` 추가 (이미 있으면 skip)
- `drivelog-admin/client/.gitignore` — 동일
- `drivelog-mobile/vite.config.js` — `transformIndexHtml` 플러그인 (필요 시)
- `drivelog-admin/client/vite.config.js` — 동일

## 키 정보
- REST 키: `5bfc2766bfe2836aab70ff613c8c05be`
- JS 키: `b1e43fe40464bf365f6122749187c09a`
- 양양대리 카카오 개발자 콘솔에서 발급된 키

## 보안 명확히 (중요)
**Vite 환경변수는 빌드 타임에 인라인됩니다.** 즉, 빌드된 JS/HTML에는 키가 그대로 박혀있고 브라우저 DevTools에서 누구나 볼 수 있습니다.

이번 분리의 실질적 이득:
- ✅ 소스 코드에서 키 제거 (git 히스토리 검색해도 안 나옴)
- ✅ 다른 환경(dev/prod)에서 다른 키 사용 가능
- ❌ 브라우저 노출 방지 (불가능 — VITE_ 접두사는 클라이언트 노출이 의도된 것)

## NAS 배포 시 주의
- NAS의 빌드 환경(Docker 빌드 시점 또는 로컬 빌드 후 scp)에 .env가 있어야 함
- Vite 빌드 명령 실행 시점에 .env 읽힘
- 만약 npm run deploy:mobile/deploy:admin이 NAS에서 빌드한다면 NAS에도 .env 필요
- 로컬에서 빌드해서 dist만 scp한다면 로컬 .env만 필요

## 원본 백업
- `RideNew_20260427_BEFORE_NOTE.jsx` (placeholder)
- `mobile_AddressSearchModal_20260427_BEFORE.jsx` (전체)
- `admin_AddressSearchModal_20260427_BEFORE.jsx` (전체)
- `mobile_index_20260427_BEFORE.html` (전체)
- `admin_index_20260427_BEFORE.html` (전체)

## 검증 체크리스트
- [ ] mobile 운행 작성에서 출발지 GPS 클릭 → 카카오 reverse-geocode 정상 동작 (REST 키)
- [ ] mobile 주소 검색 모달 → 결과 정상 (REST 키)
- [ ] mobile/admin 카카오 미니 지도 정상 렌더링 (JS 키)
- [ ] 빌드 후 dist의 JS/HTML에 키가 들어있는지 확인 (들어있어야 정상)
- [ ] 콘솔 에러 없는지
