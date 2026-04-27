# 모바일에서 PC/NAS 코드 작업 — 원격 MCP 셋업 가이드

> **목표**: 모바일 Claude 대화창에서 "대시보드 색을 빨강에서 파랑으로" 같은 자연어 지시로 실제 소스 코드 수정 + 배포까지 가능하게 함
>
> **작성일**: 2026-04-27 (모바일에서 다른 유저 사용 사례 듣고 정리)
>
> **선택한 방식**: 메커니즘 1 (MCP 원격 노출) — NAS 호스팅 + Cloudflare Tunnel
>
> **예상 셋업 시간**: 3~6시간 (처음이면 디버깅 포함)

---

## 🎯 최종 아키텍처

```
[모바일 Claude] ──> Anthropic 서버 ──HTTPS──> Cloudflare Tunnel ──> NAS Docker
                                                                       │
                                                                       ├── filesystem MCP
                                                                       │   (범위: /volume1/dev/Drivelog)
                                                                       └── shell MCP
                                                                           (화이트리스트 명령만)
                                                                       │
                                                                       ▼
                                                              git push → 배포
```

**PC1 의존성 없음** — NAS만 켜져 있으면 모바일에서 작업 가능

---

## ⚠️ 진행 전 반드시 결정할 사항

이 셋업은 보안 측면에서 신중해야 합니다. 다음을 먼저 결정:

- [ ] **읽기 전용으로 시작할지, 처음부터 쓰기 권한 줄지** — 추천: 1주일 읽기 전용 운영 후 확장
- [ ] **shell MCP 화이트리스트 명령** — 어떤 명령만 허용할지 (`git`, `npm run deploy:*`, `docker ps` 정도?)
- [ ] **Cloudflare Access 인증 방식** — 이메일 매직링크? Google OAuth?
- [ ] **PII Phase 2 작업 중인 파일들 보호** — `.cfignore` 같은 제외 리스트 필요
- [ ] **백업 정책** — 모바일에서 실수로 망가뜨려도 복구 가능한가? (Git이 있어서 일단 OK)

---

## 📋 단계별 셋업

### Phase 0: 사전 준비 (10분)

#### 0-1. 다른 유저분께 받아둘 정보

실시간 대화 중이라면 한 번에 다음 5가지 확인:

1. 어떤 MCP 서버 패키지를 사용하시나요? (이름/링크)
2. HTTP 노출은 무엇으로 하셨나요? (Cloudflare Tunnel / ngrok / 직접 / 기타)
3. 인증은 어떻게 거셨나요? (OAuth / API key / Cloudflare Access / 없음)
4. 배포 자동화는 어떻게 하셨나요? (shell MCP / git webhook / 자체 스크립트)
5. 모바일에서 호출 시 헤더에 뭔가 추가하나요?

> 위 5개 답변이 있으면 이 가이드보다 그분 셋업을 우선 따라가는 게 정확합니다.

#### 0-2. 결정 사항 기록

- 인증 방식: __________
- 호스팅 위치: NAS / PC1 (추천: NAS)
- 초기 권한: 읽기 전용 / 쓰기 가능
- 배포 자동화 범위: 없음 / shell MCP / webhook

---

### Phase 1: NAS에 작업 디렉토리 준비 (20분)

NAS에 별도의 git 작업 공간을 만듭니다 (운영 환경 `/volume1/docker/drivelog/`와 분리).

```bash
# NAS SSH 접속
ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me

# 작업 디렉토리 생성
sudo mkdir -p /volume1/dev/drivelog
sudo chown rnfkehdwk:users /volume1/dev/drivelog
cd /volume1/dev

# 레포 클론
git clone https://github.com/rnfkehdwk/driveX.git drivelog
cd drivelog

# 동작 확인
git status
git log --oneline -5
```

**여기서 멈추고 한 번 동작 확인 후 다음 단계로.**

---

### Phase 2: MCP 서버 도커 셋업 (40분)

NAS에 MCP 서버를 도커로 띄웁니다.

#### 2-1. docker-compose 작성

`/volume1/dev/drivelog-mcp/docker-compose.yml` 생성:

```yaml
version: '3.8'

services:
  filesystem-mcp:
    # ⚠️ 정확한 이미지 이름은 검색 필요
    # 후보 1: ghcr.io/modelcontextprotocol/server-filesystem
    # 후보 2: 자체 빌드 (Dockerfile 필요)
    image: TBD
    restart: unless-stopped
    ports:
      - "127.0.0.1:3333:3333"  # localhost only — Cloudflare Tunnel만 외부 노출
    volumes:
      - /volume1/dev/drivelog:/workspace
    environment:
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}  # .env에 강력한 랜덤 문자열
    command:
      - --transport=streamable-http
      - --port=3333
      - --root=/workspace
      # 첫 1주일은 읽기 전용
      - --readonly

  # 배포용 shell MCP는 Phase 5에서 추가
```

