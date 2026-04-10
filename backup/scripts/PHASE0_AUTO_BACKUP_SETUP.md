# Phase 0 - 2단계: 자동 백업 설치 가이드

> 작성: 2026-04-10
> 사전 조건: `PHASE0_FIRST_BACKUP.md`로 첫 풀백업 완료
> 실행 위치: NAS SSH

---

## 1. 스크립트 NAS에 업로드

PC에서 SCP로 NAS에 복사:

```bash
# Windows Git Bash 또는 PowerShell
scp -P 30000 C:\Drivelog\backup\scripts\drivelog_backup.sh \
    rnfkehdwk@rnfkehdwk.synology.me:/tmp/drivelog_backup.sh
```

또는 **Synology File Station 웹UI**:
1. 웹브라우저로 `https://rnfkehdwk.synology.me:5001` 접속
2. File Station 열기
3. `/volume1/backup/drivelog/` 폴더 이동
4. `drivelog_backup.sh` 파일 업로드

---

## 2. NAS에서 스크립트 위치 잡기 + 권한 부여

```bash
# NAS SSH 접속
ssh rnfkehdwk@rnfkehdwk.synology.me -p 30000

# /tmp에 올렸다면 백업 폴더로 이동
sudo mv /tmp/drivelog_backup.sh /volume1/backup/drivelog/drivelog_backup.sh

# 또는 File Station으로 직접 폴더에 올렸으면 이동 불필요

# 실행 권한 부여
sudo chmod +x /volume1/backup/drivelog/drivelog_backup.sh

# root 소유로 변경 (cron이 root로 돌리기 위해)
sudo chown root:root /volume1/backup/drivelog/drivelog_backup.sh

# 확인
ls -la /volume1/backup/drivelog/drivelog_backup.sh
# -rwxr-xr-x 1 root root  4321 Apr 10 18:30 drivelog_backup.sh
```

---

## 3. 스크립트 수동 실행 테스트

자동 등록 전에 손으로 한 번 돌려보고 정상 동작 확인:

```bash
sudo /volume1/backup/drivelog/drivelog_backup.sh
```

성공 시 출력 예:
```
[2026-04-10 18:35:00] ==========================================
[2026-04-10 18:35:00] DriveLog 백업 시작
[2026-04-10 18:35:00] 디스크 여유: 245680MB
[2026-04-10 18:35:00] DB 덤프 실행 중...
[2026-04-10 18:35:03] 덤프 파일 검증 OK
[2026-04-10 18:35:03] gzip 압축 중...
[2026-04-10 18:35:05] ✅ 백업 완료: drivelog_db_20260410_183500.sql.gz (3.2M)
[2026-04-10 18:35:05] 오래된 백업 정리 중 (14일 초과)...
[2026-04-10 18:35:05] 삭제할 오래된 백업 없음
[2026-04-10 18:35:05] 현재 백업 보유: 2개 (총 15M)
[2026-04-10 18:35:05] DriveLog 백업 종료
```

확인:
```bash
ls -lh /volume1/backup/drivelog/
cat /volume1/backup/drivelog/backup.log
```

---

## 4. Synology DSM 작업 스케줄러 등록 (권장)

Synology는 cron보다 **DSM 작업 스케줄러**를 쓰는 게 표준입니다. cron은 DSM 업데이트 시 초기화될 수 있어서 권장하지 않습니다.

### 4.1 등록 절차

1. 웹브라우저 → `https://rnfkehdwk.synology.me:5001` 접속
2. **제어판** → **작업 스케줄러** 클릭
3. **생성** → **예약된 작업** → **사용자 정의 스크립트** 선택
4. **일반** 탭:
   - 작업: `DriveLog DB 자동 백업`
   - 사용자: `root`
   - 활성화: ✅ 체크
5. **스케줄** 탭:
   - 매일 실행
   - 시간: `03:00` (새벽 3시 권장)
   - 첫 실행 날짜: 오늘
6. **작업 설정** 탭:
   - 사용자 정의 스크립트:
     ```
     /volume1/backup/drivelog/drivelog_backup.sh
     ```
   - 작업 출력 결과 설정:
     - ✅ 실행 결과 세부 정보 저장
     - 결과 디렉토리: `/volume1/backup/drivelog/`
     - ✅ 작업이 비정상 종료되면 알림 보내기 (이메일 설정되어 있다면)
7. **확인** 클릭

