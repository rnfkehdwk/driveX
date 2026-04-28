/**
 * DriveLog Part 3 SQL 빌더 (4월 28일 재 마이그레이션) — Node.js 버전
 *
 * 사용법 (Git Bash):
 *   cd /c/Drivelog/backup/20260428_remigration
 *   npm install xlsx              ← 첫 1회만
 *   node build_part3.js
 *
 * 출력:
 *   C:\Drivelog\drivelog-admin\server\db\migration_20260428_part3.sql
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ===== 경로 =====
const SCRIPT_DIR = __dirname;
const EXCEL_PATH = path.join(SCRIPT_DIR, '데이터_마이그레이션2.xlsx');
const OUTPUT_PATH = 'C:\\Drivelog\\drivelog-admin\\server\\db\\migration_20260428_part3.sql';

if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`❌ 엑셀 파일을 찾을 수 없습니다: ${EXCEL_PATH}`);
  console.error(`   해결: 데이터_마이그레이션2.xlsx 파일을 ${SCRIPT_DIR} 폴더에 복사하세요.`);
  process.exit(1);
}

console.log(`📂 엑셀: ${EXCEL_PATH}`);
console.log(`📂 출력: ${OUTPUT_PATH}`);

// ===== 기사 약어 매핑 =====
const RIDER_MAP = {
  '범': '권경범', '빈': '임창빈', '원': '이대원', '환': '한창환',
  '흠': '유기흠', '옥': '조경옥', '균': '박정균', '화': '맹선화',
  '만': '손영만', '용': '이건용', '훈': '김지훈', '록': '손영록',
  '순': '고현순', '선화': '맹선화', '기흠': '유기흠', '창환': '한창환',
  '윤기흠': '유기흠', '균돈': '박정균', '조경옥돈': '조경옥', '손영만돈': '손영만',
  '이기사님': '이기사님', '현석': '현석', '삼': '삼',
  '임서현': '임서현', '신지훈': '신지훈',
};

function parseKDate(s) {
  if (s == null) return null;
  const m = String(s).match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if (!m) return null;
  let y = parseInt(m[1]);
  if (y < 100) y += 2000;
  return `${y.toString().padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function parseKTime(s) {
  if (s == null) return '21:00:00';
  s = String(s).trim().replace(/;/g, ':');
  if (s === 'D' || s === 'd' || s === '') return '21:00:00';
  const m = s.match(/(오전|오후)\s*(\d+):(\d+)(?::(\d+))?/);
  if (!m) return '21:00:00';
  let h = parseInt(m[2]);
  const mn = parseInt(m[3]);
  const sec = m[4] ? parseInt(m[4]) : 0;
  if (m[1] === '오후' && h < 12) h += 12;
  if (m[1] === '오전' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function sqlEscape(s) {
  if (s == null) return null;
  return String(s).replace(/'/g, "''");
}

function toSqlValue(v) {
  if (v == null || v === '') return 'NULL';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return String(v);
  }
  return `'${sqlEscape(v)}'`;
}

function mapRider(name) {
  if (name == null) return null;
  name = String(name).trim();
  if (!name) return null;
  if (RIDER_MAP[name]) return RIDER_MAP[name];
  if (name.endsWith('돈')) {
    const base = name.slice(0, -1);
    if (RIDER_MAP[base]) return RIDER_MAP[base];
    return base;
  }
  return name;
}

function isEmpty(v) {
  return v == null || v === '' || (typeof v === 'number' && isNaN(v));
}

// ===== 엑셀 읽기 =====
const wb = XLSX.readFile(EXCEL_PATH);
const ridesSheet = wb.Sheets['운행일지 데이터'];
const customersSheet = wb.Sheets['고객 데이터'];

if (!ridesSheet || !customersSheet) {
  console.error('❌ 시트를 찾을 수 없습니다 (운행일지 데이터 / 고객 데이터)');
  process.exit(1);
}

const rides = XLSX.utils.sheet_to_json(ridesSheet, { defval: null });
const customersAll = XLSX.utils.sheet_to_json(customersSheet, { defval: null });
const customers = customersAll.filter(
  (r) => r['고객코드'] != null && r['고객코드'] !== '총계'
);

console.log(`📊 운행: ${rides.length}건, 고객: ${customers.length}명`);

// ===== Part 3 SQL 빌드 =====
const out = [];
out.push('-- ============================================================');
out.push('-- DriveLog 4월 28일 재 마이그레이션 — Part 3/3');
out.push(`-- 1. 새 엑셀 운행 INSERT (${rides.length}건, No 1252~1429)`);
out.push('-- 2. customer_mileage.balance_after 재계산');
out.push('-- 3. customers.mileage_balance를 고객시트 누적값으로 SET');
out.push('-- 4. 최종 검증');
out.push('-- ============================================================');
out.push('-- ⚠️ Part 1과 Part 2 (이전 운행 SQL) 실행 후에 실행해야 함');
out.push('-- (Part 1에서 고객 안전망 INSERT가 이미 실행됨 → Part 2의 이전 운행도 이제 정상 매칭)');
out.push('');
out.push('SET @company_id = 3;');
out.push("SET @sa = (SELECT user_id FROM users WHERE login_id = 'cblim' LIMIT 1);");
out.push('');

out.push('-- ---------- 새 엑셀 운행 1252~1429 ----------');

let inserted = 0;
let earnCount = 0;
let useCount = 0;

for (const row of rides) {
  const no = parseInt(row['No']);
  const dateStr = parseKDate(row['년월일']);
  const timeStr = parseKTime(row['인입시간']);
  if (!dateStr) continue;

  const startedAt = `${dateStr} ${timeStr}`;
  const customerName = isEmpty(row['고객']) ? null : row['고객'];
  const fare = isEmpty(row['이용금액']) ? 0 : parseInt(row['이용금액']);
  const cash = isEmpty(row['현금결제']) ? 0 : parseInt(row['현금결제']);
  const mlUsed = isEmpty(row['mileage결제']) ? 0 : parseInt(row['mileage결제']);
  const mlEarn = isEmpty(row['mileage발생']) ? 0 : parseInt(row['mileage발생']);

  const riderFull = mapRider(row['운전기사']);
  const pickupFull = mapRider(row['픽업기사']);
  const startAddr = isEmpty(row['시작위치']) ? null : row['시작위치'];
  const endAddr = isEmpty(row['최종목적지']) ? null : row['최종목적지'];
  const partner = isEmpty(row['연결업체']) ? null : row['연결업체'];
  const memo = isEmpty(row['메모']) ? null : row['메모'];

  const riderSql = riderFull
    ? `(SELECT user_id FROM users WHERE name='${sqlEscape(riderFull)}' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1)`
    : '@sa';
  const pickupSql = pickupFull
    ? `(SELECT user_id FROM users WHERE name='${sqlEscape(pickupFull)}' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1)`
    : 'NULL';
  const custSql = customerName
    ? `(SELECT customer_id FROM customers WHERE name='${sqlEscape(customerName)}' AND company_id=@company_id LIMIT 1)`
    : 'NULL';
  const partnerSql = partner != null
    ? `(SELECT partner_id FROM partner_companies WHERE name LIKE '%${sqlEscape(String(partner))}%' AND company_id=@company_id LIMIT 1)`
    : 'NULL';

  out.push(`-- No.${no}: ${customerName || '(고객없음)'} / ${dateStr} / ${fare.toLocaleString()}`);
  out.push(
    `INSERT INTO rides(company_id,rider_id,pickup_rider_id,customer_id,partner_id,` +
    `status,start_address,end_address,started_at,ended_at,` +
    `total_fare,cash_amount,mileage_used,mileage_earned,final_amount,` +
    `payment_type_id,rider_memo) VALUES(` +
    `@company_id,${riderSql},${pickupSql},${custSql},${partnerSql},` +
    `'COMPLETED',${toSqlValue(startAddr)},${toSqlValue(endAddr)},` +
    `'${startedAt}','${startedAt}',${fare},${cash},${mlUsed},${mlEarn},${fare},` +
    `6,${toSqlValue(memo)});`
  );
  out.push('SET @rid=LAST_INSERT_ID();');

  if (mlUsed > 0 && customerName) {
    out.push(
      `INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,` +
      `description,ride_id,processed_by,created_at) ` +
      `SELECT (SELECT customer_id FROM customers WHERE name='${sqlEscape(customerName)}' ` +
      `AND company_id=@company_id LIMIT 1),@company_id,'USE',${mlUsed},0,` +
      `'운행 마일리지 사용',@rid,@sa,'${startedAt}' FROM dual WHERE ` +
      `(SELECT customer_id FROM customers WHERE name='${sqlEscape(customerName)}' ` +
      `AND company_id=@company_id LIMIT 1) IS NOT NULL;`
    );
    useCount++;
  }

  if (mlEarn > 0 && customerName) {
    out.push(
      `INSERT INTO customer_mileage(customer_id,company_id,type,amount,balance_after,` +
      `description,ride_id,processed_by,created_at) ` +
      `SELECT (SELECT customer_id FROM customers WHERE name='${sqlEscape(customerName)}' ` +
      `AND company_id=@company_id LIMIT 1),@company_id,'EARN',${mlEarn},0,` +
      `'운행 마일리지 적립',@rid,@sa,'${startedAt}' FROM dual WHERE ` +
      `(SELECT customer_id FROM customers WHERE name='${sqlEscape(customerName)}' ` +
      `AND company_id=@company_id LIMIT 1) IS NOT NULL;`
    );
    earnCount++;
  }

  out.push('');
  inserted++;
}

// ===== balance_after 재계산 =====
out.push('-- ---------- balance_after 재계산 ----------');
out.push(`UPDATE customer_mileage cm
INNER JOIN (
  SELECT mileage_id,
    @bal:=IF(@pc=customer_id,@bal+IF(type IN('EARN','ADJUST'),amount,-amount),IF(type IN('EARN','ADJUST'),amount,-amount)) AS cb,
    @pc:=customer_id AS _p
  FROM customer_mileage,(SELECT @bal:=0,@pc:=0) v
  WHERE company_id=@company_id ORDER BY customer_id,created_at,mileage_id
) c ON cm.mileage_id=c.mileage_id SET cm.balance_after=GREATEST(c.cb,0);`);
out.push('');

// ===== 고객 잔액 SET =====
out.push('-- ---------- 고객시트 누적값으로 잔액 덮어쓰기 (최종) ----------');
let totalBalance = 0;
for (const row of customers) {
  const name = String(row['고객코드']);
  const earn = parseInt(row['mileage발생의 SUM']) || 0;
  const used = parseInt(row['mileage결제의 SUM']) || 0;
  let bal = earn - used;
  if (bal < 0) bal = 0;
  totalBalance += bal;
  out.push(
    `UPDATE customers SET mileage_balance=${bal} ` +
    `WHERE name='${sqlEscape(name)}' AND company_id=@company_id;`
  );
}
out.push('');

// ===== 최종 검증 =====
out.push('-- ---------- 최종 검증 ----------');
out.push(`SELECT '운행 건수' AS item, COUNT(*) AS cnt FROM rides WHERE company_id=@company_id
UNION ALL SELECT '마일리지 거래 건수', COUNT(*) FROM customer_mileage WHERE company_id=@company_id
UNION ALL SELECT '마일리지 보유 고객(잔액>0)', COUNT(*) FROM customers WHERE company_id=@company_id AND mileage_balance>0
UNION ALL SELECT CONCAT('총 마일리지 잔액: ', FORMAT(SUM(mileage_balance),0),'원'), COUNT(*) FROM customers WHERE company_id=@company_id
UNION ALL SELECT '미매칭 운행 (customer_id NULL & total_fare>0)', COUNT(*) FROM rides WHERE company_id=@company_id AND customer_id IS NULL AND total_fare>0;`);
out.push('');
out.push('-- 예상 결과:');
out.push(`--   운행 건수: 약 1,286건 (이전 1,109 + 새 ${inserted})`);
out.push(`--   총 마일리지 잔액: ${totalBalance.toLocaleString()}원`);

// ===== 파일 저장 =====
const finalSql = out.join('\n');

// 출력 폴더 확인
const outDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, finalSql, 'utf-8');

console.log('');
console.log('✅ 완료!');
console.log(`   - 운행 INSERT: ${inserted}건`);
console.log(`   - EARN: ${earnCount}건, USE: ${useCount}건`);
console.log(`   - 고객 잔액 SET: ${customers.length}명, 합계 ${totalBalance.toLocaleString()}원`);
console.log(`   - 파일 크기: ${finalSql.length.toLocaleString()} chars`);
console.log(`   - 저장: ${OUTPUT_PATH}`);
