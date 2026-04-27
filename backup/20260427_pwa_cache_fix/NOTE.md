# 2026-04-27 PWA 캐시 자동 갱신 인프라 구축

## 작업 목적
PWA(홈화면에 추가된 앱)에서 새 빌드가 자동으로 반영되지 않는 문제 해결.
이전 세션에서 추가된 Contact Picker 버튼이 일반 브라우저 탭에서는 보이지만
PWA에서는 옛 캐시된 코드가 떠 있어서 안 보였던 문제.

## 근본 원인
1. sw.js의 CACHE_NAME이 'drivelog-v2.4'로 고정 → 빌드해도 sw.js 자체가 안 바뀌면
   브라우저가 새 SW를 받지 않음
2. HTML이 SW에 의해 캐시됨 → 새 JS 해시 파일명을 못 알게 됨
3. SW 업데이트 체크가 안 일어남 → PWA가 백그라운드에 살아있으면 영원히 옛 버전

## 해결 전략
1. CACHE_NAME에 빌드 타임스탬프 자동 주입 (vite plugin)
2. HTML은 SW 캐시 대상에서 완전 제외 (network-only)
3. SW 등록 후 60분마다 update() 자동 호출
4. 새 SW 감지 시 메인 앱에 메시지 → "새 버전 설치됨, 새로고침" 토스트 표시
5. 사용자가 토스트 버튼 누르면 새 SW activate + 페이지 reload

## 변경 파일
- drivelog-mobile/public/sw.js — 캐시 정책 정리, HTML 캐시 제외, BUILD_ID 주입 자리 마련
- drivelog-mobile/index.html — SW 등록 + update polling + 메시지 핸들러
- drivelog-mobile/src/App.jsx — 새 버전 알림 토스트 컴포넌트 추가
- drivelog-mobile/vite.config.js — sw.js의 BUILD_ID 자리표시자를 빌드 타임에 치환하는 plugin

## 백업 파일
- sw_BEFORE.js — 원본
- index_html_BEFORE.html — 원본
- App_BEFORE.jsx (작업 후 추가)
- vite_config_BEFORE.js (작업 후 추가)
- package_mobile_BEFORE.json — 원본 (변경 예정 없음, 참고용)

## 배포
백엔드 변경 없음 → npm run deploy:mobile

## 검증
1. 폰에서 PWA 앱 한 번 완전 제거 후 재설치 (이번 한 번만 필요)
2. 이후엔 코드 수정 + npm run deploy:mobile 만으로 자동 반영되어야 함
3. PWA가 실행 중이어도 60분 내에 자동으로 새 버전 감지 → 토스트 표시
