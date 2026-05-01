// ============================================================
// 양양대리 (company_code=1012) 전체 사용자 비밀번호 일괄 변경
// 새 비밀번호: 11223344
//
// ⚠️ 주의: bcrypt 해시는 매번 다른 salt가 들어가서 매번 다른 해시 값이 나옴
//          (= 같은 비밀번호도 동일한 해시가 안 나옴)
// → 순수 SQL로는 불가능, Node.js로 해시 생성 후 UPDATE 실행해야 함
//
// 실행 방법 (NAS에서):
//   cd /volume1/docker/drivelog
//   sudo docker exec -i drivelog-api node /app/server/db/bulk_password_reset/run_yangyang_pw_reset.js
//   (또는 컨테이너 내부에서: node /app/server/db/bulk_password_reset/run_yangyang_pw_reset.js)
//
// 실행 결과:
//   - 1012 회사 소속 모든 사용자(MASTER, SUPER_ADMIN, RIDER 전체)의 비밀번호를 11223344로 변경
//   - password_must_change=FALSE, temp_password_expires_at=NULL (임시비번 플래그 해제)
//   - login_fail_count=0, locked_until=NULL (잠금 해제)
//   - 각 변경 건마다 password_history에 기록
//   - audit_logs에 BULK_PASSWORD_RESET 액션 기록
//
// 작성일: 2026-04-29
// ============================================================

const bcrypt = require('bcryptjs');
const path = require('path');

// dotenv 로드 시도 (없으면 조용히 무시 — docker-compose env를 이미 쓰고 있으면 자동으로 BCRYPT_ROUNDS 등이 process.env에 있음)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {
  // dotenv 없거나 .env 파일 없으면 무시 — BCRYPT_ROUNDS는 기본값 12 사용
}

const { pool } = require('../../config/database');

const TARGET_COMPANY_CODE = '1012';
const NEW_PASSWORD = '11223344';

async function main() {
  const conn = await pool.getConnection();
  let success = 0;
  let failed = 0;
  const failedUsers = [];

  try {
    // 1. 대상 회사 확인
    const [companies] = await conn.execute(
      'SELECT company_id, company_name FROM companies WHERE company_code = ?',
      [TARGET_COMPANY_CODE]
    );
    if (companies.length === 0) {
      console.error(`❌ company_code='${TARGET_COMPANY_CODE}' 인 회사를 찾을 수 없습니다.`);
      process.exit(1);
    }
    const company = companies[0];
    console.log(`\n📋 대상 회사: ${company.company_name} (company_id=${company.company_id}, code=${TARGET_COMPANY_CODE})`);

    // 2. 대상 사용자 목록 조회
    const [users] = await conn.execute(
      'SELECT user_id, login_id, name, role, status FROM users WHERE company_id = ? ORDER BY role, login_id',
      [company.company_id]
    );
    console.log(`\n👥 대상 사용자: 총 ${users.length}명`);
    users.forEach(u => {
      console.log(`   - ${u.role.padEnd(12)} | ${u.login_id.padEnd(20)} | ${u.name} | ${u.status}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️ 변경할 사용자가 없습니다.');
      process.exit(0);
    }

    // 3. 사용자 확인 절차 (CI/자동화에서는 환경변수로 자동 승인 가능)
    if (process.env.AUTO_CONFIRM !== 'YES') {
      console.log(`\n⚠️ 위 ${users.length}명의 비밀번호를 모두 "${NEW_PASSWORD}"로 변경합니다.`);
      console.log('   계속 진행하려면 환경변수 AUTO_CONFIRM=YES 를 붙여 다시 실행하세요.');
      console.log(`   예) sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/server/db/bulk_password_reset/run_yangyang_pw_reset.js`);
      process.exit(0);
    }

    // 4. bcrypt 해시 생성 (사용자별로 다른 salt → 동일 비번이지만 해시는 모두 다름)
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    console.log(`\n🔐 bcrypt rounds=${rounds}로 해시 생성 중...`);

    // 5. 트랜잭션 시작
    await conn.beginTransaction();

    for (const u of users) {
      try {
        const hash = await bcrypt.hash(NEW_PASSWORD, rounds);
        // 비밀번호 변경 + 임시비번 플래그 해제 + 잠금 해제
        await conn.execute(
          `UPDATE users SET 
             password_hash = ?, 
             password_must_change = FALSE,
             temp_password_expires_at = NULL,
             login_fail_count = 0,
             locked_until = NULL
           WHERE user_id = ?`,
          [hash, u.user_id]
        );
        // password_history에 기록
        await conn.execute(
          'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
          [u.user_id, hash]
        );
        // audit log
        await conn.execute(
          `INSERT INTO audit_logs (company_id, user_id, action, target_table, target_id, detail)
           VALUES (?, NULL, 'BULK_PASSWORD_RESET', 'users', ?, ?)`,
          [
            company.company_id,
            u.user_id,
            JSON.stringify({ login_id: u.login_id, reset_to: 'fixed_default', script: 'run_yangyang_pw_reset.js' })
          ]
        );
        success++;
        console.log(`   ✅ ${u.login_id} (${u.name}) — 변경 완료`);
      } catch (err) {
        failed++;
        failedUsers.push({ login_id: u.login_id, error: err.message });
        console.error(`   ❌ ${u.login_id} (${u.name}) — 실패: ${err.message}`);
      }
    }

    // 6. 커밋 (실패가 있어도 성공한 건은 커밋 — 부분 성공 허용)
    //    전체 롤백을 원하면 아래 if 블록을 주석 해제
    // if (failed > 0) {
    //   await conn.rollback();
    //   console.error(`\n❌ ${failed}건 실패 → 전체 롤백 완료`);
    //   process.exit(1);
    // }
    await conn.commit();

    console.log('\n========================================');
    console.log(`✅ 완료: 성공 ${success}건 / 실패 ${failed}건`);
    console.log(`   회사: ${company.company_name} (${TARGET_COMPANY_CODE})`);
    console.log(`   새 비밀번호: ${NEW_PASSWORD}`);
    console.log('========================================');

    if (failedUsers.length > 0) {
      console.log('\n실패한 사용자:');
      failedUsers.forEach(f => console.log(`   - ${f.login_id}: ${f.error}`));
    }

    process.exit(0);
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error('\n❌ 작업 중 오류 발생:', err);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

main();
