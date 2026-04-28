# 4월 28일 재 마이그레이션 빌드 가이드 (Node.js)

## 🎯 핵심 — 누락 고객 자동 처리

이번 마이그에서 **사장님이 모바일로 신규 등록하지 못한 고객들도 자동으로 처리**됩니다.

### 작동 방식

**Part 1 SQL의 안전망**:
- 새 엑셀의 고객시트 274명 전부에 대해 `NOT EXISTS` INSERT 시도
- 이미 DB에 있는 고객 → 자동 스킵 ✅
- DB에 없는 고객 (예: 사장님이 등록 안 한 `상광정9702`, `태산3801`) → **자동 INSERT** ✅

**그 결과**:
- Part 2 (이전 v3의 운행 1~1250) 실행 시 모든 고객 매칭 ✅
- 이전 마이그의 매칭 실패 59건 문제가 **해결됨**

---

## 🚀 빌드 실행 (Windows / Git Bash)

### Step 1. 엑셀 파일 복사

```
사장님이 갖고 계신 데이터_마이그레이션2.xlsx
   → C:\Drivelog\backup\20260428_remigration\
```

### Step 2. 빌드 실행

```bash
cd /c/Drivelog/backup/20260428_remigration

# 첫 1회만 — xlsx 라이브러리 설치
npm install xlsx

# Part 1 빌드 (cleanup + 고객 안전망 INSERT 274명)
node build_part1.js

# Part 3 빌드 (새 운행 177건 + 잔액 재계산 + 잔액 SET)
node build_part3.js
```

### 성공 시 출력

```
[Part 1]
📊 고객시트: 274명
✅ Part 1 완료!
   - 고객 NOT EXISTS INSERT: 274명 (실제로는 DB에 없는 것만 INSERT됨)
   - 파일 크기: 약 108,000 chars
   - 저장: C:\Drivelog\drivelog-admin\server\db\migration_20260428_part1.sql

[Part 3]
📊 운행: 177건, 고객: 274명
✅ 완료!
   - 운행 INSERT: 177건
   - EARN: 140건, USE: 6건
   - 고객 잔액 SET: 274명, 합계 2,817,200원
   - 파일 크기: 약 176,000 chars
   - 저장: C:\Drivelog\drivelog-admin\server\db\migration_20260428_part3.sql
```

---

## 📋 빌드 후 NAS 실행 순서

빌드 완료 후 NAS에서 (`EXECUTION_GUIDE.md` 상세 참고):

```
1. SQL 파일 NAS에 업로드 (npm run deploy:server 또는 scp)
2. NAS에서 sed로 Part 2 추출 (이전 v3의 No 1~1250 부분)
3. Part 1 → 2 → 3 순서로 mariadb에 실행
4. 검증
```

---

## ❓ 트러블슈팅

### "Cannot find module 'xlsx'"
```bash
cd /c/Drivelog/backup/20260428_remigration
npm install xlsx
```

### "엑셀 파일을 찾을 수 없습니다"
탐색기에서 엑셀을 backup 폴더에 복사하거나:
```bash
cp /c/path/to/데이터_마이그레이션2.xlsx /c/Drivelog/backup/20260428_remigration/
```

### Node.js가 없을 때
DriveLog는 Node 기반이라 100% 깔려있을 겁니다:
```bash
node --version
# v18.x 또는 v20.x 등 떠야 함
```
