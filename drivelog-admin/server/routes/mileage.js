// ============================================================
// /api/mileage — 마일리지 시스템
// 양양대리: 적립률 10% (fare_policies.mileage_earn_pct), 사용 단위 5000원
//
// 기존 customer_mileage 테이블 + fare_policies 활용:
//   customer_mileage 컬럼: id, customer_id, company_id, type (EARN/USE),
//                         amount, balance_after, description, ride_id, processed_by, created_at
//   customers.mileage_balance: 현재 잔액
//   fare_policies.mileage_earn_pct: 적립률
//
// Endpoint:
//   GET    /            — 전체 고객 마일리지 잔액 + 검색
//   GET    /summary     — 회사 전체 통계
//   GET    /customer/:id — 특정 고객 잔액 + 거래 이력
//   POST   /adjust      — 수동 조정 (적립/차감)
//   GET    /transactions — 전체 거래 이력 (월/타입 필터)
// ============================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// 5,000원 단위 검증 (양양대리 정책 — 다른 업체로 확장 시 fare_policies에 컬럼 추가 고려)
const MILEAGE_USE_UNIT = 5000;

// ====== 회사 전체 통계 ======
router.get('/summary', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || req.user.company_id) : req.user.company_id;
    if (!companyId) return res.status(400).json({ error: '업체를 선택해주세요.' });

    // 잔액 합계 + 활성 고객 수
    const [balanceRows] = await pool.execute(
      'SELECT COALESCE(SUM(mileage_balance), 0) AS total_balance, COUNT(*) AS total_customers FROM customers WHERE company_id = ? AND status = ?',
      [companyId, 'ACTIVE']
    );
    const [haveRows] = await pool.execute(
      'SELECT COUNT(*) AS customers_with_balance FROM customers WHERE company_id = ? AND mileage_balance > 0',
      [companyId]
    );

    // 누적 적립/사용 (customer_mileage 기반)
    const [txRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0) AS total_earned,
         COALESCE(SUM(CASE WHEN type = 'USE' THEN amount ELSE 0 END), 0) AS total_used,
         COUNT(*) AS total_transactions
       FROM customer_mileage WHERE company_id = ?`,
      [companyId]
    );

    res.json({
      total_balance: Number(balanceRows[0].total_balance),
      total_customers: Number(balanceRows[0].total_customers),
      customers_with_balance: Number(haveRows[0].customers_with_balance),
      total_earned: Number(txRows[0].total_earned),
      total_used: Number(txRows[0].total_used),
      total_transactions: Number(txRows[0].total_transactions),
    });
  } catch (err) {
    console.error('GET /mileage/summary error:', err);
    res.status(500).json({ error: '마일리지 통계 조회 실패' });
  }
});

// ====== 전체 고객 마일리지 잔액 (검색 가능) ======
router.get('/', authenticate, authorize('SUPER_ADMIN', 'MASTER', 'RIDER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || req.user.company_id) : req.user.company_id;
    if (!companyId) return res.status(400).json({ error: '업체를 선택해주세요.' });

    const { q, search, has_balance } = req.query;
    const term_q = q || search; // 클라이언트가 q 또는 search 둘 다 허용
    let where = 'WHERE c.company_id = ? AND c.status = ?';
    const params = [companyId, 'ACTIVE'];

    if (term_q) {
      where += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)';
      const term = `%${term_q}%`;
      params.push(term, term, term);
    }
    if (has_balance === 'true') {
      where += ' AND c.mileage_balance > 0';
    }

    const [rows] = await pool.execute(
      `SELECT c.customer_id, c.customer_code, c.name, c.phone, c.mileage_balance,
              (SELECT MAX(created_at) FROM customer_mileage WHERE customer_id = c.customer_id) AS last_transaction_at
       FROM customers c
       ${where}
       ORDER BY c.mileage_balance DESC, c.name
       LIMIT 200`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    console.error('GET /mileage error:', err);
    res.status(500).json({ error: '마일리지 목록 조회 실패' });
  }
});

// ====== 특정 고객 잔액 + 거래 이력 ======
router.get('/customer/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER', 'RIDER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || req.user.company_id) : req.user.company_id;
    const customerId = req.params.id;

    const [custRows] = await pool.execute(
      'SELECT customer_id, customer_code, name, phone, mileage_balance FROM customers WHERE customer_id = ? AND company_id = ?',
      [customerId, companyId]
    );
    if (custRows.length === 0) return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });

    const [txRows] = await pool.execute(
      `SELECT cm.*, u.name AS processed_by_name, r.total_fare AS ride_total_fare
       FROM customer_mileage cm
       LEFT JOIN users u ON cm.processed_by = u.user_id
       LEFT JOIN rides r ON cm.ride_id = r.ride_id
       WHERE cm.customer_id = ?
       ORDER BY cm.created_at DESC
       LIMIT 100`,
      [customerId]
    );

    res.json({ customer: custRows[0], transactions: txRows });
  } catch (err) {
    console.error('GET /mileage/customer/:id error:', err);
    res.status(500).json({ error: '고객 마일리지 조회 실패' });
  }
});

// ====== 수동 조정 (적립/차감) ======
router.post('/adjust', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되었습니다.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || req.user.company_id) : req.user.company_id;
    const { customer_id, type, amount, memo, description } = req.body;
    const reason = memo || description; // admin은 description, 다른 클라이언트는 memo 둘 다 허용

    if (!customer_id || !type || !amount) {
      await conn.rollback();
      return res.status(400).json({ error: '고객, 종류, 금액은 필수입니다.' });
    }
    if (!['EARN', 'USE'].includes(type)) {
      await conn.rollback();
      return res.status(400).json({ error: '거래 종류는 EARN 또는 USE여야 합니다.' });
    }
    const amt = Math.round(Number(amount));
    if (isNaN(amt) || amt <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: '금액은 양수여야 합니다.' });
    }

    // 고객 조회 + 잠금
    const [custRows] = await conn.execute(
      'SELECT customer_id, name, mileage_balance FROM customers WHERE customer_id = ? AND company_id = ? FOR UPDATE',
      [customer_id, companyId]
    );
    if (custRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
    }
    const cust = custRows[0];
    const currentBalance = Number(cust.mileage_balance || 0);

    let newBalance;
    if (type === 'EARN') {
      newBalance = currentBalance + amt;
    } else {
      if (currentBalance < amt) {
        await conn.rollback();
        return res.status(400).json({ error: `잔액이 부족합니다. 현재 잔액: ${currentBalance.toLocaleString()}원` });
      }
      newBalance = currentBalance - amt;
    }

    await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [newBalance, customer_id]);
    await conn.execute(
      `INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      [customer_id, companyId, type, amt, newBalance, reason || `수동 ${type === 'EARN' ? '적립' : '차감'}`, req.user.user_id]
    );
    await conn.commit();

    writeAuditLog({
      company_id: companyId,
      user_id: req.user.user_id,
      action: 'MILEAGE_ADJUST',
      target_table: 'customers',
      target_id: customer_id,
      detail: { type, amount: amt, balance_after: newBalance, memo: reason },
      ip_address: req.ip,
    });

    res.json({
      message: `${cust.name}님의 마일리지가 ${type === 'EARN' ? '적립' : '차감'}되었습니다.`,
      balance_after: newBalance,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /mileage/adjust error:', err);
    res.status(500).json({ error: '마일리지 조정 실패' });
  } finally {
    conn.release();
  }
});