### 4.2 동작 검증

작업 스케줄러 목록에서 방금 만든 작업 우클릭 → **실행** → 즉시 실행됨.
약 10초 뒤 `/volume1/backup/drivelog/`에 새 백업 파일이 생기면 OK.

---

## 5. 운영 모니터링

### 5.1 매일 백업 확인 (사용자 습관)

```bash
# NAS에 SSH 접속해서
ls -lht /volume1/backup/drivelog/*.sql.gz | head -5
```

가장 최근 파일이 오늘 날짜인지 확인.

### 5.2 백업 로그 확인

```bash
tail -50 /volume1/backup/drivelog/backup.log
```

### 5.3 백업 파일 크기 추이

```bash
ls -lhS /volume1/backup/drivelog/*.sql.gz
```

크기가 갑자기 작아졌다면 (예: 평소 5MB인데 1MB) → 데이터 손실 의심 → 즉시 점검.

---

## 6. PC1, PC2로 복사 (사용자 정기 작업)

NAS만 백업하면 NAS 사고 시 다 잃습니다. **사용자께서 결정하신 PC1/PC2 복사 작업**을 정기적으로 해주세요.

### 6.1 추천 주기

- **주 1회 이상** (월요일 아침 등)
- **암호화 작업/마이그레이션 직전** (이번 작업 같은 큰 변경 전)

### 6.2 복사 방법

**옵션 1: SCP (명령행)**
```bash
# Windows PowerShell 또는 Git Bash
mkdir -p C:\Drivelog\backup\db_snapshots\$(date +%Y%m%d)
scp -P 30000 rnfkehdwk@rnfkehdwk.synology.me:/volume1/backup/drivelog/drivelog_db_*.sql.gz \
    C:\Drivelog\backup\db_snapshots\
```

**옵션 2: Synology Drive Client (자동 동기화)**
- DSM에 Synology Drive Server 설치
- PC에 Synology Drive Client 설치
- `/volume1/backup/drivelog/` 폴더를 PC와 동기화 설정
- 자동으로 새 백업 파일이 PC에 복사됨

**옵션 3: Synology File Station 다운로드**
- 웹UI로 폴더 접속 → 우클릭 → 다운로드

### 6.3 PC 보관 위치 권장

```
PC1: D:\Backup\Drivelog\db\           (주 보관)
PC2: D:\Backup\Drivelog\db_mirror\    (미러)
```

월별 정리:
```
D:\Backup\Drivelog\db\
├── 2026-03\
│   └── drivelog_db_2026030?_*.sql.gz
├── 2026-04\
│   └── drivelog_db_2026040?_*.sql.gz
└── ...
```

---

## ⚠️ 트러블슈팅

### "permission denied"
스크립트 권한 또는 실행 사용자 문제.
```bash
sudo chmod +x /volume1/backup/drivelog/drivelog_backup.sh
```

### "docker: command not found" (cron에서만 발생)
DSM 스케줄러는 환경변수가 빈 채로 시작. 스크립트 상단에 PATH 추가:
```bash
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
```

### "mariadb-dump: command not found"
컨테이너 안에 mariadb-dump가 없는 경우 (구버전). 대체:
```bash
docker exec drivelog-db mysqldump -uroot -pDrivelog12!@ ...
```

### 백업 파일이 0 bytes
`>` 리다이렉트가 sudo 권한 밖에서 실행됨. 스크립트를 root로 실행:
```bash
sudo /volume1/backup/drivelog/drivelog_backup.sh
```

### 디스크 가득 참
스크립트가 14일 이전 백업을 자동 삭제하지만, 만약 NAS 전체가 가득 차면 동작 안 함.
```bash
df -h /volume1/
```

---

## 다음 단계 (Phase 0 완료 확인)

### 체크리스트

- [ ] `PHASE0_FIRST_BACKUP.md` — 첫 풀백업 완료
- [ ] `drivelog_backup.sh` — NAS에 업로드 + 실행 권한
- [ ] 수동 실행 테스트 성공
- [ ] DSM 작업 스케줄러 등록 (매일 03:00)
- [ ] 즉시 실행으로 한 번 더 동작 확인
- [ ] PC1, PC2에 첫 백업 복사 완료
- [ ] `PHASE0_RESTORE_GUIDE.md` (다음 파일) 읽기

모두 ✅면 **Phase 0 완료** → **Phase 1 (인프라 보호) 진행 가능**.
