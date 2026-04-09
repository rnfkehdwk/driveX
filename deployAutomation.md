# DriveLog 배포 자동화 가이드
# 최종 업데이트: 2026-04-08

---

## 1. 개요

DriveLog 프로젝트의 프론트엔드(admin, mobile) + 백엔드(server) 배포를 **단일 명령어**로 자동화한 시스템.

### 효과
| 항목 | 이전 (수동) | 현재 (자동화) |
|------|------------|--------------|
| Admin 빌드/업로드 | CMD + File Station 수동 | 자동 |
| Mobile 빌드/업로드 | CMD + File Station 수동 | 자동 |
| Server 업로드 | File Station 수동 | 자동 |
| API/Nginx 재시작 | SSH 접속 후 수동 | 자동 |
| **총 소요 시간** | **5~10분** | **약 30초** |
| **명령어 수** | **여러 단계** | **1줄** |

### 핵심 명령
```bash
cd /c/drivelog
npm run deploy:all
```

---

## 2. 자동화 구조

```
PC (Git Bash)
  ├─ admin 빌드 (Vite)
  ├─ mobile 빌드 (Vite)
  └─ SSH/SCP 전송
      ↓
NAS (Synology)
  ├─ /volume1/docker/drivelog/client/dist/   (admin 빌드 결과물)
  ├─ /volume1/docker/drivelog/mobile/dist/   (mobile 빌드 결과물)
  ├─ /volume1/docker/drivelog/server/        (백엔드 소스)
  └─ docker-compose restart api nginx        (서비스 재시작)
```

---

## 3. 사전 준비 (최초 1회만)

### 3-1. SSH 키 생성 (각 개발 PC마다)

```bash
# Git Bash에서
ssh-keygen -t ed25519 -C "tomcat-drivelog"
```
- 파일 경로: 기본값(Enter)
- passphrase: 없음(Enter 두 번)

### 3-2. 공개키를 NAS에 등록

```bash
# 외부 접속 시 (외부 도메인 + 외부 SSH 포트)
ssh-copy-id -p 30000 rnfkehdwk@rnfkehdwk.synology.me

# 또는 내부 접속 시 (LAN)
ssh-copy-id rnfkehdwk@192.168.0.2
```

### 3-3. 키 인증 테스트

```bash
ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me
```
비밀번호 물지 않고 바로 접속되면 성공.

### 3-4. sudoers 설정 (NAS, 1회만)

API/Nginx 재시작 시 sudo 비밀번호 없이 실행되도록 NAS에 설정.

```bash
# NAS 접속 후
sudo cp /etc/sudoers /tmp/sudoers.backup
echo 'rnfkehdwk ALL=(ALL) NOPASSWD: /usr/local/bin/docker-compose' | sudo tee /etc/sudoers.d/drivelog-deploy
sudo chmod 0440 /etc/sudoers.d/drivelog-deploy
```

**테스트:**
```bash
sudo -K
sudo /usr/local/bin/docker-compose --version
```
비밀번호 안 물으면 설정 완료.

---

## 4. package.json 설정

### 4-1. `/c/drivelog/drivelog-admin/client/package.json`
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "vite build && ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me \"rm -rf /volume1/docker/drivelog/client/dist/*\" && scp -O -P 30000 -r dist/* rnfkehdwk@rnfkehdwk.synology.me:/volume1/docker/drivelog/client/dist/"
}
```

### 4-2. `/c/drivelog/drivelog-mobile/package.json`
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "vite build && ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me \"rm -rf /volume1/docker/drivelog/mobile/dist/*\" && scp -O -P 30000 -r dist/* rnfkehdwk@rnfkehdwk.synology.me:/volume1/docker/drivelog/mobile/dist/"
}
```