// ====== 전체 거래 이력 (월/타입 필터) ======
router.get('/transactions', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || req.user.company_id) : req.user.company_id;
    if (!companyId) return res.status(400).json({ error: '업체를 선택해주세요.' });

    const { month, type, customer_id, limit = 100 } = req.query;
    let where = 'WHERE cm.company_id = ?';
    const params = [companyId];

    if (month) { where += " AND DATE_FORMAT(cm.created_at, '%Y-%m') = ?"; params.push(month); }
    if (type && ['EARN', 'USE'].includes(type)) { where += ' AND cm.type = ?'; params.push(type); }
    if (customer_id) { where += ' AND cm.customer_id = ?'; params.push(customer_id); }

    const lim = Math.min(parseInt(limit), 500);
    const [rows] = await pool.execute(
      `SELECT cm.*, c.name AS customer_name, c.customer_code, c.phone AS customer_phone,
              u.name AS processed_by_name
       FROM customer_mileage cm
       JOIN customers c ON cm.customer_id = c.customer_id
       LEFT JOIN users u ON cm.processed_by = u.user_id
       ${where}
       ORDER BY cm.created_at DESC
       LIMIT ?`,
      [...params, lim]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error('GET /mileage/transactions error:', err);
    res.status(500).json({ error: '거래 이력 조회 실패' });
  }
});

// 5000원 단위 상수 export (rides.js에서 검증용)
router.MILEAGE_USE_UNIT = MILEAGE_USE_UNIT;

module.exports = router;
