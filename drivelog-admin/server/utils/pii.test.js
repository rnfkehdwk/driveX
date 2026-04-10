/**
 * pii.test.js — pii.js 자체 검증 스크립트
 *
 * 사용법:
 *   cd C:\Drivelog\drivelog-admin\server
 *   set PII_ENC_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
 *   node utils/pii.test.js
 *
 *   (Linux/NAS)
 *   PII_ENC_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
 *     node utils/pii.test.js
 *
 * 통과 기준
 *   - 모든 [PASS] 로그 출력
 *   - [FAIL] 하나도 없음
 *   - 마지막에 'ALL TESTS PASSED' 출력
 *
 * 이 스크립트는 절대 운영 DB 에 접근하지 않음 (메모리 내 검증만)
 */

'use strict';

// 키가 없으면 임시 키 주입 (테스트 전용)
if (!process.env.PII_ENC_KEY) {
  process.env.PII_ENC_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  console.log('[test] PII_ENC_KEY 미설정 → 테스트용 임시 키 사용');
}

const pii = require('./pii');

let pass = 0;
let fail = 0;

function eq(name, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  [PASS] ${name}`);
    pass++;
  } else {
    console.error(`  [FAIL] ${name}`);
    console.error(`         expected: ${JSON.stringify(expected)}`);
    console.error(`         actual:   ${JSON.stringify(actual)}`);
    fail++;
  }
}

function truthy(name, val) {
  if (val) { console.log(`  [PASS] ${name}`); pass++; }
  else { console.error(`  [FAIL] ${name} → ${JSON.stringify(val)}`); fail++; }
}

function section(title) {
  console.log('\n=== ' + title + ' ===');
}

// ─────────────────────────────────────────────────────────────
section('1. NAME');
// ─────────────────────────────────────────────────────────────

const n1 = '홍길동';
const n1e = pii.encryptName(n1);
console.log('  홍길동 →', n1e);
truthy('첫 글자(홍) 평문 유지', n1e.startsWith('홍'));
truthy('DLE1 마커 포함', n1e.includes('DLE1'));
eq('복호화 round-trip', pii.decryptName(n1e), n1);

const n2 = '김';
const n2e = pii.encryptName(n2);
console.log('  김 (1자) →', n2e);
truthy('1자 이름은 전체 토큰 (DLE1로 시작)', n2e.startsWith('DLE1'));
eq('1자 복호화', pii.decryptName(n2e), n2);

const n3 = 'John Smith';
const n3e = pii.encryptName(n3);
console.log('  John Smith →', n3e);
truthy('영문 첫 글자 J 유지', n3e.startsWith('J'));
eq('영문 복호화', pii.decryptName(n3e), n3);

eq('name 멱등성 (재암호화 시 그대로)', pii.encryptName(n1e), n1e);
eq('null name', pii.encryptName(null), null);
eq('empty name', pii.encryptName(''), '');
eq('평문 그대로 복호화', pii.decryptName('홍길동'), '홍길동');

// 결정론 검증
eq('같은 평문 → 같은 암호문', pii.encryptName('이순신'), pii.encryptName('이순신'));
truthy('다른 평문 → 다른 암호문', pii.encryptName('이순신') !== pii.encryptName('이순이'));

// ─────────────────────────────────────────────────────────────
section('2. PHONE');
// ─────────────────────────────────────────────────────────────

const p1 = '010-1234-5678';
const p1e = pii.encryptPhone(p1);
console.log('  010-1234-5678 →', p1e);
truthy('앞 010 평문 유지', p1e.startsWith('010'));
truthy('뒤 5678 평문 유지', p1e.endsWith('5678'));
truthy('DLE1 마커 포함', p1e.includes('DLE1'));
eq('복호화 (정규화된 형식)', pii.decryptPhone(p1e), '01012345678');

const p2 = '01092209702';
const p2e = pii.encryptPhone(p2);
console.log('  01092209702 (하이픈 없는) →', p2e);
eq('하이픈 있는/없는 동일 평문 → 동일 암호문', pii.encryptPhone('010-9220-9702'), p2e);

const p3 = '033-672-0000';
const p3e = pii.encryptPhone(p3);
console.log('  033-672-0000 →', p3e);
truthy('지역번호 앞 033 유지', p3e.startsWith('033'));
truthy('지역번호 뒤 0000 유지', p3e.endsWith('0000'));
eq('지역번호 복호화', pii.decryptPhone(p3e), '0336720000');

const p4 = '02-123-4567';
const p4e = pii.encryptPhone(p4);
console.log('  02-123-4567 (9자리) →', p4e);
truthy('서울 9자리 02 유지', p4e.startsWith('02'));
eq('9자리 복호화', pii.decryptPhone(p4e), '021234567');

const pBad = '게좌이제';
const pBadE = pii.encryptPhone(pBad);
console.log('  게좌이제 (잘못된 데이터) →', pBadE);
eq('잘못된 데이터는 평문 그대로', pBadE, '게좌이제');
truthy('잘못된 데이터는 DLE1 없음', !pBadE.includes('DLE1'));

eq('phone 멱등성', pii.encryptPhone(p1e), p1e);
eq('null phone', pii.encryptPhone(null), null);
eq('empty phone', pii.encryptPhone(''), '');

// formatPhone
eq('formatPhone 11자리', pii.formatPhone('01012345678'), '010-1234-5678');
eq('formatPhone 10자리 02', pii.formatPhone('0212345678'), '02-1234-5678');
eq('formatPhone 10자리 지역', pii.formatPhone('0336720000'), '033-672-0000');
eq('formatPhone 9자리 02', pii.formatPhone('021234567'), '02-123-4567');

// normalizePhone
eq('normalize 하이픈 제거', pii.normalizePhone('010-1234-5678'), '01012345678');
eq('normalize 공백 제거', pii.normalizePhone('010 1234 5678'), '01012345678');
eq('normalize 한글 제거', pii.normalizePhone('010-1234-5678 (집)'), '01012345678');

// ─────────────────────────────────────────────────────────────
section('3. EMAIL');
// ─────────────────────────────────────────────────────────────

const e1 = 'hong1234@example.com';
const e1e = pii.encryptEmail(e1);
console.log('  hong1234@example.com →', e1e);
truthy('local 앞 2자(ho) 평문', e1e.startsWith('ho'));
truthy('도메인 평문', e1e.endsWith('@example.com'));
truthy('DLE1 마커 포함', e1e.includes('DLE1'));
eq('email 복호화', pii.decryptEmail(e1e), e1);

const e2 = 'ab@test.co.kr';
const e2e = pii.encryptEmail(e2);
console.log('  ab@test.co.kr (local 2자) →', e2e);
truthy('local 2자 → 전체 암호화', e2e.startsWith('DLE1'));
truthy('도메인 평문 유지', e2e.includes('@test.co.kr'));
eq('짧은 local 복호화', pii.decryptEmail(e2e), e2);

const e3 = 'a@b.com';
const e3e = pii.encryptEmail(e3);
console.log('  a@b.com (local 1자) →', e3e);
eq('1자 local 복호화', pii.decryptEmail(e3e), e3);

const eBad = 'no-at-sign';
eq('@ 없는 이메일은 평문 그대로', pii.encryptEmail(eBad), eBad);

eq('email 멱등성', pii.encryptEmail(e1e), e1e);
eq('null email', pii.encryptEmail(null), null);
eq('평문 이메일 복호화 (백필 도중)', pii.decryptEmail('plain@test.com'), 'plain@test.com');

// ─────────────────────────────────────────────────────────────
section('4. LICENSE');
// ─────────────────────────────────────────────────────────────

const l1 = '11-12-345678-90';
const l1e = pii.encryptLicense(l1);
console.log('  11-12-345678-90 →', l1e);
truthy('license 전체 토큰 (DLE1 시작)', l1e.startsWith('DLE1'));
truthy('원본 길이보다 김', l1e.length > l1.length);
eq('license 복호화', pii.decryptLicense(l1e), l1);

eq('license 멱등성', pii.encryptLicense(l1e), l1e);
eq('null license', pii.encryptLicense(null), null);
eq('평문 license 복호화', pii.decryptLicense('PLAIN123'), 'PLAIN123');

// ─────────────────────────────────────────────────────────────
section('5. SCHEMA / encryptFields / decryptFields');
// ─────────────────────────────────────────────────────────────

const customer = {
  customer_id: 271,
  name: '박준희',
  phone: '010-1234-5678',
  email: 'parkjh@gmail.com',
  mileage_balance: 12000,
};

const customerE = pii.encryptFields(customer, pii.SCHEMA.customers);
console.log('  customer 암호화:', customerE);
truthy('customer_id 변경 안 됨', customerE.customer_id === 271);
truthy('mileage_balance 변경 안 됨', customerE.mileage_balance === 12000);
truthy('name 암호화됨', customerE.name.includes('DLE1'));
truthy('phone 암호화됨', customerE.phone.includes('DLE1'));
truthy('email 암호화됨', customerE.email.includes('DLE1'));
truthy('원본 객체 변경 안 됨 (immutable)', customer.name === '박준희');

const customerD = pii.decryptFields(customerE, pii.SCHEMA.customers);
console.log('  customer 복호화:', customerD);
eq('name round-trip', customerD.name, '박준희');
eq('phone round-trip (정규화)', customerD.phone, '01012345678');
eq('email round-trip', customerD.email, 'parkjh@gmail.com');

// users 스키마 (license 포함)
const user = {
  user_id: 8,
  login_id: 'cblim',
  name: '임창빈',
  phone: '010-9999-8888',
  email: 'cblim@daum.net',
  driver_license: '11-22-333333-44',
};
const userE = pii.encryptFields(user, pii.SCHEMA.users);
const userD = pii.decryptFields(userE, pii.SCHEMA.users);
eq('user name round-trip', userD.name, '임창빈');
eq('user license round-trip', userD.driver_license, '11-22-333333-44');
truthy('login_id 변경 안 됨', userD.login_id === 'cblim');

// 배열 일괄 복호화
const rows = [customerE, customerE, customerE];
const decRows = pii.decryptRows(rows, pii.SCHEMA.customers);
eq('decryptRows 길이', decRows.length, 3);
eq('decryptRows[0].name', decRows[0].name, '박준희');

// ─────────────────────────────────────────────────────────────
section('6. 결정론 / 검색 가능성');
// ─────────────────────────────────────────────────────────────

// 같은 평문을 여러 번 암호화 → 항상 같은 결과 → WHERE 검색 가능
const search1 = pii.encryptPhone('010-1234-5678');
const search2 = pii.encryptPhone('01012345678');
const search3 = pii.encryptPhone('010 1234 5678');
eq('phone 결정론 (3가지 입력 형식)', search1, search2);
eq('phone 결정론 (공백 입력)', search1, search3);
console.log('  → WHERE phone = ? 검색 시 동일 매칭 가능');

// cross-field 안전성: 같은 평문이라도 fieldType 다르면 다른 토큰
const sameVal = '01012345678';
const asName = pii.encryptToken(sameVal, pii.FIELD.NAME);
const asPhone = pii.encryptToken(sameVal, pii.FIELD.PHONE);
truthy('cross-field 분리 (name vs phone)', asName !== asPhone);

// ─────────────────────────────────────────────────────────────
section('7. 변조 감지');
// ─────────────────────────────────────────────────────────────

const validToken = pii.encryptToken('test', pii.FIELD.GENERAL);
let tampered = validToken.slice(0, -2) + 'XX';
let caught = false;
try {
  pii.decryptToken(tampered);
} catch (e) {
  caught = true;
}
truthy('변조된 토큰 → 복호화 실패 (auth tag 검증)', caught);

// ─────────────────────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────────────────────

console.log('\n========================================');
console.log(`  PASS: ${pass}   FAIL: ${fail}`);
console.log('========================================');
if (fail === 0) {
  console.log('  ✅ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.error('  ❌ SOME TESTS FAILED');
  process.exit(1);
}
