const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');
const { sendToCompanyRiders, sendToCompanyAdmins } = require('../utils/pushSender');

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
              rider.name AS assigned_rider_name, rider.phone AS assigned_rider_phone,
              pt.label AS payment_label, pt.settlement_group_id,
              sg.name AS settlement_group_name, sg.color AS settlement_group_color
       FROM calls c
       LEFT JOIN customers cust ON c.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON c.partner_id = partner.partner_id
       LEFT JOIN users creator ON c.created_by = creator.user_id
       LEFT JOIN users rider ON c.assigned_rider_id = rider.user_id
       LEFT JOIN payment_types pt ON pt.payment_type_id = c.payment_type_id
       LEFT JOIN settlement_groups sg ON sg.group_id = pt.settlement_group_id
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

// GET /api/calls/frequent-addresses?type=start|end&limit=20&customer_id=N
// 고객별 특화 자주 가는 움직 임 (customer_id 필수 아닌 수다로 이용 가능)
// - customer_id가 있으면: 해당 고객의 콜만 필터링 (top 3 권장)
// - customer_id가 없으면: 회사 전체 (기동)
// - 조건 동일: 최근 90일, 빈 주소 제외
router.get('/frequent-addresses', authenticate, async (req, res) => {
  try {
    const type = req.query.type === 'end' ? 'end_address' : 'start_address';
    const detailCol = type === 'end_address' ? 'end_detail' : 'start_detail';
    const latCol = type === 'end_address' ? 'end_lat' : 'start_lat';
    const lngCol = type === 'end_address' ? 'end_lng' : 'start_lng';
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const days = Math.min(parseInt(req.query.days) || 90, 365);
    const customerId = req.query.customer_id ? parseInt(req.query.customer_id) : null;

    // 동적 WHERE 절 구성
    let where = `WHERE company_id = ?
         AND ${type} IS NOT NULL
         AND ${type} != ''
         AND ${type} NOT LIKE '%자동검증%'
         AND ${type} NOT LIKE '%검증%'
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const params = [req.user.company_id, days];

    if (customerId) {
      where += ` AND customer_id = ?`;
      params.push(customerId);
    }

    const [rows] = await pool.execute(
      `SELECT ${type} AS address,
              MAX(${detailCol}) AS detail,
              MAX(${latCol}) AS lat,
              MAX(${lngCol}) AS lng,
              COUNT(*) AS use_count,
              MAX(created_at) AS last_used_at
       FROM calls
       ${where}
       GROUP BY ${type}
       ORDER BY use_count DESC, last_used_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({
      data: rows,
      type: req.query.type === 'end' ? 'end' : 'start',
      customer_id: customerId,
    });
  } catch (err) {
    console.error('GET /calls/frequent-addresses error:', err);
    res.status(500).json({ error: '자주 가는 곳 조회 실패' });
  }
});

