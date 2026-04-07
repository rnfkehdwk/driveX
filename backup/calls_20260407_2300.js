const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/calls — 콜 목록 (SUPER_ADMIN: 본인 업체, RIDER: 대기 중 콜)
router.get('/', authenticate, checkLicense, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE c.company_id = ?';
    const params = [req.user.company_id];

    // RIDER는 WAITING 콜만 (또는 본인이 수락한 콜)
    if (req.user.role === 'RIDER') {
      where += " AND (c.status = 'WAITING' OR c.assigned_rider_id = ?)";
      params.push(req.user.user_id);
    }

    if (status) { where += ' AND c.status = ?'; params.push(status); }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM calls c ${where}`, params
    );

    const dataParams = [...params, parseInt(limit), offset];
    const [rows] = await pool.execute(
      `SELECT c.*, 
              cust.name AS customer_name, cust.phone AS customer_phone, cust.customer_code,
              partner.name AS partner_name,
              creator.name AS created_by_name,
              rider.name AS assigned_rider_name, rider.phone AS assigned_rider_phone
       FROM calls c
       LEFT JOIN customers cust ON c.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON c.partner_id = partner.partner_id
       LEFT JOIN users creator ON c.created_by = creator.user_id
       LEFT JOIN users rider ON c.assigned_rider_id = rider.user_id
       ${where}
       ORDER BY FIELD(c.status, 'WAITING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'), c.created_at DESC
       LIMIT ? OFFSET ?`, dataParams
    );

    // WAITING 콜 수 (배지용)
    const [waitingCount] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM calls WHERE company_id = ? AND status = 'WAITING'",
      [req.user.company_id]
    );

    res.json({
      data: rows,
      total: countResult[0].total,
      waiting_count: waitingCount[0].cnt,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) { console.error('GET /calls error:', err); res.status(500).json({ error: '콜 목록 조회 실패' }); }
});

// GET /api/calls/waiting-count — 대기 중 콜 수 (polling용, 가벼운 쿼리)
router.get('/waiting-count', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM calls WHERE company_id = ? AND status = 'WAITING'",
      [req.user.company_id]
    );
    res.json({ count: rows[0].cnt });
  } catch (err) { res.status(500).json({ error: '조회 실패' }); }
});

// POST /api/calls — 콜 생성 (SUPER_ADMIN만)
router.post('/', authenticate, authorize('SUPER_ADMIN'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 콜 생성이 불가합니다.' });

  try {
    const { customer_id, partner_id, start_address, start_detail, end_address, end_detail, estimated_fare, payment_method, memo } = req.body;

    if (!start_address) return res.status(400).json({ error: '출발지를 입력해주세요.' });

    const [result] = await pool.execute(
      `INSERT INTO calls (company_id, created_by, customer_id, partner_id, start_address, start_detail, end_address, end_detail, estimated_fare, payment_method, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, req.user.user_id, customer_id || null, partner_id || null,
       start_address, start_detail || null, end_address || null, end_detail || null,
       estimated_fare || null, payment_method || 'CASH', memo || null]
    );

    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'CALL_CREATE', target_table: 'calls', target_id: result.insertId, ip_address: req.ip });

    res.status(201).json({ call_id: result.insertId, message: '콜이 생성되었습니다.' });
  } catch (err) { console.error('POST /calls error:', err); res.status(500).json({ error: '콜 생성 실패' }); }
});

// PUT /api/calls/:id/accept — 기사가 콜 수락
router.put('/:id/accept', authenticate, authorize('RIDER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 콜 상태 확인 (WAITING만 수락 가능, 동시성 제어 위해 FOR UPDATE)
    const [calls] = await conn.execute(
      'SELECT * FROM calls WHERE call_id = ? AND company_id = ? FOR UPDATE',
      [req.params.id, req.user.company_id]
    );

    if (calls.length === 0) { await conn.rollback(); return res.status(404).json({ error: '콜을 찾을 수 없습니다.' }); }
    if (calls[0].status !== 'WAITING') { await conn.rollback(); return res.status(400).json({ error: '이미 다른 기사가 수락한 콜입니다.' }); }

    await conn.execute(
      "UPDATE calls SET status = 'ASSIGNED', assigned_rider_id = ?, assigned_at = NOW() WHERE call_id = ?",
      [req.user.user_id, req.params.id]
    );

    await conn.commit();
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'CALL_ACCEPT', target_table: 'calls', target_id: parseInt(req.params.id), ip_address: req.ip });

    // 수락한 콜 정보 반환 (운행 작성에 사용)
    const [updated] = await pool.execute(
      `SELECT c.*, cust.name AS customer_name, cust.phone AS customer_phone, cust.customer_code,
              partner.name AS partner_name
       FROM calls c
       LEFT JOIN customers cust ON c.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON c.partner_id = partner.partner_id
       WHERE c.call_id = ?`, [req.params.id]
    );

    res.json({ message: '콜을 수락했습니다.', call: updated[0] });
  } catch (err) { await conn.rollback(); console.error('PUT /calls/:id/accept error:', err); res.status(500).json({ error: '콜 수락 실패' }); }
  finally { conn.release(); }
});

