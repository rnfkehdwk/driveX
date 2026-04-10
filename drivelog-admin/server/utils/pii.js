/**
 * pii.js — DriveLog PII (개인정보) 결정론적 부분 암호화 라이브러리
 *
 * 목적
 *  - DB에 평문으로 저장되던 개인정보(이름/전화/이메일/면허번호)를 AES-256-GCM으로 암호화
 *  - 부분 암호화: 검색/식별성을 위해 일부는 평문 유지 (예: 010***5678)
 *  - 결정론적: 같은 평문 → 같은 암호문 (정확 매칭 검색 가능)
 *  - 평문/암호문 혼재 안전: prefix 마커 'DLE1' 로 구분, 백필 도중에도 동작
 *
 * 보안 모델
 *  - 알고리즘: AES-256-GCM (12B IV + ciphertext + 16B auth tag)
 *  - IV 파생: HMAC-SHA256(KEY, fieldType + ':' + plaintext) → 첫 12바이트
 *    · 같은 평문이라도 fieldType이 다르면 IV 다름 → cross-field 추측 방지
 *    · 결정론적 (같은 입력 → 같은 IV → 같은 ciphertext) → 검색 가능
 *  - GCM auth tag: 변조 감지
 *  - 키: 환경변수 PII_ENC_KEY (32바이트 = 64 hex chars)
 *
 * 저장 형식
 *    DLE1{base64url(IV(12) || ciphertext || tag(16))}
 *
 *  prefix 'DLE1' (DriveLog Encrypted v1) 로 평문/암호문 구분
 *  base64url 사용 (URL-safe, 패딩 없음)
 *
 * 부분 암호화 규칙
 *  - name:    첫 글자 평문 + 나머지 암호화 (1자면 전체 암호화)
 *  - phone:   하이픈 제거 후 정규화 → 앞 3 평문 + 중간 암호화 + 뒤 4 평문
 *  - email:   local 앞 2 평문 + 나머지 암호화 + '@' + domain 평문
 *  - license: 전체 암호화 (검색 불필요, 법적 민감)
 *
 * 사용 예
 *    const pii = require('../utils/pii');
 *    pii.encryptName('홍길동')        // → '홍DLE1xxxxx'
 *    pii.decryptName('홍DLE1xxxxx')   // → '홍길동'
 *    pii.encryptPhone('010-1234-5678')// → '010DLE1xxxxx5678'
 *    pii.decryptPhone('010DLE1xxxxx5678') // → '01012345678'
 *    pii.normalizePhone('010-1234-5678')  // → '01012345678' (정규화만)
 *    pii.formatPhone('01012345678')   // → '010-1234-5678' (표시용 하이픈)
 *    pii.isEncrypted('홍DLE1xxx')     // → true (DLE1 마커 검사)
 *
 * 백필/롤백
 *  - encryptXxx 는 이미 암호화된 값(DLE1 포함)을 만나면 그대로 통과 (재실행 안전)
 *  - decryptXxx 는 평문(DLE1 없음)을 만나면 그대로 통과 (백필 도중에도 안전)
 *  - 검증 실패 시 에러 던짐 → 호출자가 try/catch
 *
 * 주의사항
 *  - PII_ENC_KEY 분실 = 데이터 영구 복구 불가
 *  - 키는 NAS .env 에만 두고 채팅/git 에 절대 노출 금지
 *  - 평문 기준 로그 출력 금지 (audit_log 도 마스킹)
 */

'use strict';

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────

const PREFIX = 'DLE1';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;   // GCM 권장 12B
const TAG_LEN = 16;  // GCM auth tag 16B
const KEY_LEN = 32;  // AES-256 = 32B

// 필드 타입 식별자 (cross-field IV 분리용)
const FIELD = {
  NAME: 'name',
  PHONE: 'phone',
  EMAIL: 'email',
  LICENSE: 'license',
  GENERAL: 'general',
};

// ─────────────────────────────────────────────────────────────
// 키 로드
// ─────────────────────────────────────────────────────────────

let _key = null;

