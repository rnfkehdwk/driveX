# Phase 0 - 1단계: 첫 풀백업 (사용자 수동 실행)

> 작성: 2026-04-10
> 목적: 자동백업 스크립트를 만들기 전, 일단 한 번 백업을 떠놓는 것
> 실행 위치: NAS SSH

---

## 1. NAS SSH 접속

PC에서 터미널 열고:

```bash
ssh rnfkehdwk@rnfkehdwk.synology.me -p 30000
```

비밀번호 입력 후 접속.

---

## 2. 백업 폴더 생성 (한 번만)

```bash
sudo mkdir -p /volume1/backup/drivelog
sudo chmod 755 /volume1/backup/drivelog
ls -la /volume1/backup/
```

`drivelog/` 폴더가 보이면 OK.

---

## 3. 첫 풀백업 실행

```bash
# 날짜 변수 설정
NOW=$(date +%Y%m%d_%H%M%S)
echo "백업 시작 시각: $NOW"

# DB 풀 덤프 (단일 트랜잭션 + 루틴/트리거 포함)
sudo docker exec drivelog-db mariadb-dump \
  -uroot -p'Drivelog12!@' \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  drivelog_db > /volume1/backup/drivelog/drivelog_db_${NOW}.sql

# 결과 확인
ls -lh /volume1/backup/drivelog/
```

---

## 4. 백업 파일 검증

```bash
# 파일 크기 확인 (보통 수 MB ~ 수십 MB)
ls -lh /volume1/backup/drivelog/drivelog_db_*.sql

# 파일 내용 첫 30줄 확인 (CREATE TABLE 등이 보여야 정상)
head -30 /volume1/backup/drivelog/drivelog_db_${NOW}.sql

# 마지막 5줄 확인 (-- Dump completed 같은 게 보여야 정상)
tail -5 /volume1/backup/drivelog/drivelog_db_${NOW}.sql

# 데이터 건수 확인용 grep
grep -c "INSERT INTO" /volume1/backup/drivelog/drivelog_db_${NOW}.sql
```

---

## 5. 정상 결과 예시

```
$ ls -lh /volume1/backup/drivelog/
-rw-r--r-- 1 root root  12M Apr 10 18:30 drivelog_db_20260410_183000.sql

$ head -30 ...
-- MariaDB dump 10.19  Distrib 10.11.x-MariaDB
-- Server version       10.11.x-MariaDB-...
...
DROP TABLE IF EXISTS `app_billing`;
CREATE TABLE `app_billing` (...

$ tail -5 ...
-- Dump completed on 2026-04-10 18:30:15

$ grep -c "INSERT INTO" ...
347   ← 대략 INSERT 개수 (테이블 건수에 따라)
```

✅ **모두 OK면 1단계 완료**.

---

## 6. PC1, PC2로 복사 (사용자 직접)

NAS에 백업이 생긴 후, 본인 PC로도 복사:

### Windows에서 SCP로 복사
```cmd
# Windows PowerShell 또는 Git Bash
scp -P 30000 rnfkehdwk@rnfkehdwk.synology.me:/volume1/backup/drivelog/drivelog_db_*.sql C:\Drivelog\backup\db\
```

또는 **Synology File Station 웹UI**로 다운로드:
1. https://rnfkehdwk.synology.me:5001 접속
2. File Station 열기
3. `backup/drivelog/` 폴더 이동
4. `.sql` 파일 우클릭 → 다운로드

---

## ⚠️ 트러블슈팅

### "Access denied for user 'root'"
DB root 비밀번호가 다른 경우. CLAUDE_SESSION_GUIDE 확인 — 현재는 `Drivelog12!@`.

### "docker exec: command not found"
Synology DSM 7.2 이상은 `sudo synowebapi --exec ...` 또는 `sudo /usr/local/bin/docker` 시도.
또는 `sudo docker` 대신 그냥 `docker` (사용자 권한에 따라).

### "No such container: drivelog-db"
```bash
sudo docker ps | grep drivelog
```
실제 컨테이너 이름 확인 후 명령 수정.

### 백업 파일이 0 bytes
권한 문제 가능. `sudo` 누락 또는 `>` 리다이렉트가 sudo 권한 밖에서 실행됨.
해결:
```bash
sudo bash -c 'docker exec drivelog-db mariadb-dump -uroot -pDrivelog12!@ --single-transaction drivelog_db > /volume1/backup/drivelog/drivelog_db_$(date +%Y%m%d_%H%M%S).sql'
```

---

## 다음 단계 (1단계 완료 후)

`PHASE0_AUTO_BACKUP_SETUP.md` 파일 확인 → 자동 백업 스크립트 설치