// PUT /api/calls/:id/complete — 운행 완료 (rides에 자동 연결)
router.put('/:id/complete', authenticate, authorize('RIDER'), async (req, res) => {
  try {
    const [calls] = await pool.execute(
      'SELECT * FROM calls WHERE call_id = ? AND assigned_rider_id = ?',
      [req.params.id, req.user.user_id]
    );
    if (calls.length === 0) return res.status(404).json({ error: '콜을 찾을 수 없습니다.' });
    if (!['ASSIGNED', 'IN_PROGRESS'].includes(calls[0].status)) return res.status(400).json({ error: '완료 처리할 수 없는 상태입니다.' });

    const { ride_id } = req.body;

    await pool.execute(
      "UPDATE calls SET status = 'COMPLETED', ride_id = ?, completed_at = NOW() WHERE call_id = ?",
      [ride_id || null, req.params.id]
    );

    // rides에 call_id 연결
    if (ride_id) {
      await pool.execute('UPDATE rides SET call_id = ? WHERE ride_id = ?', [req.params.id, ride_id]);
    }

    res.json({ message: '콜 완료 처리되었습니다.' });
  } catch (err) { console.error('PUT /calls/:id/complete error:', err); res.status(500).json({ error: '완료 처리 실패' }); }
});

// PUT /api/calls/:id/cancel — 콜 취소 (SUPER_ADMIN 또는 수락한 RIDER)
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const [calls] = await pool.execute(
      'SELECT * FROM calls WHERE call_id = ? AND company_id = ?',
      [req.params.id, req.user.company_id]
    );
    if (calls.length === 0) return res.status(404).json({ error: '콜을 찾을 수 없습니다.' });
    if (calls[0].status === 'COMPLETED') return res.status(400).json({ error: '이미 완료된 콜은 취소할 수 없습니다.' });

    // RIDER는 본인이 수락한 콜만 취소 가능 (WAITING으로 되돌림)
    if (req.user.role === 'RIDER') {
      if (calls[0].assigned_rider_id !== req.user.user_id) return res.status(403).json({ error: '본인이 수락한 콜만 취소할 수 있습니다.' });
      await pool.execute(
        "UPDATE calls SET status = 'WAITING', assigned_rider_id = NULL, assigned_at = NULL WHERE call_id = ?",
        [req.params.id]
      );
      return res.json({ message: '콜 수락이 취소되었습니다. 다른 기사가 수락할 수 있습니다.' });
    }

    // SUPER_ADMIN은 완전 취소
    const { cancel_reason } = req.body;
    await pool.execute(
      "UPDATE calls SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ? WHERE call_id = ?",
      [cancel_reason || null, req.params.id]
    );

    res.json({ message: '콜이 취소되었습니다.' });
  } catch (err) { console.error('PUT /calls/:id/cancel error:', err); res.status(500).json({ error: '취소 실패' }); }
});

// PUT /api/calls/:id — 콜 수정 (SUPER_ADMIN, WAITING 상태만)
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const [calls] = await pool.execute(
      'SELECT status FROM calls WHERE call_id = ? AND company_id = ?',
      [req.params.id, req.user.company_id]
    );
    if (calls.length === 0) return res.status(404).json({ error: '콜을 찾을 수 없습니다.' });
    if (calls[0].status !== 'WAITING') return res.status(400).json({ error: '대기 중인 콜만 수정할 수 있습니다.' });

    const allowed = ['customer_id', 'partner_id', 'start_address', 'start_detail', 'end_address', 'end_detail', 'estimated_fare', 'payment_method', 'memo'];
    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    await pool.execute(`UPDATE calls SET ${updates.join(', ')} WHERE call_id = ?`, values);
    res.json({ message: '콜이 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '콜 수정 실패' }); }
});

module.exports = router;