function getKey() {
  if (_key) return _key;

  const hex = process.env.PII_ENC_KEY;
  if (!hex) {
    throw new Error('[pii] PII_ENC_KEY 환경변수가 설정되지 않았습니다. .env 확인 필요.');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('[pii] PII_ENC_KEY 는 64자 hex (32바이트) 여야 합니다. 현재 길이: ' + hex.length);
  }
  _key = Buffer.from(hex, 'hex');
  if (_key.length !== KEY_LEN) {
    throw new Error('[pii] PII_ENC_KEY 디코딩 후 길이가 32바이트가 아닙니다.');
  }
  return _key;
}

/** 테스트/재로드용 — 운영 코드에서는 호출하지 말 것 */
function _resetKey() { _key = null; }

// ─────────────────────────────────────────────────────────────
// base64url 헬퍼 (Node 16+ 지원)
// ─────────────────────────────────────────────────────────────

function b64uEncode(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64uDecode(str) {
  const pad = 4 - (str.length % 4);
  const padded = pad < 4 ? str + '='.repeat(pad) : str;
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// ─────────────────────────────────────────────────────────────
// 핵심: 결정론적 AES-256-GCM
// ─────────────────────────────────────────────────────────────

/**
 * 결정론적 IV 파생: HMAC-SHA256(KEY, fieldType ':' plaintext) 의 첫 12B
 * - 같은 평문 + 같은 fieldType → 같은 IV → 같은 ciphertext
 * - 키가 없으면 HMAC 못 만드니 cross-tenant 안전
 */
function deriveIv(fieldType, plaintext) {
  const h = crypto.createHmac('sha256', getKey());
  h.update(fieldType + ':' + plaintext, 'utf8');
  return h.digest().slice(0, IV_LEN);
}

/**
 * 평문 → DLE1{base64url} 토큰
 * @param {string} plaintext  암호화할 원본 (UTF-8)
 * @param {string} fieldType  FIELD.* 중 하나
 * @returns {string} 'DLE1...' 토큰
 */
function encryptToken(plaintext, fieldType) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const str = String(plaintext);
  if (str.length === 0) return str;

  const iv = deriveIv(fieldType, str);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, ct, tag]);
  return PREFIX + b64uEncode(combined);
}

/**
 * DLE1{base64url} → 평문
 * @param {string} token
 * @returns {string} 원본 평문
 * @throws 토큰 형식이 깨졌거나 auth tag 검증 실패 시
 */
function decryptToken(token) {
  if (token === null || token === undefined) return token;
  const str = String(token);
  if (!str.startsWith(PREFIX)) {
    throw new Error('[pii] DLE1 prefix 가 없는 토큰');
  }
  const buf = b64uDecode(str.slice(PREFIX.length));
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('[pii] 토큰 길이가 너무 짧음');
  }
  const iv = buf.slice(0, IV_LEN);
  const tag = buf.slice(buf.length - TAG_LEN);
  const ct = buf.slice(IV_LEN, buf.length - TAG_LEN);

  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

// ─────────────────────────────────────────────────────────────
// 공용 헬퍼
// ─────────────────────────────────────────────────────────────

/** 'DLE1' prefix 가 들어있는지 (부분 암호화도 감지: 'DLE1' 포함이면 true) */
function isEncrypted(value) {
  if (value === null || value === undefined) return false;
  return String(value).indexOf(PREFIX) !== -1;
}

/** 'DLE1' 로 시작하는 토큰인지 (전체 암호화 토큰만 true) */
function isFullToken(value) {
  if (value === null || value === undefined) return false;
  return String(value).startsWith(PREFIX);
}

// ─────────────────────────────────────────────────────────────
// 1. NAME (이름)
// ─────────────────────────────────────────────────────────────

/**
 * 이름 부분 암호화
 * - 1자 이름: 전체 암호화 → 'DLE1xxx'
 * - 2자 이상: 첫 글자 + DLE1 토큰 → '홍DLE1xxx'
 *
 * 멱등: 이미 DLE1 포함된 값은 그대로 반환
 */
