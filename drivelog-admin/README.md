# DriveLog Admin - SuperAdmin 관리 페이지

## 프로젝트 구조
```
drivelog-admin/
├── server/                  # Express.js 백엔드
│   ├── index.js             # 서버 진입점 (포트 3001)
│   ├── routes/api.js        # REST API 라우트
│   └── data/mockData.js     # Mock 데이터 (엑셀 기반)
├── client/                  # React + Vite 프론트엔드
│   ├── src/
│   │   ├── App.jsx          # 메인 레이아웃 + 라우팅
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # 대시보드 (KPI + 차트)
│   │   │   ├── Rides.jsx       # 운행일지 (테이블)
│   │   │   ├── Partners.jsx    # 제휴업체 콜횟수
│   │   │   └── Mileage.jsx     # 고객 마일리지 (일자별/고객별)
│   │   ├── components/
│   │   │   └── KpiCard.jsx
│   │   └── api/client.js    # Axios API 클라이언트
│   └── dist/                # 빌드 결과물
└── README.md
```

## 실행 방법

### 개발 모드
```bash
# 1. 서버 실행
cd server && npm install && node index.js

# 2. 클라이언트 실행 (새 터미널)
cd client && npm install && npx vite
```
→ http://localhost:5173 에서 확인 (API는 localhost:3001로 프록시)

### 프로덕션 모드
```bash
cd client && npx vite build
cd ../server && node index.js
```
→ http://localhost:3001 에서 확인 (빌드된 React를 Express가 서빙)

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/rides | 운행일지 목록 (page, limit, month, driver, customer) |
| GET | /api/stats/daily | 일자별 통계 (month) |
| GET | /api/stats/partners | 제휴업체별 콜횟수 |
| GET | /api/stats/mileage | 고객별 마일리지 (q: 검색) |

## 디자인: Clean White (B안)
- 상단 탭 네비게이션
- 화이트 + 블루 액센트
- Recharts 차트 라이브러리
- 반응형 KPI 카드 + 테이블