#### 2-2. 인증 토큰 생성

```bash
# 강력한 랜덤 토큰 생성
openssl rand -hex 32
# 결과를 /volume1/dev/drivelog-mcp/.env 에 저장
echo "MCP_AUTH_TOKEN=<위에서 생성한 값>" > .env
chmod 600 .env
```

#### 2-3. 컨테이너 기동

```bash
cd /volume1/dev/drivelog-mcp
sudo docker-compose up -d
sudo docker-compose logs -f filesystem-mcp
```

**검증**: localhost에서 응답하는지

```bash
curl -H "Authorization: Bearer <토큰>" http://127.0.0.1:3333/
```

---

### Phase 3: Cloudflare Tunnel 설정 (60분)

NAS의 localhost:3333을 인터넷에 HTTPS로 노출.

#### 3-1. Cloudflare 계정 + 도메인

- Cloudflare 가입 (무료)
- 도메인이 없다면 무료 도메인 (Freenom 등) 또는 저렴한 .xyz 구매 ($1~2/년)
- 또는 Cloudflare가 제공하는 `<랜덤>.trycloudflare.com` 사용 가능 (테스트용)

#### 3-2. cloudflared 도커 추가

`docker-compose.yml`에 추가:

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - filesystem-mcp
```

#### 3-3. 터널 생성 (Cloudflare 웹 UI에서)

1. Cloudflare → Zero Trust → Networks → Tunnels → Create a tunnel
2. 이름: `drivelog-mcp`
3. 토큰 복사 → `.env`에 `CLOUDFLARE_TUNNEL_TOKEN=...` 저장
4. **Public Hostname** 설정:
   - Subdomain: `mcp`
   - Domain: 본인 도메인
   - Service: `http://filesystem-mcp:3333`
5. 저장

#### 3-4. Cloudflare Access 인증 추가 (중요)

같은 화면에서 Access Application 생성:
- Application: `drivelog-mcp`
- Domain: `mcp.본인도메인.com`
- Policy: Email is `tomcat@본인이메일.com`
- 저장

이제 `https://mcp.본인도메인.com`에 접속 시 Cloudflare가 이메일 인증 먼저 요구.

⚠️ **하지만 Anthropic 서버에서 자동 호출할 때는 이메일 매직링크가 안 통합니다.** 대신:
- **Service Auth** (Cloudflare Access의 service-to-service 토큰)
- 또는 **Bypass policy + MCP 자체 토큰**으로 방어

이 부분이 가장 까다로움 → Phase 4에서 결정.

---

### Phase 4: claude.ai에 Custom Connector 등록 (20분)

#### 4-1. 사전 확인

- Pro 플랜 이상이어야 Custom Connector 사용 가능 (Free는 1개 제한)
- 베타 기능이라 UI가 변동될 수 있음

#### 4-2. 등록

1. claude.ai → 우측 상단 프로필 → Settings
2. Connectors (또는 Integrations) 메뉴
3. Add custom connector
4. Name: `Drivelog NAS`
5. URL: `https://mcp.본인도메인.com/mcp` (정확한 path는 MCP 서버 구현에 따라 다름)
6. Advanced → Headers 에 `Authorization: Bearer <MCP_AUTH_TOKEN>` 추가
7. 저장

#### 4-3. 테스트

새 대화 시작 → 좌하단 + 버튼 → Connectors → `Drivelog NAS` 활성화

테스트 메시지: *"workspace 디렉토리 안에 있는 파일 목록 보여줘"*

성공 기준:
- ✅ 모바일에서 같은 대화 열어도 동일 동작
- ✅ list_directory 결과로 NAS의 drivelog 디렉토리 보임
- ✅ read_text_file로 README 읽기 가능

---

### Phase 5: 배포 자동화 (선택, 60~120분)

처음에는 없이 시작하고, 흐름 익숙해진 후 추가 권장.

#### 5-1. shell MCP 추가

`docker-compose.yml`에 두 번째 서비스:

```yaml
  shell-mcp:
    image: TBD  # mcp-shell-server 등
    ports:
      - "127.0.0.1:3334:3334"
    volumes:
      - /volume1/dev/drivelog:/workspace
      - /var/run/docker.sock:/var/run/docker.sock  # docker 명령용 (위험!)
    environment:
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN_SHELL}
      - ALLOWED_COMMANDS=git,npm,docker-compose
```

#### 5-2. 배포 스크립트

`/volume1/dev/drivelog/deploy_from_dev.sh`:

```bash
#!/bin/bash
set -e
cd /volume1/dev/drivelog
git pull origin main
git push origin main  # GitHub에 동기화
# 운영 환경 동기화
rsync -av --delete \
  /volume1/dev/drivelog/drivelog-admin/ \
  /volume1/docker/drivelog/drivelog-admin/
cd /volume1/docker/drivelog
sudo docker-compose restart api
echo "Deployed at $(date)"
```

#### 5-3. Cloudflare Tunnel에 두 번째 hostname 추가

