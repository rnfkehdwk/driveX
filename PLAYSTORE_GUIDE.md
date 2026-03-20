# DriveLog 플레이스토어 등록 가이드 (TWA)

## 전체 흐름
PWABuilder에서 AAB 생성 → 서버에 assetlinks.json 배치 → 플레이스토어 업로드

---

## Step 1: 사전 준비

### 1.1 구글 플레이 개발자 계정
- https://play.google.com/console 접속
- 개발자 등록 (25달러, 1회 결제)
- 신원 확인 완료까지 1~2일 소요

### 1.2 PWA 요건 확인 (이미 완료)
- HTTPS 적용됨
- manifest.json 있음
- Service Worker 있음
- 192x192, 512x512 아이콘 있음

---

## Step 2: PWABuilder로 AAB 파일 생성

### 2.1 PWABuilder 접속
1. https://www.pwabuilder.com/ 접속
2. URL 입력: https://rnfkehdwk.tplinkdns.com:38443/m/
3. "Start" 클릭

### 2.2 Android 패키지 생성
1. "Package for stores" 클릭
2. "Android" 선택
3. 설정 입력:

Package ID: com.drivelog.app
App name: DriveLog
App version: 1.0.0
Host: rnfkehdwk.tplinkdns.com:38443
Start URL: /m/
Theme color: #1a1a2e
Background color: #f7f8fc
Display mode: Standalone
Signing key: Create new

4. "Generate" 클릭 → ZIP 다운로드

### 2.3 ZIP 내용물
- app-release-signed.aab (플레이스토어 업로드용)
- assetlinks.json (서버에 배치할 파일)
- signing.keystore (서명키 - 반드시 백업!)
- signing-key-info.txt (키 정보)

---

## Step 3: assetlinks.json 서버 배치

### 3.1 NAS에 파일 배치
SSH 접속 후:
mkdir -p /volume1/docker/drivelog/well-known
PWABuilder ZIP에서 꺼낸 assetlinks.json을 위 폴더에 복사

### 3.2 Nginx 설정 추가
nginx/conf.d/drivelog.conf 의 HTTPS server 블록에:

location /.well-known/ {
    alias /usr/share/nginx/html/well-known/;
    add_header Content-Type application/json;
}

### 3.3 docker-compose.yml 볼륨 추가
nginx volumes에:
- ./well-known:/usr/share/nginx/html/well-known:ro

### 3.4 재시작
sudo docker-compose restart nginx

### 3.5 확인
curl https://rnfkehdwk.tplinkdns.com:38443/.well-known/assetlinks.json

---

## Step 4: 플레이스토어 업로드

### 4.1 Google Play Console
https://play.google.com/console → 앱 만들기

### 4.2 기본 정보
- 앱 이름: DriveLog - 운행일지
- 기본 언어: 한국어
- 앱 유형: 앱
- 유/무료: 무료

### 4.3 스토어 등록정보
- 앱 설명: 대리기사를 위한 운행일지 관리 앱
- 스크린샷: 앱 화면 캡처 최소 2장
- 아이콘: 512x512 PNG
- 그래픽 이미지: 1024x500 PNG

### 4.4 AAB 업로드
프로덕션 → 새 버전 → app-release-signed.aab 업로드

### 4.5 심사 제출
모든 항목 완료 후 제출 → 심사 1~3일

---

## Step 5: 업데이트

TWA 장점: 웹만 수정하면 앱도 자동 반영!
- UI/기능 변경 → 서버 배포만 하면 됨
- 앱 이름/아이콘 변경 → PWABuilder 재빌드 후 스토어 재업로드

---

## 주의사항
1. signing.keystore 분실 시 앱 업데이트 불가 - 반드시 백업
2. SSL 인증서 만료 시 앱이 웹뷰로 전환됨
3. assetlinks.json 반드시 접근 가능해야 TWA 유지
4. 도메인 변경 시 assetlinks.json + 앱 재빌드 필요
5. 내부 테스트 먼저 하고 프로덕션 출시 권장
