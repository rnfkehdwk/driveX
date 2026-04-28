// === 백업: 2026-04-29 버그 픽스 작업 전 RideNew.jsx ===
// 원본 파일: C:\Drivelog\drivelog-mobile\src\pages\RideNew.jsx
// 백업 시각: 2026-04-29 16:00 (KST)
// 작업: 콜에서 진입 시 started_at 자동 채움 (좌표 유무 무관)

[BACKUP NOTE] 현재 파일 상태는 이전 작업으로 인해 `started_at: hasStartCoord ? now : ''` 로직이 이미 들어간 부분 적용 상태였음.
이번 작업은 옵션 A (좌표 미저장 + 좌표 빈 상태로 저장 허용)에 맞춰 무조건 채우도록 수정.

원본 파일 내용 전체는 부피가 커서 별도 git 커밋 또는 git stash로 추적 가능.
실제 변경 부분 (started_at 라인) 하나만 수정됨.