`shell.본인도메인.com` → `http://shell-mcp:3334`

#### 5-4. claude.ai에 두 번째 Custom Connector 등록

```
모바일 대화: "대시보드 헤더 색을 빨간색으로 바꾸고 배포해줘"
  ↓
Drivelog NAS connector → 파일 수정
  ↓
Drivelog Deploy connector → deploy_from_dev.sh 실행
```

---

## 🛡️ 보안 체크리스트 (셋업 완료 후 반드시 확인)

- [ ] MCP 서버는 `127.0.0.1`로만 바인딩 (외부 직접 접근 차단)
- [ ] Cloudflare Tunnel을 통해서만 외부 노출
- [ ] Cloudflare Access 또는 강력한 토큰으로 1차 인증
- [ ] MCP 서버 자체에서 토큰 검증으로 2차 인증
- [ ] 작업 범위가 `/volume1/dev/drivelog`로 제한됨 (운영 `/volume1/docker/drivelog` 직접 접근 불가)
- [ ] `.env` 파일은 `chmod 600` + 백업/git 제외
- [ ] shell MCP는 화이트리스트 명령만 (위험: `rm -rf` 같은 명령 차단)
- [ ] 정기적으로 토큰 회전 (월 1회)
- [ ] Cloudflare Tunnel 로그 활성화 → 누가 언제 접근했는지 기록

---

## 🚨 무엇이 잘못될 수 있는가

### 시나리오 1: 토큰 노출
**완화**: Cloudflare Access를 1차 게이트로 두면 토큰만으로는 접근 불가

### 시나리오 2: MCP 서버 자체 취약점
**완화**: 작업 범위를 `/volume1/dev`로만 제한 → 최악의 경우에도 운영 환경은 안전

### 시나리오 3: Anthropic 측 인프라 사고
**완화**: 모든 변경은 Git에 기록 → 언제든 git revert 가능

### 시나리오 4: 모바일에서 실수로 잘못 지시
**완화**: shell MCP는 처음에 추가하지 말 것. 파일 수정만 가능하면 운영에 즉시 영향 없음 (배포는 PC에서 의식적으로)

---

## 📅 권장 단계별 진행

### Week 1: Phase 1~2 (NAS에 MCP 서버 띄우기 + 로컬 테스트)
- 외부 노출 없이 NAS 내부에서만 접근
- 동작 검증

### Week 2: Phase 3~4 (Cloudflare Tunnel + Connector 등록 — **읽기 전용**)
- 모바일에서 read_text_file, list_directory만 가능
- 1주일 운영하면서 안정성 확인

### Week 3: 쓰기 권한 활성화
- write_file, edit_file 활성화
- 작은 변경부터 (주석 수정, 파일명 변경 등)

### Week 4: shell MCP 추가 (선택)
- 배포 자동화
- 충분한 테스트 후

---

## 🆘 트러블슈팅

### "Anthropic 서버에서 접속 못 함"
- Cloudflare Tunnel 상태 확인: `sudo docker logs cloudflared`
- DNS 전파 확인: `dig mcp.본인도메인.com`
- Cloudflare Access policy가 Anthropic IP 차단하는지 확인

### "401 Unauthorized"
- Authorization 헤더가 정확히 전달되는지 확인
- 토큰 양 끝 공백 제거
- `Bearer ` 다음 한 칸 띄어쓰기 정확히

### "tool not found"
- MCP 서버가 streamable-http transport로 떠 있는지 (SSE는 deprecated)
- MCP 서버 endpoint path 확인 (`/`, `/mcp`, `/sse` 등 구현마다 다름)

### "파일은 보이는데 수정 안 됨"
- `--readonly` 플래그 끄기
- 컨테이너 내부 권한 확인 (`docker exec ... ls -la /workspace`)

---

## ✅ 성공 검증

다음이 모두 동작하면 셋업 완료:

1. [ ] PC Claude (현재 환경)에서 `Drivelog NAS` connector 활성화 후 `list_directory("/workspace")` 동작
2. [ ] 모바일 Claude 앱에서 같은 connector 활성화 후 동일 동작
3. [ ] 모바일에서 *"README.md의 첫 줄 보여줘"* 답변 받음
4. [ ] 모바일에서 *"backup 폴더에 test.md 파일 만들고 'hello' 적어줘"* 후 NAS에 실제 파일 생성됨
5. [ ] PC에서 git pull 했을 때 모바일에서 만든 파일이 동기화됨

---

## 📝 다음 세션을 위한 메모 자리

(셋업 진행 중 발견한 이슈/팁 기록)

```
[2026-04-XX]
- 


```

---

## 🔗 참고 링크

- Claude Custom Connectors: https://support.claude.com/en/articles/11175166
- MCP 공식 문서: https://modelcontextprotocol.io
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Cloudflare Access (무료 정책 50명까지): https://www.cloudflare.com/teams-pricing/
