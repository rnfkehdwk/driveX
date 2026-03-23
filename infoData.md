# DriveLog 프로젝트 인프라 정보
# 최종 업데이트: 2026-03-23

---

## 1. 데이터베이스 (MariaDB 10.11)

### DB Root 계정
- ID: root
- PW: Drivelog12!@
- 비고: Docker 컨테이너 내부 관리용

### DB 어플리케이션 계정 (API 서버 사용)
- ID: sykim
- PW: Rlatpduq12!@
- DB명: drivelog_db
- 비고: docker-compose.yml의 DB_USER / DB_PASSWORD

### DB 접속 정보
- Docker 내부 호스트: db (컨테이너명: drivelog-db)
- Docker 내부 포트: 3306
- 외부 포트(NAS): 3306 (0.0.0.0:3306->3306)
- DBeaver 접속: 192.168.0.2:3306

---

## 2. API 서버 (Node.js + Express)

- 컨테이너명: drivelog-api
- 내부 포트: 3001
- 외부 포트: 3001 (0.0.0.0:3001->3001)
- 서버 버전: v1.8
- 환경변수 (docker-compose.yml):
  - NODE_ENV: production
  - DB_HOST: db
  - DB_PORT: 3306
  - DB_USER: sykim
  - DB_PASSWORD: Rlatpduq12!@
  - DB_NAME: drivelog_db
  - DB_CONNECTION_LIMIT: 20
  - JWT_ACCESS_EXPIRES: 15m

---

## 3. Nginx (리버스 프록시 + 정적 파일 서빙)

- 컨테이너명: drivelog-nginx
- HTTP 포트: 8080 (0.0.0.0:8080->80)
- HTTPS 포트: 8443 (0.0.0.0:8443->443)
- 설정 파일: /etc/nginx/conf.d/drivelog.conf

### 볼륨 마운트
- 관리자 빌드: ./client/dist → /usr/share/nginx/html/admin
- 모바일 빌드: ./mobile/dist → /usr/share/nginx/html/mobile
- nginx 설정: ./nginx/drivelog.conf → /etc/nginx/conf.d/drivelog.conf
- SSL 인증서: ./nginx/ssl → /etc/nginx/ssl

---

## 4. 접속 URL

### 내부 네트워크 (LAN)
- 관리자 웹: https://192.168.0.2:8443/admin/
- 모바일 앱: https://192.168.0.2:8443/m/
- API 헬스체크: https://192.168.0.2:8443/api/health

### 외부 네트워크 (DDNS)
- 관리자 웹: https://rnfkehdwk.synology.me:38443/admin/
- 모바일 앱: https://rnfkehdwk.synology.me:38443/m/
- 도메인: rnfkehdwk.synology.me
- 외부 HTTPS 포트: 38443

---

## 5. 개발 서버 (PC 로컬)

### 관리자 웹 (React + Vite)
- 경로: C:\Drivelog\drivelog-admin\client
- 개발 포트: 5173
- 빌드: npx vite build
- base: /admin/

### 모바일 앱 (React + Vite PWA)
- 경로: C:\Drivelog\drivelog-mobile
- 개발 포트: 5174
- 빌드: npx vite build
- base: /m/

### 백엔드 서버
- 경로: C:\Drivelog\drivelog-admin\server
- 개발 포트: 3001

---

## 6. NAS 경로 (Synology NAS)

- NAS IP: 192.168.0.2
- SSH 유저: rnfkehdwk
- Docker 프로젝트 루트: /volume1/docker/drivelog/
- 관리자 dist: /volume1/docker/drivelog/client/dist/
- 모바일 dist: /volume1/docker/drivelog/mobile/dist/
- 서버 코드: /volume1/docker/drivelog/server/
- nginx 설정: /volume1/docker/drivelog/nginx/
- docker-compose: /volume1/docker/drivelog/docker-compose.yml

---

## 7. PC 경로

- 프로젝트 루트: C:\Drivelog
- 관리자 클라이언트: C:\Drivelog\drivelog-admin\client\src\
- 백엔드: C:\Drivelog\drivelog-admin\server\
- 모바일: C:\Drivelog\drivelog-mobile\src\
- nginx 설정: C:\Drivelog\nginx\
- 백업 폴더: C:\Drivelog\backup\

---

## 8. 테스트 계정

| 역할 | 업체코드 | ID | PW | 비고 |
|------|---------|------|------|------|
| MASTER | - | admin | Admin123! | 시스템 관리자 |
| SUPER_ADMIN | YANGYANG01 | sa_yang | Admin123! | 양양대리 관리자 |
| RIDER | YANGYANG01 | rider_son | Admin123! | 운행기사 |

---

## 9. 배포 체크리스트

### 프론트엔드 빌드 (PC)
```bash
# 모바일
cd C:\Drivelog\drivelog-mobile
npx vite build

# 관리자
cd C:\Drivelog\drivelog-admin\client
npx vite build
```

### NAS 업로드 (File Station)
- 모바일 dist → /volume1/docker/drivelog/mobile/dist/ (덮어쓰기)
- 관리자 dist → /volume1/docker/drivelog/client/dist/ (덮어쓰기)

### NAS 재시작 (SSH)
```bash
cd /volume1/docker/drivelog
# nginx만 (프론트 변경 시)
sudo docker-compose restart nginx
# API만 (백엔드 변경 시)
sudo docker-compose restart api
# 전체
sudo docker-compose down && sudo docker-compose up -d
```

---

## 10. 주의사항

- 프론트 빌드 후 NAS에 올릴 때 구버전 assets 파일 삭제 후 업로드
- 볼륨 마운트 되어있으므로 docker cp 불필요
- 브라우저 캐시 문제 시 Ctrl+Shift+R (강제 새로고침)
- API 서버 코드 수정 시 반드시 docker-compose restart api
- DB 스키마 변경 시 SSH에서 docker exec으로 실행 (DBeaver 유저 권한 주의)
