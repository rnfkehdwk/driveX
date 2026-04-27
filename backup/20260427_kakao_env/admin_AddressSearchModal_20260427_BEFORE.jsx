// 백업: 2026-04-27 카카오 키 환경변수 분리 작업 전 admin 원본
// 변경 사유: const KAKAO_REST_KEY = '...' → import.meta.env.VITE_KAKAO_REST_KEY
// 원본: drivelog-admin/client/src/components/AddressSearchModal.jsx
// git: git show HEAD:drivelog-admin/client/src/components/AddressSearchModal.jsx
//
// 핵심 변경: 라인 3
// 변경 전: const KAKAO_REST_KEY = '5bfc2766bfe2836aab70ff613c8c05be';
// 변경 후: const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
