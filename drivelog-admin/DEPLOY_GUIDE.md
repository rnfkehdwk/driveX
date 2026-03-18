# DriveLog 배포 가이드
## Synology NAS + Docker 환경

---

## 1. 사전 준비

### 1.1 Synology NAS 패키지 설치
```
패키지 센터 → Container Manager (또는 Docker) 설치
```

### 1.2 폴더 구조 생성 (File Station)
```
/volume1/docker/drivelog/
├── docker-compose.yml
├── .env
├── server/          ← API 서버 소스
├── client/dist/     ← 웹 관리 빌드 결과
├── mobile/dist/     ← 모바일 PWA 빌드 결과
└── nginx/           ← Nginx 설정
```

---

## 2. 빌드 (PC에서 작업)

### 2.1 프로젝트 압축 해제
```bash
tar -xzf drivelog-full-v1.7.tar.gz
```

### 2.2 웹 관리 빌드
```bash
cd drivelog-admin/client
npm install
npx vite build
# → dist/ 폴더 생성됨
```

### 2.3 모바일 PWA 빌드
```bash
cd drivelog-mobile
npm install
npx vite build
# → dist/ 폴더 생성됨
```

### 2.4 NAS에 업로드
File Station으로 아래 파일들을 업로드:
```
/volume1/docker/drivelog/docker-compose.yml
/volume1/docker/drivelog/.env
/volume1/docker/drivelog/server/       ← 서버 전체 (node_modules 제외)
/volume1/docker/drivelog/client/dist/  ← 빌드 결과만
/volume1/docker/drivelog/mobile/dist/  ← 빌드 결과만
/volume1/docker/drivelog/nginx/        ← nginx 설정 전체
```

---

## 3. 환경변수 설정

### 3.1 .env 파일 수정
```bash
# SSH 접속 후
cd /volume1/docker/drivelog
cp .env.example .env
vi .env
```

### 3.2 JWT 시크릿 생성 (필수!)
```bash
# 각각 다른 값으로 생성
openssl rand -hex 32
# 결과를 JWT_SECRET에 복사

openssl rand -hex 32
# 결과를 JWT_REFRESH_SECRET에 복사
```

### 3.3 DB 비밀번호 변경 (필수!)
```
DB_ROOT_PASSWORD=강력한비밀번호1
DB_PASSWORD=강력한비밀번호2
```

---

## 4. Docker 실행

### 4.1 SSH 접속
```bash
ssh admin@NAS_IP -p 포트번호
```

### 4.2 실행
```bash
cd /volume1/docker/drivelog
sudo docker-compose up -d
```

### 4.3 실행 확인
```bash
# 컨테이너 상태
sudo docker-compose ps

# 예상 결과:
# drivelog-db    running (healthy)
# drivelog-api   running (healthy)
# drivelog-nginx running

# API 헬스체크
curl http://localhost:3001/api/health

# DB 초기화 확인
sudo docker exec -it drivelog-db mysql -u drivelog -p'비밀번호' drivelog_db -e "SHOW TABLES;"
```

### 4.4 로그 확인
```bash
# 전체 로그
sudo docker-compose logs -f

# API 서버만
sudo docker-compose logs -f api
```

---

## 5. 접속 확인

| 서비스 | URL | 설명 |
|--------|-----|------|
| 웹 관리 | http://NAS_IP/admin | SuperAdmin 대시보드 |
| 모바일 PWA | http://NAS_IP/m | 기사용 운행일지 앱 |
| API | http://NAS_IP/api/health | 서버 상태 확인 |

### 테스트 계정
| 역할 | ID | 비밀번호 |
|------|-----|----------|
| MASTER | admin | Admin123! |
| SuperAdmin | sa_yang | Admin123! |
| 기사 | rider_son | Admin123! |

---

## 6. DDNS + HTTPS 설정 (외부 접속)

### 6.1 Synology DDNS
```
제어판 → 외부 액세스 → DDNS
→ 서비스 제공자: Synology
→ 호스트 이름: drivelog.synology.me
```

### 6.2 포트 포워딩 (공유기)
```
외부 80  → NAS IP:80  (HTTP)
외부 443 → NAS IP:443 (HTTPS)
```

### 6.3 Let's Encrypt SSL (무료)
```
제어판 → 보안 → 인증서
→ 추가 → Let's Encrypt 인증서
→ 도메인: drivelog.synology.me
```

### 6.4 Nginx HTTPS 활성화
`nginx/conf.d/drivelog.conf` 에서 HTTPS 블록 주석 해제 후:
```bash
# SSL 인증서를 nginx/ssl/ 에 복사
cp /usr/syno/etc/certificate/_archive/*/fullchain.pem nginx/ssl/
cp /usr/syno/etc/certificate/_archive/*/privkey.pem nginx/ssl/

# Nginx 재시작
sudo docker-compose restart nginx
```

### 6.5 최종 접속
```
웹 관리:    https://drivelog.synology.me/admin
모바일 PWA: https://drivelog.synology.me/m
```

---

## 7. PWA 설치 (기사 배포)

### KakaoTalk/SMS로 링크 전송
```
https://drivelog.synology.me/m
```

### 기사 설치 안내
1. 위 링크를 크롬/사파리에서 열기
2. "홈 화면에 추가" 선택
3. 업체코드 + ID + PW로 로그인

---

## 8. 운영 명령어 모음

```bash
# 서비스 시작/중지
sudo docker-compose up -d
sudo docker-compose down

# 재시작
sudo docker-compose restart api

# DB 백업
sudo docker exec drivelog-db mysqldump -u root -p'비밀번호' drivelog_db > backup_$(date +%Y%m%d).sql

# DB 복원
sudo docker exec -i drivelog-db mysql -u root -p'비밀번호' drivelog_db < backup_20260317.sql

# 업데이트 (소스 교체 후)
sudo docker-compose build api
sudo docker-compose up -d api

# 디스크 정리
sudo docker system prune -f
```

---

## 9. 주의사항

- .env 파일의 JWT_SECRET, DB_PASSWORD는 반드시 변경하세요
- 운영 환경에서는 반드시 HTTPS를 사용하세요 (GPS API가 HTTPS 필수)
- DB 백업을 정기적으로 수행하세요 (크론잡 권장)
- 로그인 비밀번호는 첫 로그인 후 반드시 변경하세요
