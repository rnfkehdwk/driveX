# 모바일↔PC GitHub Issue 큐 워크플로우

> **목적**: 모바일에서 PC 앞이 아닐 때도 시간을 활용해 DriveLog 개발에 기여
> **방식**: 모바일에서 GitHub Issue로 작업 등록 → PC에서 Claude가 일괄 처리
> **셋업 일자**: 2026-04-27
> **셋업 시간**: ~15분

---

## 🎯 이걸로 해결되는 문제

- "모바일에서는 코드 작업이 안 되니 시간 낭비"
- "이동 중에 떠오른 아이디어를 까먹는다"
- "PC 앞에 앉으면 뭘 먼저 할지 정리부터 다시 해야 한다"

이 워크플로우는 **모바일 = 설계/우선순위/지시 작성**, **PC = 구현** 으로 역할을 분리해서 양쪽 시간을 다 쓰게 만듭니다.

---

## 📱 모바일에서 — 작업 등록 워크플로우

### 패턴 A: 단순 변경 요청 (가장 빠름)

GitHub 모바일 앱 → `rnfkehdwk/driveX` 레포 → Issues → New Issue → "모바일 작업 요청" 템플릿 선택 → 양식 채우기 → 라벨 `from-mobile` 자동 → Submit

### 패턴 B: Claude와 설계 후 등록 (복잡한 작업)

1단계 — Claude 모바일 앱에서 대화:
```
"DriveLog 정산 페이지에서 기사별 정산 결과를 CSV로 내보내는 기능 만들고 싶어.
어떤 파일들 수정해야 할지, 어떤 순서로 하면 좋을지 정리해줘."
```

→ Claude가 정리해 줌

2단계 — Claude에게 이슈 본문 만들어달라고 요청:
```
"방금 정리한 내용을 GitHub Issue 본문 형식으로 만들어줘.
템플릿 항목: 무엇을 하고 싶은가, 영향 받을 파일, 완료 조건, 추가 컨텍스트"
```

3단계 — 결과 복사 → GitHub 모바일 앱에서 새 Issue → 본문에 붙여넣기 → Submit

### 패턴 C: 버그 발견 시

운영 중 버그 발견 (예: 모바일에서 DriveLog 사용 중 이상함):
- 스크린샷 찍기
- GitHub 모바일 앱에서 새 Issue → 스크린샷 첨부 + 재현 단계 적기
- 라벨: `from-mobile`, `priority-high`(급하면)

---

## 💻 PC에서 — 작업 처리 워크플로우

PC 앞에 앉으셨을 때, Claude 데스크탑 대화창에서 한 줄로 시작:

```
GitHub 레포 rnfkehdwk/driveX 의 from-mobile 라벨 붙은 최신 이슈 보고 작업해줘.
백업 → 수정 → 테스트 후 이슈에 결과 코멘트 남겨줘.
```

