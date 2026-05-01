# DriveLog 세션 요약 — 2026-04-29 (저녁 추가 작업: 로그인 ID 변경 기능)

> **이전 세션**: `session_2026_04_29_summary.md` (16:00 ~ 18:00) — 3가지 버그 픽스 + .env 일원화 + ⭐ 즐겨찾기 고객별 특화 복원
> **이번 세션 주제**: 마스터/SA가 사용자(SA, RIDER) 로그인 ID를 변경할 수 있는 기능 추가
> **상태**: ✅ 코드 변경 완료, 사용자 배포 + 검증 대기 (4-30 진행 예정)

---

## 🎯 요청 배경

사용자 질문: "운행일지 작성하는 곳에 기사 매핑하잖아 그거 기사 코드로 하지? 기사 ID랑은 상관없지?"

### 사전 분석 결론

**운행일지 기사 매핑은 `users.user_id`(PK) 기반이며, `login_id`("기사 코드/로그인 ID")와 완전히 별개임.**

확인된 외래키 흐름:
- `rides.rider_id` → `users.user_id`
- `rides.pickup_rider_id` → `users.user_id`
- POST `/api/rides`: `req.user.user_id`로 자동 매핑
- 픽업기사 선택 모달: `setForm(f => ({ ...f, pickup_rider_id: d.user_id, ... }))`

**따라서 `login_id`를 변경해도 다음이 모두 안전:**
- 기존 운행일지 기사 매핑 ✅
- 콜 기록 (`calls.created_by`) ✅
- 마일리지 거래 (`customer_mileage.processed_by`) ✅
- 정산, 출퇴근, 픽업 기록 등 모든 FK ✅
- 본인 로그인 토큰의 user_id claim ✅ (다음 로그인부터 새 ID)

→ 사용자에게 "ID 변경은 안전한 작업"임을 설명하고, 권한 범위 결정 후 작업 진행.

### 결정된 권한 정책

- **MASTER**: 모든 회사의 모든 유저(MASTER 본인 포함, 다른 MASTER, SA, RIDER) login_id 변경 가능
- **SUPER_ADMIN**: 자기 회사 소속 RIDER만 login_id 변경 가능 (자기 자신, 다른 SA, MASTER는 불가)

---

## 🔧 변경 사항

### 1. 백엔드 — `drivelog-admin/server/routes/users.js`

**PUT `/api/users/:id`에 login_id 변경 로직 추가:**

```js
// 1) 형식 검증
if (newLoginId.length < 4 || newLoginId.length > 50) // 4~50자
if (!/^[a-zA-Z0-9_.-]+$/.test(newLoginId))           // 영문/숫자/_/-/. 만 허용

// 2) 권한 검증
if (req.user.role === 'SUPER_ADMIN') {
  if (target.company_id !== req.user.company_id) → 403
  if (target.role !== 'RIDER') → 403
}
// MASTER는 추가 검증 없음 (모든 유저 변경 가능)

// 3) 동일값 무시 (UPDATE에서 빠짐)
if (newLoginId === target.login_id) delete req.body.login_id;

// 4) UNIQUE 충돌 검사 (대상 본인 제외)
SELECT user_id FROM users WHERE login_id = ? AND user_id != ?
→ 충돌 시 409

// 5) 화이트리스트(allowed)에 'login_id' 추가
//    - MASTER: ['name', 'phone', 'email', 'vehicle_number', 'vehicle_type', 'status', 'role', 'company_id', 'login_id']
//    - SUPER_ADMIN: ['name', 'phone', 'email', 'vehicle_number', 'vehicle_type', 'status', 'role', 'login_id']
//      (SA가 'login_id' 보내도 위 권한 검증에서 본인/다른 SA/MASTER는 차단됨)

// 6) Audit log 'USER_LOGIN_ID_CHANGE' 별도 기록 (실제 변경된 경우만)
writeAuditLog({ action: 'USER_LOGIN_ID_CHANGE', detail: { old_login_id, new_login_id }, ... });

// 7) 응답에 변경 정보 포함
res.json({
  message: '...',
  login_id_changed: true/false,
  old_login_id, new_login_id  // 변경된 경우에만
});
```