function encryptName(name) {
  if (name === null || name === undefined) return name;
  const str = String(name).trim();
  if (str.length === 0) return str;
  if (isEncrypted(str)) return str; // 멱등

  if (str.length === 1) {
    return encryptToken(str, FIELD.NAME);
  }
  // 첫 글자 평문 + 나머지 암호화
  // Array.from 으로 surrogate pair (이모지 등) 안전 처리
  const chars = Array.from(str);
  const head = chars[0];
  const tail = chars.slice(1).join('');
  return head + encryptToken(tail, FIELD.NAME);
}

/**
 * 이름 복호화
 * - DLE1 마커 없으면 평문으로 간주, 그대로 반환 (백필 도중 안전)
 */
function decryptName(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (str.length === 0) return str;
  if (!isEncrypted(str)) return str; // 평문

  const idx = str.indexOf(PREFIX);
  if (idx === 0) {
    // 1자 이름 케이스: 전체가 토큰
    return decryptToken(str);
  }
  // 첫 글자 평문 + 나머지 토큰
  const head = str.slice(0, idx);
  const tokenPart = str.slice(idx);
  return head + decryptToken(tokenPart);
}

// ─────────────────────────────────────────────────────────────
// 2. PHONE (전화번호)
// ─────────────────────────────────────────────────────────────

/**
 * 전화번호 정규화: 숫자만 남김
 * '010-1234-5678' → '01012345678'
 * '02-123-4567'   → '021234567'
 * null/빈문자열   → 그대로
 */
function normalizePhone(phone) {
  if (phone === null || phone === undefined) return phone;
  const str = String(phone);
  return str.replace(/[^0-9]/g, '');
}

/**
 * 휴대폰/지역번호 패턴 검사 (한국 기준)
 * - 010xxxxxxxx (11)
 * - 011/016/017/018/019xxxxxxx (10)
 * - 02xxxxxxx(x) (9-10)
 * - 0[3-6]xxxxxxx(x) (10-11)
 * - 050x/070/080 등은 일단 통과
 * 매칭 안 되면 false → 잘못된 데이터로 간주, 평문 그대로 둠
 */
function isValidPhoneFormat(normalized) {
  if (!normalized) return false;
  // 9~11자리 숫자, 0으로 시작
  return /^0[0-9]{8,10}$/.test(normalized);
}

/**
 * 전화번호 부분 암호화
 * - 정규화(하이픈 제거) 후
 * - 11자리: 앞 3 + 중간 암호화 + 뒤 4 → '010DLE1xxx5678'
 * - 10자리: 앞 3 + 중간 암호화 + 뒤 4 → '011DLE1xxx5678' / '02xDLE1xx5678'
 * - 9자리:  앞 2 + 중간 암호화 + 뒤 4 → '02DLE1xxx4567'
 * - 형식 깨진 데이터('게좌이제' 등): 그대로 반환 + 콘솔 경고
 *
 * 멱등: DLE1 포함되면 그대로 반환
 */
function encryptPhone(phone) {
  if (phone === null || phone === undefined) return phone;
  const raw = String(phone).trim();
  if (raw.length === 0) return raw;
  if (isEncrypted(raw)) return raw; // 멱등

  const norm = normalizePhone(raw);
  if (!isValidPhoneFormat(norm)) {
    // 잘못된 형식 → 평문 그대로 둠 (백필 로그가 잡을 것)
    return raw;
  }

  const len = norm.length;
  let head, mid, tail;
  if (len >= 10) {
    // 010-XXXX-YYYY / 02X-XXX-YYYY: 앞 3 + 중간 + 뒤 4
    head = norm.slice(0, 3);
    tail = norm.slice(-4);
    mid = norm.slice(3, len - 4);
  } else {
    // 9자리(02-XXX-YYYY): 앞 2 + 중간 + 뒤 4
    head = norm.slice(0, 2);
    tail = norm.slice(-4);
    mid = norm.slice(2, len - 4);
  }

  if (mid.length === 0) {
    // 중간이 비면 전체 암호화 fallback
    return encryptToken(norm, FIELD.PHONE);
  }

  return head + encryptToken(mid, FIELD.PHONE) + tail;
}