Claude가 알아서:
1. GitHub MCP(연결되어 있다면) 또는 web_fetch로 이슈 본문 읽기
2. 영향 받을 파일 백업 (`C:\Drivelog\backup\YYYYMMDD_HHMM_<topic>\`)
3. 코드 수정
4. 필요 시 테스트 / docker 재시작 안내
5. 이슈에 처리 결과 코멘트
6. 라벨 `from-mobile` → `done` 변경

> **주의**: PC Claude 대화창에 GitHub MCP 커넥터가 연결되어 있는지 확인. 없으면 `gh issue view` 같은 명령을 git bash에서 직접 실행하거나 Claude한테 web_fetch로 읽어달라고 요청.

---

## 🏷️ 라벨 시스템

| 라벨 | 색상 | 용도 |
|---|---|---|
| `from-mobile` | 보라 #a371f7 | 모바일에서 등록한 작업 (PC에서 처리 대상) |
| `priority-high` | 빨강 #d73a4a | 급함 |
| `priority-low` | 회색 #cccccc | 시간 날 때 |
| `area-admin` | 파랑 #0075ca | drivelog-admin |
| `area-mobile` | 초록 #0e8a16 | drivelog-mobile |
| `area-server` | 주황 #e99695 | server API |
| `done` | 진녹 #0e8a16 | 처리 완료 |
| `blocked` | 검정 #000000 | 막힌 거 (질문 필요) |

라벨 만드는 곳: https://github.com/rnfkehdwk/driveX/labels

---

## 🔁 일일 사이클 예시

### 09:00 출근길 (지하철 30분)
- Claude 모바일: "어제 작업한 마일리지 기능에서 추가하면 좋을 기능 5개 브레인스토밍해줘"
- 결과 중 마음에 드는 2개 → GitHub Issue 2개 생성

### 12:30 점심시간 (15분 여유)
- 운영 중 발견한 작은 버그 → 스크린샷 + Issue 등록

### 14:00 PC 앞
- Claude: "GitHub의 from-mobile + priority-high 이슈부터 처리해줘"
- 30분 만에 작은 거 3개 처리됨

### 19:00 퇴근길
- Claude 모바일: "오늘 처리된 이슈들 회고해줘. 패턴 있어?"
- 깨달음을 다시 다음날 우선순위에 반영

---

## ⚠️ 주의사항

### 모바일에서 절대 하지 말 것
- ❌ DB 스키마 변경 같은 위험한 작업을 모바일에서 한 줄로 등록
  - "PII 컬럼 모두 VARCHAR(255)로 변경" 같은 거는 PC에서 **직접 의식적으로** 진행
- ❌ 운영 중인 서비스 즉시 영향 작업
  - 양양대리 영업시간(저녁) 중에 배포 트리거되는 이슈 등록 금지
- ❌ 보안 관련 작업 (인증 로직, 비밀번호 처리)을 가벼운 이슈로 등록

### Issue 본문에 절대 적지 말 것
- ❌ API 키, DB 비밀번호, 토큰
- ❌ 고객 개인정보 (이름, 전화번호 등)
- ❌ 회사 내부 비밀

→ GitHub Issue는 **public 레포라면 인터넷에 공개됨**. driveX 레포가 public/private인지 확인.
   private이라도 GitHub 직원/AI 학습 데이터에는 들어갈 수 있다고 가정.

### PC Claude가 처리할 때 확인할 것
- ✅ 처리 전 백업 했는지
- ✅ 운영 환경에 영향 가는 변경이면 영업시간 피해서 배포
- ✅ 처리 후 이슈에 **무엇을 어떻게 바꿨는지** 코멘트 (다음 날 모바일에서 확인 가능)

---

## 🚀 더 발전시킬 수 있는 것 (나중에)

이 워크플로우가 익숙해지면 다음 단계:

1. **GitHub Actions로 부분 자동화**
   - `from-mobile` + `priority-high` 라벨 붙으면 알림
   - lint/test 자동 실행해서 이슈에 결과 코멘트

2. **모바일에서 직접 commit (작은 수정)**
   - GitHub 모바일 앱 → 파일 편집 → 직접 커밋
   - 오탈자 수정 같은 거에 유용

3. **github.dev (모바일 브라우저)**
   - `github.com/rnfkehdwk/driveX` URL을 `github.dev/rnfkehdwk/driveX`로 변경
   - 모바일 브라우저에서 VS Code 웹 IDE 열림
   - 화면은 답답하지만 진짜 코드 수정 가능

4. **(미래) MCP 원격 노출 셋업**
   - `C:\Drivelog\backup\20260427_remote_mcp_setup_FUTURE\` 에 가이드 보관
   - 검증된 사례가 생기거나 시간 여유 있을 때 도전

---

## 📋 첫 시도 체크리스트

- [ ] GitHub에서 라벨 8개 만들기 (위 표 참고)
- [ ] `.github/ISSUE_TEMPLATE/from-mobile.md` 커밋 & push
- [ ] 모바일 GitHub 앱 설치 & 로그인 (안 되어 있다면)
- [ ] **첫 테스트 이슈** 모바일에서 만들어보기 (예: "이 README에 워크플로우 설명 한 줄 추가")
- [ ] PC 앞에 와서 Claude한테 "테스트 이슈 처리해줘" 시켜보기
- [ ] 작동하면 본격 사용 시작 ✅

---

## 📝 운영 메모 자리

(쓰면서 발견하는 팁/이슈 기록)

```
[2026-04-XX]
-

[2026-04-XX]
-
```