### 4-3. `/c/drivelog/package.json` (루트)
```json
{
  "name": "drivelog-root",
  "private": true,
  "scripts": {
    "deploy:admin": "cd drivelog-admin/client && npm run deploy",
    "deploy:mobile": "cd drivelog-mobile && npm run deploy",
    "deploy:server": "scp -O -P 30000 -r drivelog-admin/server/config drivelog-admin/server/db drivelog-admin/server/middleware drivelog-admin/server/models drivelog-admin/server/routes drivelog-admin/server/data drivelog-admin/server/index.js drivelog-admin/server/package.json drivelog-admin/server/package-lock.json drivelog-admin/server/Dockerfile rnfkehdwk@rnfkehdwk.synology.me:/volume1/docker/drivelog/server/ && ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me \"cd /volume1/docker/drivelog && sudo /usr/local/bin/docker-compose restart api nginx\"",
    "deploy:all": "npm run deploy:admin && npm run deploy:mobile && npm run deploy:server"
  }
}
```

---

## 5. 사용 방법

모든 명령은 `/c/drivelog` 루트에서 **Git Bash**로 실행.

### 전체 배포 (가장 자주 사용)
```bash
cd /c/drivelog
npm run deploy:all
```
→ admin 빌드/업로드 → mobile 빌드/업로드 → server 업로드 → API/Nginx 재시작

### 부분 배포

**Admin만 수정했을 때:**
```bash
npm run deploy:admin
```

**Mobile만 수정했을 때:**
```bash
npm run deploy:mobile
```

**백엔드만 수정했을 때:**
```bash
npm run deploy:server
```

---

## 6. 각 스크립트 동작 상세

### `deploy:admin`
1. `vite build` → `dist/` 생성
2. NAS의 `/volume1/docker/drivelog/client/dist/*` 전체 삭제 (이전 빌드 정리)
3. 새 `dist/` 전체를 scp로 NAS에 업로드
4. 볼륨 마운트되어 있어 즉시 반영 (nginx 재시작 불필요)

### `deploy:mobile`
1. `vite build` → `dist/` 생성
2. NAS의 `/volume1/docker/drivelog/mobile/dist/*` 전체 삭제
3. 새 `dist/` 전체를 scp로 NAS에 업로드
4. PWA 아이콘, manifest, sw.js 포함 자동 업로드

### `deploy:server`
1. scp로 server 폴더의 필요한 파일들 NAS 업로드
   - 업로드 대상: `config`, `db`, `middleware`, `models`, `routes`, `data`, `index.js`, `package.json`, `package-lock.json`, `Dockerfile`
   - 자동 제외: `node_modules`, `logs`, `.env` 등
2. ssh로 NAS 접속
3. `sudo docker-compose restart api nginx` 실행
4. 약 15-20초 다운타임 후 완료

### `deploy:all`
`deploy:admin` → `deploy:mobile` → `deploy:server` 순차 실행.
전체 소요 시간 약 30초.

---

## 7. 주의사항

### ⚠️ deploy:server는 서비스 일시 중단 발생
- API/Nginx 재시작 중 약 15-20초 다운타임
- 실서비스 운영 중엔 사용자 영향 있을 수 있음
- 테스트/개발 환경에선 문제 없음

### ⚠️ 첫 빌드 후 브라우저 캐시
- 반영 안 된 것처럼 보이면 `Ctrl+Shift+R` 강제 새로고침

### ⚠️ server 폴더에 새 파일 추가 시
- scp 업로드 대상 리스트 업데이트 필요
- 현재 업로드: `config db middleware models routes data index.js package.json package-lock.json Dockerfile`
- 새 폴더/파일 추가하면 `deploy:server` 스크립트에도 추가해야 함

### ⚠️ node_modules는 절대 업로드하지 않음
- NAS에 이미 설치된 것 사용
- 패키지 추가 시 NAS에서 별도로 `docker exec drivelog-api npm install` 필요

### ⚠️ Windows/Mac 호환성
- `scp -O` 옵션 필수 (시놀로지 SFTP 비활성 대응)
- Git Bash 사용 (CMD/PowerShell 불가)

---

## 8. 문제 해결