/**
 * 전화번호 복호화 → 정규화된(하이픈 없는) 평문 반환
 * - 평문(DLE1 없음): 정규화만 해서 반환
 * - 잘못된 형식 데이터: 그대로 반환
 */
function decryptPhone(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (str.length === 0) return str;

  if (!isEncrypted(str)) {
    // 평문 (정규화 시도, 실패해도 원본 반환)
    const norm = normalizePhone(str);
    return isValidPhoneFormat(norm) ? norm : str;
  }

  const idx = str.indexOf(PREFIX);
  if (idx === 0) {
    // 전체 암호화 fallback 케이스
    return decryptToken(str);
  }
  // 부분 암호화 구조: head(평문 2~3자리) + DLE1{token} + tail(평문 4자리 고정)
  // base64url 문자집합이 [A-Za-z0-9_-] 라서 정규식으로 토큰 끝을 못 찾음
  // (tail 의 숫자도 base64url 에 포함). tail 길이 4 고정 규칙으로 역산.
  const TAIL_LEN = 4;
  if (str.length < idx + PREFIX.length + TAIL_LEN) {
    throw new Error('[pii] phone 토큰 길이 부족');
  }
  const head = str.slice(0, idx);
  const tail = str.slice(-TAIL_LEN);
  const token = str.slice(idx, str.length - TAIL_LEN);
  const mid = decryptToken(token);
  return head + mid + tail;
}

/** 표시용 하이픈 삽입: 01012345678 → 010-1234-5678 */
function formatPhone(normalized) {
  if (normalized === null || normalized === undefined) return normalized;
  const s = String(normalized);
  if (!isValidPhoneFormat(s)) return s;
  if (s.length === 11) return s.slice(0, 3) + '-' + s.slice(3, 7) + '-' + s.slice(7);
  if (s.length === 10) {
    if (s.startsWith('02')) return s.slice(0, 2) + '-' + s.slice(2, 6) + '-' + s.slice(6);
    return s.slice(0, 3) + '-' + s.slice(3, 6) + '-' + s.slice(6);
  }
  if (s.length === 9 && s.startsWith('02')) {
    return s.slice(0, 2) + '-' + s.slice(2, 5) + '-' + s.slice(5);
  }
  return s;
}

// ─────────────────────────────────────────────────────────────
// 3. EMAIL (이메일)
// ─────────────────────────────────────────────────────────────

/**
 * 이메일 부분 암호화
 * - local 길이 ≤ 2: 전체 local 암호화 + '@' + domain 평문 → 'DLE1xxx@example.com'
 * - local 길이 ≥ 3: 앞 2 평문 + 나머지 암호화 + '@' + domain → 'hoDLE1xxx@example.com'
 * - '@' 없으면 잘못된 형식 → 그대로 반환
 *
 * 멱등: DLE1 포함되면 그대로 반환
 */
function encryptEmail(email) {
  if (email === null || email === undefined) return email;
  const str = String(email).trim();
  if (str.length === 0) return str;
  if (isEncrypted(str)) return str;

  const at = str.lastIndexOf('@');
  if (at < 1 || at === str.length - 1) {
    // '@' 없거나 위치 이상 → 평문 그대로
    return str;
  }
  const local = str.slice(0, at);
  const domain = str.slice(at); // '@' 포함

  if (local.length <= 2) {
    return encryptToken(local, FIELD.EMAIL) + domain;
  }
  const head = local.slice(0, 2);
  const tail = local.slice(2);
  return head + encryptToken(tail, FIELD.EMAIL) + domain;
}

function decryptEmail(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (str.length === 0) return str;
  if (!isEncrypted(str)) return str;

  const at = str.lastIndexOf('@');
  if (at < 0) {
    // '@' 없음 → 전체 토큰일 수 있음
    if (str.startsWith(PREFIX)) return decryptToken(str);
    return str;
  }
  const localPart = str.slice(0, at);
  const domain = str.slice(at);

  const idx = localPart.indexOf(PREFIX);
  if (idx < 0) return str; // 토큰 없음
  if (idx === 0) {
    return decryptToken(localPart) + domain;
  }
  const head = localPart.slice(0, idx);
  const token = localPart.slice(idx);
  return head + decryptToken(token) + domain;
}