### 2. 프런트엔드 — `drivelog-admin/client/src/pages/Users.jsx`

**추가된 state:**
```jsx
const [loginIdEdit, setLoginIdEdit] = useState(null); // { user_id, login_id, name, role }
const [newLoginId, setNewLoginId] = useState('');
const [savingLoginId, setSavingLoginId] = useState(false);
```

**추가된 권한 함수:**
```jsx
const canChangeLoginId = (u) => {
  if (isMaster) return true;              // MASTER: 모든 유저 가능
  if (currentUser?.role === 'SUPER_ADMIN') {
    return u.role === 'RIDER' && u.company_id === currentUser.company_id;
  }
  return false;
};
```

**추가된 핸들러:** `openLoginIdEdit`, `handleSaveLoginId`
- 클라이언트 측 사전 검증 (서버와 동일한 규칙)
- 본인 변경 시 추가 경고 메시지
- `updateUser(user_id, { login_id })` 호출

**UI 추가:**
- 각 행 액션 셀에 "🆔 ID변경" 버튼 (보라색, `canChangeLoginId(u)` 권한 통과 시만 표시)
- 페이지 끝에 ID 변경 전용 모달 (현재 ID 읽기 전용 + 새 ID 입력 + 안내문구)

---

## 📂 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `drivelog-admin/server/routes/users.js` | PUT `/:id`에 login_id 변경 로직 + 권한 검증 + audit log + 응답 확장 |
| `drivelog-admin/client/src/pages/Users.jsx` | state 3개 + 권한 함수 + 핸들러 + 액션 버튼 + 전용 모달 |

