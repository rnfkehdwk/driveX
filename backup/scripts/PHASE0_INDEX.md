# Phase 0 — 백업 체계 구축 (인덱스)

> 작성: 2026-04-10
> 목적: 개인정보 암호화 작업 전 필수 안전망 구축
> 예상 소요: 약 1시간

---

## 📋 Phase 0 작업 흐름

```
1. 백업 폴더 생성 + 첫 풀백업 (수동)
        ↓
2. 자동 백업 스크립트 NAS에 설치
        ↓
3. 수동 실행 테스트
        ↓
4. DSM 작업 스케줄러 등록 (매일 03:00)
        ↓
5. PC1, PC2로 첫 백업 복사
        ↓
6. 복원 가이드 숙지 (또는 모의 복원 1회)
        ↓
✅ Phase 0 완료 → Phase 1 (인프라 보호) 진행 가능
```

---

## 📁 파일 목록

| 파일 | 용도 | 누가 | 어디서 |
|---|---|---|---|
| `PHASE0_INDEX.md` | 이 문서 (전체 인덱스) | - | - |
| `PHASE0_FIRST_BACKUP.md` | 첫 풀백업 절차 | 사용자 | NAS SSH |
| `PHASE0_AUTO_BACKUP_SETUP.md` | 자동 백업 설치 | 사용자 | NAS SSH + DSM |
| `PHASE0_RESTORE_GUIDE.md` | 복원 절차 (비상용) | 사용자 | NAS SSH |
| `drivelog_backup.sh` | 자동 백업 스크립트 | (NAS에 배치) | `/volume1/backup/drivelog/` |

---

## ✅ 진행 체크리스트

### 1단계 — 첫 풀백업

- [ ] NAS SSH 접속
- [ ] `/volume1/backup/drivelog/` 폴더 생성
- [ ] mariadb-dump로 첫 풀백업 1회
- [ ] 백업 파일 크기 + 무결성 확인 (head/tail/grep)

→ 가이드: `PHASE0_FIRST_BACKUP.md`

### 2단계 — 자동 백업 스크립트 설치

- [ ] `drivelog_backup.sh`를 NAS의 `/volume1/backup/drivelog/`로 업로드
- [ ] 실행 권한 부여 (`chmod +x`)
- [ ] root 소유로 변경 (`chown root:root`)
- [ ] 수동 실행 1회 (`sudo /volume1/backup/drivelog/drivelog_backup.sh`)
- [ ] 실행 결과 확인 (`backup.log` + 새 `.sql.gz` 파일)

→ 가이드: `PHASE0_AUTO_BACKUP_SETUP.md` 1~3절

### 3단계 — DSM 작업 스케줄러 등록

- [ ] DSM 웹UI 접속 → 제어판 → 작업 스케줄러
- [ ] 사용자 정의 스크립트 추가 (root, 매일 03:00)
- [ ] 즉시 실행으로 동작 확인
- [ ] 두 번째 백업 파일 생성 확인

→ 가이드: `PHASE0_AUTO_BACKUP_SETUP.md` 4절

### 4단계 — PC1, PC2 복사

- [ ] PC1에 백업 폴더 생성 (`C:\Drivelog\backup\db_snapshots\` 또는 사용자 선택)
- [ ] SCP 또는 File Station으로 첫 백업 파일 복사
- [ ] PC2에도 동일 작업

→ 가이드: `PHASE0_AUTO_BACKUP_SETUP.md` 6절

### 5단계 — 복원 가이드 숙지

- [ ] `PHASE0_RESTORE_GUIDE.md` 정독 (15분)
- [ ] 복원 체크리스트 인쇄해서 보관 (선택)
- [ ] (권장) 모의 복원 1회

→ 가이드: `PHASE0_RESTORE_GUIDE.md`

---

## 🎯 Phase 0 완료 기준

다음 조건 모두 충족 시 Phase 0 완료:

1. **백업 파일이 NAS에 1개 이상 존재**
   ```bash
   ls -lh /volume1/backup/drivelog/*.sql.gz
   ```

2. **자동 백업 스크립트가 NAS에 설치됨**
   ```bash
   ls -la /volume1/backup/drivelog/drivelog_backup.sh
   # -rwxr-xr-x ... drivelog_backup.sh
   ```

3. **수동 실행 1회 성공**
   ```bash
   tail -20 /volume1/backup/drivelog/backup.log
   # ✅ 백업 완료 메시지 보여야 함
   ```

4. **DSM 작업 스케줄러에 등록됨**
   - 제어판 → 작업 스케줄러 → "DriveLog DB 자동 백업" 보임 + 활성화 상태

5. **PC1, PC2에 첫 백업 복사됨**
   - PC1, PC2 각각의 폴더에 `.sql.gz` 파일 존재

6. **복원 가이드 읽음**

---

## ⚠️ Phase 0 완료 전 절대 금지

다음 작업들은 **Phase 0 완료 전에 절대 진행하면 안 됩니다**:

- 🔴 개인정보 암호화 마이그레이션
- 🔴 DB 스키마 변경 (ALTER TABLE)
- 🔴 데이터 일괄 UPDATE/DELETE
- 🔴 docker-compose down -v (볼륨 삭제)
- 🔴 컨테이너 재생성 + 마운트 변경
- 🔴 Synology 볼륨 암호화 마이그레이션 (기존 볼륨에 적용 시)

이 작업들은 모두 Phase 1, Phase 2 이후 백업이 확실히 작동하는 상태에서만 진행합니다.

---

## 📈 Phase 0 이후 계획

```
Phase 0: 백업 체계 ✅
   ↓
Phase 1: 인프라 보호
   - Synology 볼륨 암호화
   - DB 외부 포트 차단
   - 약 1시간
   ↓
Phase 2: PoC (utils/pii.js)
   - AES-256 헬퍼 작성
   - 유닛 테스트
   - 약 3시간
   ↓
Phase 3: 라우트 적용 (단계적)
   - users → customers → companies → partners
   - 약 10시간 (분산 권장)
   ↓
Phase 4: 마이그레이션 + 회귀 테스트
   - 평문 → 암호문 일괄 변환
   - 약 3시간
```

---

## 🆘 문제 발생 시

**1. 백업 스크립트가 동작 안 함**
→ `PHASE0_AUTO_BACKUP_SETUP.md` 트러블슈팅 절 확인

**2. 백업 파일이 0 bytes**
→ 권한 문제. `sudo`로 실행했는지, 백업 폴더가 있는지 확인

**3. cron이 동작 안 함**
→ Synology는 cron 대신 DSM 작업 스케줄러 사용 권장

**4. 복원해야 하는 비상 상황**
→ `PHASE0_RESTORE_GUIDE.md` 정독 후 진행. 절대 서두르지 말 것

**5. 어떤 단계에서 막힘**
→ 다음 세션에서 Claude에게 정확한 에러 메시지 + 어느 단계인지 알려주면 즉시 도움