### "subsystem request failed" 또는 "scp: Connection closed"
→ `scp` 명령에 `-O` 옵션 추가 (Legacy SCP 모드)
```bash
scp -O -P 30000 ...
```

### SSH 접속 시 비밀번호 계속 물음
→ SSH 키가 등록 안 된 상태
```bash
ssh-copy-id -p 30000 rnfkehdwk@rnfkehdwk.synology.me
```

### sudo 재시작 시 비밀번호 물음
→ sudoers 설정 확인
```bash
# NAS에서
sudo cat /etc/sudoers.d/drivelog-deploy
# 권한 확인
sudo ls -la /etc/sudoers.d/drivelog-deploy
# -r--r----- 이어야 함
```

### 배포 후 변경사항이 반영 안 됨
1. 브라우저 강제 새로고침 (`Ctrl+Shift+R`)
2. 그래도 안 되면 `npm run deploy:server`로 nginx 재시작
3. NAS에서 직접 확인: `docker logs drivelog-api --tail 20`

### scp 업로드 중 파일 누락
→ 새로 추가한 파일이 업로드 리스트에 없을 수 있음. `package.json`의 `deploy:server` 스크립트 확인.

---

## 9. 보안 고려사항

### 현재 보안 상태
- ✅ SSH 키 인증 (비밀번호 없이 접속)
- ✅ 공개키는 NAS `~/.ssh/authorized_keys`에만 등록
- ✅ sudoers는 `docker-compose` 명령만 NOPASSWD
- ✅ 개인키는 각 PC의 `~/.ssh/id_ed25519`에만 존재

### PC 공유 주의
- 개인키가 있는 PC는 NAS 접근 가능
- PC 분실/공유 시 즉시 NAS `authorized_keys`에서 해당 키 제거

### PC 추가 시
1. 새 PC에서 `ssh-keygen`
2. `ssh-copy-id`로 공개키 등록
3. `git pull`로 package.json 동기화
4. `npm run deploy:all` 테스트

---

## 10. 관련 파일 위치

### PC
- `/c/drivelog/package.json` (루트 deploy 스크립트)
- `/c/drivelog/drivelog-admin/client/package.json` (admin deploy)
- `/c/drivelog/drivelog-mobile/package.json` (mobile deploy)
- `~/.ssh/id_ed25519` (개인키)
- `~/.ssh/id_ed25519.pub` (공개키)

### NAS
- `/etc/sudoers.d/drivelog-deploy` (sudoers NOPASSWD 설정)
- `~/.ssh/authorized_keys` (등록된 공개키들)
- `/volume1/docker/drivelog/docker-compose.yml` (Docker 설정)
- `/volume1/docker/drivelog/client/dist/` (admin 빌드 위치)
- `/volume1/docker/drivelog/mobile/dist/` (mobile 빌드 위치)
- `/volume1/docker/drivelog/server/` (백엔드 소스)

---

## 11. 확장 가능성

### 추후 고려할 만한 개선
- **Rollback 메커니즘**: 배포 실패 시 이전 버전으로 자동 복구
- **Blue-Green 배포**: 다운타임 0을 목표로 하는 방식
- **CI/CD 파이프라인**: GitHub Actions로 push 시 자동 배포
- **헬스체크 자동화**: 재시작 후 `/api/health` 자동 확인
- **Slack/KakaoTalk 알림**: 배포 완료 메시지 자동 전송
- **배포 로그 기록**: 언제 누가 뭘 배포했는지 히스토리

### 현재 단계
- 개발/테스트 환경에 최적화된 간단한 자동화
- 실서비스 런칭 시에는 Blue-Green이나 Rolling 배포 고려 필요

---

## 12. 히스토리

| 날짜 | 변경 사항 |
|------|----------|
| 2026-04-07 | SSH 키 등록 + admin/mobile 자동 배포 구축 |
| 2026-04-08 | sudoers 설정 + server 자동 배포 + nginx 재시작 추가 |
| 2026-04-08 | `deploy:all` 통합 스크립트 완성 |