// ─────────────────────────────────────────────────────────────
// 4. LICENSE (면허번호) — 전체 암호화
// ─────────────────────────────────────────────────────────────

function encryptLicense(license) {
  if (license === null || license === undefined) return license;
  const str = String(license).trim();
  if (str.length === 0) return str;
  if (isEncrypted(str)) return str;
  return encryptToken(str, FIELD.LICENSE);
}

function decryptLicense(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (str.length === 0) return str;
  if (!isFullToken(str)) return str; // 평문
  return decryptToken(str);
}

// ─────────────────────────────────────────────────────────────
// 5. 객체 일괄 처리 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * 객체의 지정 필드들을 일괄 암호화/복호화
 * @param {object} obj  대상 객체 (mutate 하지 않고 새 객체 반환)
 * @param {object} schema  { fieldName: 'name'|'phone'|'email'|'license' }
 * @param {'enc'|'dec'} mode
 */
function applyFields(obj, schema, mode) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const [field, type] of Object.entries(schema)) {
    if (!(field in out)) continue;
    const v = out[field];
    if (v === null || v === undefined || v === '') continue;
    try {
      if (mode === 'enc') {
        if (type === 'name') out[field] = encryptName(v);
        else if (type === 'phone') out[field] = encryptPhone(v);
        else if (type === 'email') out[field] = encryptEmail(v);
        else if (type === 'license') out[field] = encryptLicense(v);
      } else {
        if (type === 'name') out[field] = decryptName(v);
        else if (type === 'phone') out[field] = decryptPhone(v);
        else if (type === 'email') out[field] = decryptEmail(v);
        else if (type === 'license') out[field] = decryptLicense(v);
      }
    } catch (e) {
      // 개별 필드 실패는 전체를 막지 않음 (로그만)
      console.error(`[pii] ${mode} 실패: field=${field} type=${type} err=${e.message}`);
    }
  }
  return out;
}

function encryptFields(obj, schema) { return applyFields(obj, schema, 'enc'); }
function decryptFields(obj, schema) { return applyFields(obj, schema, 'dec'); }

/**
 * 배열 일괄 복호화
 */
function decryptRows(rows, schema) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(r => decryptFields(r, schema));
}

// ─────────────────────────────────────────────────────────────
// 테이블별 스키마 (라우트에서 import 하여 사용)
// ─────────────────────────────────────────────────────────────

const SCHEMA = {
  users: {
    name: 'name',
    phone: 'phone',
    email: 'email',
    driver_license: 'license',
  },
  customers: {
    name: 'name',
    phone: 'phone',
    email: 'email',
  },
  companies: {
    ceo_name: 'name',
    phone: 'phone',
    email: 'email',
  },
  partner_companies: {
    contact_person: 'name',
    phone: 'phone',
  },
};

// ─────────────────────────────────────────────────────────────
// 키 생성 유틸 (CLI 용)
//   node -e "console.log(require('./utils/pii').generateKey())"
// ─────────────────────────────────────────────────────────────

function generateKey() {
  return crypto.randomBytes(KEY_LEN).toString('hex');
}

// ─────────────────────────────────────────────────────────────
// exports
// ─────────────────────────────────────────────────────────────

module.exports = {
  // 상수
  PREFIX,
  FIELD,
  SCHEMA,

  // 검사
  isEncrypted,
  isFullToken,

  // 핵심
  encryptToken,
  decryptToken,

  // 필드별 부분 암호화
  encryptName,
  decryptName,
  encryptPhone,
  decryptPhone,
  encryptEmail,
  decryptEmail,
  encryptLicense,
  decryptLicense,

  // 전화번호 헬퍼
  normalizePhone,
  formatPhone,
  isValidPhoneFormat,

  // 객체 일괄
  encryptFields,
  decryptFields,
  decryptRows,

  // CLI
  generateKey,

  // 테스트용
  _resetKey,
};