// POST /api/calls — 콜 생성 (SUPER_ADMIN만)
router.post('/', authenticate, authorize('SUPER_ADMIN'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 콜 생성이 불가합니다.' });

  try {
    const {
      customer_id, partner_id,
      start_address, start_detail, start_lat, start_lng,
      end_address, end_detail, end_lat, end_lng,
      estimated_fare, payment_method, payment_type_id, memo, assigned_rider_id
    } = req.body;

    if (!start_address) return res.status(400).json({ error: '출발지를 입력해주세요.' });

    // payment_type_id 자동 lookup (프론트가 명시하지 않아도 payment_method 코드로 자동 매핑)
    const resolvedPaymentTypeId = await resolvePaymentTypeId(
      req.user.company_id,
      payment_type_id,
      payment_method
    );

    // 수동 지명: 기사 검증 (같은 업체 소속, RIDER 또는 SUPER_ADMIN이어야 함)
    let assignedRiderId = null;
    let initialStatus = 'WAITING';
    let assignedAt = null;
    if (assigned_rider_id) {
      const [riderRows] = await pool.execute(
        "SELECT user_id, role, status FROM users WHERE user_id = ? AND company_id = ? AND role IN ('RIDER', 'SUPER_ADMIN') AND status = 'ACTIVE'",
        [assigned_rider_id, req.user.company_id]
      );
      if (riderRows.length === 0) {
        return res.status(400).json({ error: '지명한 기사를 찾을 수 없습니다.' });
      }
      assignedRiderId = riderRows[0].user_id;
      initialStatus = 'ASSIGNED';
      assignedAt = new Date();
    }

    const [result] = await pool.execute(
      `INSERT INTO calls (company_id, created_by, customer_id, partner_id,
         start_address, start_detail, start_lat, start_lng,
         end_address, end_detail, end_lat, end_lng,
         estimated_fare, payment_type_id, memo, status, assigned_rider_id, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, req.user.user_id, customer_id || null, partner_id || null,
       start_address, start_detail || null, start_lat || null, start_lng || null,
       end_address || null, end_detail || null, end_lat || null, end_lng || null,
       estimated_fare || null, resolvedPaymentTypeId, memo || null,
       initialStatus, assignedRiderId, assignedAt]
    );

    writeAuditLog({
      company_id: req.user.company_id,
      user_id: req.user.user_id,
      action: assignedRiderId ? 'CALL_CREATE_ASSIGN' : 'CALL_CREATE',
      target_table: 'calls',
      target_id: result.insertId,
      detail: assignedRiderId ? { assigned_rider_id: assignedRiderId } : null,
      ip_address: req.ip
    });

    // 푸시 알림 발송 (fire-and-forget — 실패해도 콜 생성은 성공)
    // 지명 콜(ASSIGNED)은 지명된 기사만, WAITING 콜은 전체 기사에게 알림
    const fareText = estimated_fare ? `${Number(estimated_fare).toLocaleString()}원` : '미정';
    const bodyLines = [];
    bodyLines.push(`${start_address || '출발지 미정'}${start_detail ? ' ' + start_detail : ''}`);
    if (end_address) bodyLines.push(`→ ${end_address}${end_detail ? ' ' + end_detail : ''}`);
    bodyLines.push(`예상 요금: ${fareText}`);

    const pushPayload = {
      title: assignedRiderId ? '🚗 지명 콜 도착' : '🚗 새 콜 도착',
      body: bodyLines.join('\n'),
      url: '/m/calls',
      tag: `call-${result.insertId}`,
      callId: result.insertId,
    };

    // await 안 걸어서 응답 지연 방지
    sendToCompanyRiders(req.user.company_id, pushPayload).catch(err => {
      console.error('[push] 콜 알림 발송 오류:', err);
    });

    res.status(201).json({
      call_id: result.insertId,
      status: initialStatus,
      assigned_rider_id: assignedRiderId,
      message: assignedRiderId ? '콜이 생성되어 지명된 기사에게 배정되었습니다.' : '콜이 생성되었습니다.'
    });
  } catch (err) { console.error('POST /calls error:', err); res.status(500).json({ error: '콜 생성 실패' }); }
});

// PUT /api/calls/:id/accept — 콜 수락 (RIDER 일반기사, SUPER_ADMIN 사장겸업체관리자)
router.put('/:id/accept', authenticate, authorize('RIDER', 'SUPER_ADMIN'), async (req, res) => {
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

    // 수락한 콜 정보 반환 (운행 작성에 사용) — lat/lng 포함되어 자동 입력 가능
    const [updated] = await pool.execute(
      `SELECT c.*, cust.name AS customer_name, cust.phone AS customer_phone, cust.customer_code,
              partner.name AS partner_name
       FROM calls c
       LEFT JOIN customers cust ON c.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON c.partner_id = partner.partner_id
       WHERE c.call_id = ?`, [req.params.id]
    );

    // SA(사장님)에게 콜 수락 알림 (fire-and-forget, 2026-04-22 추가)
    // 본인이 수락한 경우는 자기 자신에게 보내지 않음 (excludeUserId)
    const acceptedCall = updated[0] || {};
    const riderName = req.user.name || '기사';
    const acceptBodyLines = [];
    acceptBodyLines.push(`${acceptedCall.start_address || '출발지 미정'}${acceptedCall.start_detail ? ' ' + acceptedCall.start_detail : ''}`);
    if (acceptedCall.end_address) acceptBodyLines.push(`→ ${acceptedCall.end_address}${acceptedCall.end_detail ? ' ' + acceptedCall.end_detail : ''}`);

    const acceptPushPayload = {
      title: `✅ ${riderName} 기사가 콜 수락`,
      body: acceptBodyLines.join('\n'),
      url: '/admin/calls',
      tag: `accept-${req.params.id}`,
      callId: parseInt(req.params.id),
    };

    sendToCompanyAdmins(req.user.company_id, acceptPushPayload, { excludeUserId: req.user.user_id }).catch(err => {
      console.error('[push] 콜 수락 알림 발송 오류:', err);
    });

    res.json({ message: '콜을 수락했습니다.', call: updated[0] });
  } catch (err) { await conn.rollback(); console.error('PUT /calls/:id/accept error:', err); res.status(500).json({ error: '콜 수락 실패' }); }
  finally { conn.release(); }
});

// PUT /api/calls/:id/complete — 운행 완료 (rides에 자동 연결)
// RIDER + SUPER_ADMIN 모두 가능 (본인이 수락한 콜만)
router.put('/:id/complete', authenticate, authorize('RIDER', 'SUPER_ADMIN'), async (req, res) => {
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

// PUT /api/calls/:id/cancel — 콜 취소
// 분기 기준: "본인이 수락한 콜인가?" (역할이 아닌 수락 여부 기준 — 2026-04-27 수정)
//   - 본인이 수락한 콜(ASSIGNED/IN_PROGRESS) → '수락 취소' = WAITING으로 복구 (RIDER, SUPER_ADMIN 모두)
//   - 그 외(WAITING 콜 또는 다른 기사가 수락한 콜) → SUPER_ADMIN만 가능, CANCELLED로 영구 취소
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const [calls] = await pool.execute(
      'SELECT * FROM calls WHERE call_id = ? AND company_id = ?',
      [req.params.id, req.user.company_id]
    );
    if (calls.length === 0) return res.status(404).json({ error: '콜을 찾을 수 없습니다.' });
    const call = calls[0];
    if (call.status === 'COMPLETED') return res.status(400).json({ error: '이미 완료된 콜은 취소할 수 없습니다.' });
    if (call.status === 'CANCELLED') return res.status(400).json({ error: '이미 취소된 콜입니다.' });

    // CASE 1: 본인이 수락한 콜의 '수락 취소' → WAITING으로 복구
    // (RIDER든 SUPER_ADMIN이든 동일하게 동작 — 본인이 수락한 콜이면 누구나 풀 수 있음)
    const isMyAcceptedCall = ['ASSIGNED', 'IN_PROGRESS'].includes(call.status)
      && call.assigned_rider_id === req.user.user_id;

    if (isMyAcceptedCall) {
      await pool.execute(
        "UPDATE calls SET status = 'WAITING', assigned_rider_id = NULL, assigned_at = NULL WHERE call_id = ?",
        [req.params.id]
      );
      writeAuditLog({
        company_id: req.user.company_id,
        user_id: req.user.user_id,
        action: 'CALL_RELEASE',
        target_table: 'calls',
        target_id: parseInt(req.params.id),
        ip_address: req.ip
      });
      return res.json({ message: '콜 수락이 취소되었습니다. 다른 기사가 수락할 수 있습니다.' });
    }

    // CASE 2: 본인이 수락한 콜이 아닌 경우 → SUPER_ADMIN만 영구 취소 가능
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'MASTER') {
      return res.status(403).json({ error: '본인이 수락한 콜만 취소할 수 있습니다.' });
    }

    const { cancel_reason } = req.body;
    await pool.execute(
      "UPDATE calls SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ? WHERE call_id = ?",
      [cancel_reason || null, req.params.id]
    );
    writeAuditLog({
      company_id: req.user.company_id,
      user_id: req.user.user_id,
      action: 'CALL_CANCEL',
      target_table: 'calls',
      target_id: parseInt(req.params.id),
      detail: cancel_reason ? { cancel_reason } : null,
      ip_address: req.ip
    });

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

    // payment_method가 변경되었거나 payment_type_id가 명시되었으면 자동 lookup
    if (req.body.payment_method !== undefined || req.body.payment_type_id !== undefined) {
      req.body.payment_type_id = await resolvePaymentTypeId(
        req.user.company_id,
        req.body.payment_type_id,
        req.body.payment_method
      );
    }

    // lat/lng도 수정 허용 (주소를 다시 검색했을 때 좌표 갱신)
    const allowed = [
      'customer_id', 'partner_id',
      'start_address', 'start_detail', 'start_lat', 'start_lng',
      'end_address', 'end_detail', 'end_lat', 'end_lng',
      'estimated_fare', 'payment_type_id', 'memo'
    ];
    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    await pool.execute(`UPDATE calls SET ${updates.join(', ')} WHERE call_id = ?`, values);
    res.json({ message: '콜이 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '콜 수정 실패' }); }
});

// ====================================================
// 헬퍼: payment_type_id 자동 lookup
// 우선순위:
//   1. explicit payment_type_id (프론트에서 명시)
//   2. payment_method가 payment_types.code와 직접 매칭
//   3. payment_method 영문 alias (CASH, CARD 등) → 한글 코드 변환 후 매칭
//   4. lookup 실패 시 null 반환 (정산 시 '미분류'로 빠짐)
// ====================================================
async function resolvePaymentTypeId(companyId, explicitId, paymentMethod) {
  // 1. explicit ID가 있고 유효하면 그대로 사용 (회사 소속 검증)
  if (explicitId) {
    const [rows] = await pool.execute(
      'SELECT payment_type_id FROM payment_types WHERE payment_type_id = ? AND company_id = ?',
      [explicitId, companyId]
    );
    if (rows.length > 0) return rows[0].payment_type_id;
  }

  if (!paymentMethod) return null;

  // 2. payment_method가 payment_types.code와 직접 매칭
  const [direct] = await pool.execute(
    'SELECT payment_type_id FROM payment_types WHERE company_id = ? AND code = ? AND is_active = TRUE LIMIT 1',
    [companyId, paymentMethod]
  );
  if (direct.length > 0) return direct[0].payment_type_id;

  // 3. 영문 alias → 한글 코드 변환 (양양대리 등 코드체계가 001~006인 업체 대응)
  const aliasMap = {
    'CASH': '001',
    'RIDER_ACCOUNT': '002',
    'DRIVER_ACCT': '002',
    'COMPANY_ACCOUNT': '003',
    'COMPANY_ACCT': '003',
    'NARASI': '004',
    'UNPAID': '005',
    'MISU': '005',
    'CARD': '006',
  };
  const mappedCode = aliasMap[paymentMethod];
  if (mappedCode) {
    const [aliased] = await pool.execute(
      'SELECT payment_type_id FROM payment_types WHERE company_id = ? AND code = ? AND is_active = TRUE LIMIT 1',
      [companyId, mappedCode]
    );
    if (aliased.length > 0) return aliased[0].payment_type_id;
  }

  return null;
}

module.exports = router;