### 백업 위치
`C:\Drivelog\backup\20260429_login_id_edit\`:
- `users_route_20260429_2030.js` (백엔드 원본)
- `Users_jsx_20260429_2030.jsx` (프런트엔드 원본)
- `Users_jsx_20260429_2030_HEADER_NOTE.md` (작업 메모)

---

## 🚀 배포 명령

```bash
cd /c/drivelog
npm run deploy:all
```

**중요**: 백엔드(`users.js`) + 어드민 클라이언트(`Users.jsx`) 모두 변경됐으므로 `deploy:all` 또는 `deploy:server` + `deploy:admin` 모두 필요.

---

## ✅ 검증 체크리스트 (4-30)

### 백엔드 (PUT /api/users/:id)
- [ ] MASTER가 다른 MASTER login_id 변경 → 200 + 변경됨
- [ ] MASTER가 SA login_id 변경 → 200 + 변경됨
- [ ] MASTER가 RIDER login_id 변경 → 200 + 변경됨
- [ ] MASTER가 본인 login_id 변경 → 200 + 변경됨 (현재 세션 유지, 다음 로그인부터 새 ID)
- [ ] SA가 자기 회사 RIDER login_id 변경 → 200 + 변경됨
- [ ] SA가 자기 자신 login_id 변경 시도 → 403 (`관리자는 일반 기사의 로그인 ID만 변경할 수 있습니다`)
- [ ] SA가 다른 회사 RIDER login_id 변경 시도 → 403
- [ ] SA가 다른 SA login_id 변경 시도 → 403
- [ ] 이미 사용 중인 ID로 변경 시도 → 409 (`이미 사용 중인 로그인 ID입니다`)
- [ ] 한글/공백/특수문자 입력 → 400 (`로그인 ID는 영문/숫자/_/-/. 만 사용 가능합니다`)
- [ ] 3자 이하 입력 → 400 (`로그인 ID는 4~50자여야 합니다`)
- [ ] 51자 이상 입력 → 400
- [ ] 동일값 입력 → 200 (변경 사항 없음 메시지)
- [ ] audit_logs에 `USER_LOGIN_ID_CHANGE` 기록 확인 (detail에 old/new login_id)

### 프런트엔드 (Users.jsx)
- [ ] MASTER 로그인 → 모든 행에 "🆔 ID변경" 버튼 보임 (본인 행 포함)
- [ ] SA 로그인 → 자기 회사 RIDER 행에만 "🆔 ID변경" 버튼 보임
- [ ] SA 로그인 → 본인/다른 SA 행에는 "🆔 ID변경" 버튼 안 보임
- [ ] ID변경 버튼 클릭 → 모달 열리고 현재 ID + 입력란 + 안내문구 표시
- [ ] 새 ID 입력 후 [ID 변경] → confirm 다이얼로그 (본인 변경 시 별도 경고문) → API 호출 → 성공 alert + 목록 갱신
- [ ] 잘못된 형식 입력 → 클라이언트 측에서 alert 띄우고 API 호출 안 함
- [ ] 중복된 ID 입력 → 서버 응답 409 → "이미 사용 중인 로그인 ID입니다" alert
- [ ] 변경 후 해당 사용자가 새 ID로 로그인 가능, 기존 ID로는 401

### 운행일지/콜/마일리지 (외래키 무결성)
- [ ] login_id 변경한 RIDER의 기존 운행일지 → rider_name 정상 표시
- [ ] 해당 RIDER가 픽업기사로 들어간 운행일지 → pickup_rider_name 정상 표시
- [ ] 해당 RIDER가 작성한 콜 → 정상 조회됨
- [ ] 해당 RIDER가 처리한 마일리지 거래 → processed_by user_id 그대로 유지
- [ ] 정산 화면에서 해당 RIDER의 운행 통계 → 변동 없음

---

## 🛡️ 보안 고려사항 (반영 완료)

1. **이중 권한 검증**: 클라이언트(`canChangeLoginId`)와 서버(PUT 라우트 내 `req.user.role` 체크) 양쪽에서 검증
2. **화이트리스트 방식**: `allowed` 배열에 `login_id` 포함 여부를 권한별로 분기 → 무권한 사용자가 body에 login_id 넣어도 무시됨
3. **UNIQUE 충돌 검증**: 대상 본인 제외 후 중복 검사 (자기 자신 ID로 다시 저장 시 거짓 충돌 방지)
4. **형식 정규화**: trim() 후 저장 → 앞뒤 공백 사고 방지
5. **Audit log 별도 기록**: `USER_LOGIN_ID_CHANGE` 액션으로 추적 가능 (old_login_id, new_login_id 모두 detail에 저장)
6. **본인 변경 시 명시적 경고**: 클라이언트 confirm 다이얼로그에 "현재 세션은 유지되지만 다음 로그인부터 새 ID 사용" 안내

---

## 🧠 학습 포인트

- **DB 스키마 설계 원칙 재확인**: PK는 불변, business 식별자(login_id)는 변경 가능. user_id를 모든 FK의 root로 쓴 덕분에 login_id 변경이 무손실 작업이 됨.
- **MariaDB UNIQUE constraint**: `login_id VARCHAR(50) UNIQUE`이므로 DB 레벨에서도 중복 차단되지만, 사용자 친화적 에러 메시지를 위해 애플리케이션 레벨에서도 사전 검증 추가.
- **JWT 토큰 무관성**: 토큰의 sub claim은 `user_id`(숫자)이므로 login_id가 바뀌어도 현재 토큰은 유효함. 다음 로그인 때 새 ID로 인증되면 됨.

---

## 🔮 다음 세션 메모

- **PII Phase 2 (암호화)**: 보류 중 (사장님 결정 대기)
- **PHASE1 (볼륨 암호화 + DB 포트 차단)**: 개발 주기 끝날 때
- **잔여 미매칭 14건**: 운영 영향 없음
- **(추가 검토 가능)** SA가 자기 자신 login_id를 변경할 수 있도록 정책 완화 필요 시 — 현재는 비활성. 변경하려면 `canChangeLoginId`와 백엔드 권한 검증 양쪽 수정.
- **(추가 검토 가능)** login_id 변경 시 해당 사용자에게 알림(이메일/SMS) 발송 기능

---

**작성**: 2026-04-29 저녁 (login_id 변경 기능 작업 후)
**작업자**: Claude (코드) + Tomcat (배포/검증 예정)
**관련 문서**: `CLAUDE_SESSION_GUIDE.md`, `session_2026_04_29_summary.md`
