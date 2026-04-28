/**
 * DriveLog Part 1 SQL 빌더 (4월 28일 재 마이그레이션) — Node.js
 *
 * 이 스크립트는 Part 1 SQL을 생성합니다:
 *   1. 기존 마이그 데이터 cleanup (rides, customer_mileage 등)
 *   2. 고객 안전망 INSERT (고객시트 274명 NOT EXISTS)
 *      → 이전 마이그 매칭 실패였던 고객(상광정9702, 태산3801, 심미투싼 등)이
 *        사장님이 모바일로 등록 안 했어도 자동 INSERT됨
 *      → 이미 DB에 있는 고객은 NOT EXISTS로 자동 스킵
 *
 * 사용법 (Git Bash):
 *   cd /c/Drivelog/backup/20260428_remigration
 *   npm install xlsx              ← 첫 1회만 (이미 했으면 스킵)
 *   node build_part1.js
 *
 * 출력:
 *   C:\Drivelog\drivelog-admin\server\db\migration_20260428_part1.sql
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const EXCEL_PATH = path.join(SCRIPT_DIR, '데이터_마이그레이션2.xlsx');
const OUTPUT_PATH = 'C:\\Drivelog\\drivelog-admin\\server\\db\\migration_20260428_part1.sql';

if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`❌ 엑셀 파일을 찾을 수 없습니다: ${EXCEL_PATH}`);
  console.error(`   해결: 데이터_마이그레이션2.xlsx 파일을 ${SCRIPT_DIR} 폴더에 복사하세요.`);
  process.exit(1);
}

console.log(`📂 엑셀: ${EXCEL_PATH}`);
console.log(`📂 출력: ${OUTPUT_PATH}`);

function sqlEscape(s) {
  if (s == null) return null;
  return String(s).replace(/'/g, "''");
}

const wb = XLSX.readFile(EXCEL_PATH);
const customersSheet = wb.Sheets['고객 데이터'];
if (!customersSheet) {
  console.error('❌ "고객 데이터" 시트를 찾을 수 없습니다');
  process.exit(1);
}

const customersAll = XLSX.utils.sheet_to_json(customersSheet, { defval: null });
const customers = customersAll.filter(
  (r) => r['고객코드'] != null && r['고객코드'] !== '총계'
);

console.log(`📊 고객시트: ${customers.length}명`);

const out = [];
out.push('-- ============================================================');
out.push('-- DriveLog 4월 28일 재 마이그레이션 — Part 1/3');
out.push('-- 1. 기존 데이터 cleanup');
out.push(`-- 2. 고객 안전망 INSERT (고객시트 ${customers.length}명 NOT EXISTS)`);
out.push('--    이전 마이그 매칭 실패였던 고객(상광정9702, 태산3801, 심미투싼 등)');
out.push('--    사장님이 모바일로 등록 안 했어도 여기서 자동 INSERT됨');
out.push('--    이미 DB에 있는 고객은 NOT EXISTS로 자동 스킵');
out.push('-- ============================================================');
out.push('');
out.push('SET @company_id = 3;');
out.push("SET @sa = (SELECT user_id FROM users WHERE login_id = 'cblim' LIMIT 1);");
out.push('');
out.push('-- Step 0: 기존 마이그 데이터 전체 삭제');
out.push('DELETE FROM customer_mileage WHERE company_id = @company_id;');
out.push('DELETE FROM manual_gps_points WHERE ride_id IN (SELECT ride_id FROM rides WHERE company_id = @company_id);');
out.push('DELETE FROM settlement_rides WHERE ride_id IN (SELECT ride_id FROM rides WHERE company_id = @company_id);');
out.push('DELETE FROM rides WHERE company_id = @company_id;');
out.push('UPDATE customers SET mileage_balance = 0 WHERE company_id = @company_id;');
out.push('');
out.push(`-- Step 1: 고객시트 ${customers.length}명 전부 NOT EXISTS INSERT`);
out.push('-- (이미 DB에 있는 고객은 자동 스킵, 없는 고객만 신규 등록)');

for (const row of customers) {
  const name = String(row['고객코드']);
  out.push(
    `INSERT INTO customers(company_id,name,customer_code,mileage_balance,created_at,updated_at) ` +
    `SELECT @company_id,'${sqlEscape(name)}',` +
    `CONCAT('1012-C',LPAD(CAST((SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(customer_code,'-C',-1) AS UNSIGNED)),0) FROM customers cu WHERE cu.company_id=@company_id AND cu.customer_code LIKE '%-C%')+1 AS UNSIGNED),4,'0')),` +
    `0,NOW(),NOW() FROM dual ` +
    `WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name='${sqlEscape(name)}' AND company_id=@company_id);`
  );
}

out.push('');
out.push("SELECT 'Part 1 완료' AS status, (SELECT COUNT(*) FROM customers WHERE company_id=@company_id) AS customer_total;");

const finalSql = out.join('\n');

const outDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(OUTPUT_PATH, finalSql, 'utf-8');

console.log('');
console.log('✅ Part 1 완료!');
console.log(`   - 고객 NOT EXISTS INSERT: ${customers.length}명 (실제로는 DB에 없는 것만 INSERT됨)`);
console.log(`   - 파일 크기: ${finalSql.length.toLocaleString()} chars`);
console.log(`   - 저장: ${OUTPUT_PATH}`);
