const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/pay-settings - 우리 업체 정산방식 조회
router.get('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || 0) : req.user.company_id;
    const [rows] = await pool.execute('SELECT * FROM company_pay_settings WHERE company_id = ?', [companyId]);
    if (rows.length === 0) {
      // 미설정이면 기본값 반환
      return res.json({ company_id: companyId, pay_type: 'PER_RIDE', default_hourly_rate: 0, default_per_ride_rate: 0, default_commission_pct: 20, min_work_policy: 'ROUND_DOWN', is_new: true });
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: '정산 설정 조회 실패' }); }
});

// PUT /api/pay-settings - 업체 정산방식 저장/수정
router.put('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || req.user.company_id) : req.user.company_id;
    const { pay_type, default_hourly_rate, default_per_ride_rate, default_commission_pct, min_work_policy } = req.body;

    if (!pay_type || !['HOURLY', 'PER_RIDE', 'COMMISSION'].includes(pay_type)) {
      return res.status(400).json({ error: '정산방식을 선택해주세요.' });
    }

    const [existing] = await pool.execute('SELECT id FROM company_pay_settings WHERE company_id = ?', [companyId]);

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE company_pay_settings SET pay_type = ?, default_hourly_rate = ?, default_per_ride_rate = ?, default_commission_pct = ?, min_work_policy = ?, updated_by = ? WHERE company_id = ?`,
        [pay_type, default_hourly_rate || 0, default_per_ride_rate || 0, default_commission_pct || 20, min_work_policy || 'ROUND_DOWN', req.user.user_id, companyId]
      );
    } else {
      await pool.execute(
        `INSERT INTO company_pay_settings (company_id, pay_type, default_hourly_rate, default_per_ride_rate, default_commission_pct, min_work_policy, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [companyId, pay_type, default_hourly_rate || 0, default_per_ride_rate || 0, default_commission_pct || 20, min_work_policy || 'ROUND_DOWN', req.user.user_id]
      );
    }
    res.json({ message: '정산 설정이 저장되었습니다.' });
  } catch (err) {
    console.error('PUT /pay-settings error:', err);
    res.status(500).json({ error: '정산 설정 저장 실패' });
  }
});

// ─── 기사별 개별 단가 ───

// GET /api/pay-settings/riders - 기사별 단가 목록
router.get('/riders', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || 0) : req.user.company_id;
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.name, u.phone, u.vehicle_number,
              r.id AS rate_id, r.hourly_rate, r.per_ride_rate, r.commission_pct, r.memo
       FROM users u
       LEFT JOIN rider_pay_rates r ON u.user_id = r.rider_id AND r.company_id = ?
       WHERE u.company_id = ? AND u.role IN ('RIDER', 'SUPER_ADMIN') AND u.status = 'ACTIVE'
       ORDER BY u.name`,
      [companyId, companyId]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '기사별 단가 조회 실패' }); }
});

// PUT /api/pay-settings/riders/:riderId - 기사별 단가 저장
router.put('/riders/:riderId', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || req.user.company_id) : req.user.company_id;
    const riderId = req.params.riderId;
    const { hourly_rate, per_ride_rate, commission_pct, memo } = req.body;

    const [existing] = await pool.execute('SELECT id FROM rider_pay_rates WHERE company_id = ? AND rider_id = ?', [companyId, riderId]);

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE rider_pay_rates SET hourly_rate = ?, per_ride_rate = ?, commission_pct = ?, memo = ?, updated_by = ? WHERE company_id = ? AND rider_id = ?`,
        [hourly_rate || null, per_ride_rate || null, commission_pct || null, memo || null, req.user.user_id, companyId, riderId]
      );
    } else {
      await pool.execute(
        `INSERT INTO rider_pay_rates (company_id, rider_id, hourly_rate, per_ride_rate, commission_pct, memo, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [companyId, riderId, hourly_rate || null, per_ride_rate || null, commission_pct || null, memo || null, req.user.user_id]
      );
    }
    res.json({ message: '기사 단가가 저장되었습니다.' });
  } catch (err) {
    console.error('PUT /pay-settings/riders error:', err);
    res.status(500).json({ error: '기사 단가 저장 실패' });
  }
});

// ─── 출퇴근 기록 (시급제용) ───

// GET /api/pay-settings/attendance - 출퇴근 목록
router.get('/attendance', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || 0) : req.user.company_id;
    const { month, rider_id } = req.query;

    let where = 'WHERE a.company_id = ?';
    const params = [companyId];
    if (month) { where += " AND DATE_FORMAT(a.work_date, '%Y-%m') = ?"; params.push(month); }
    if (rider_id) { where += ' AND a.rider_id = ?'; params.push(rider_id); }

    const [rows] = await pool.execute(
      `SELECT a.*, u.name AS rider_name
       FROM rider_attendance a JOIN users u ON a.rider_id = u.user_id
       ${where} ORDER BY a.work_date DESC, a.clock_in DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '출퇴근 기록 조회 실패' }); }
});

// POST /api/pay-settings/attendance - 출퇴근 기록 등록
router.post('/attendance', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || req.user.company_id) : req.user.company_id;
    const { rider_id, work_date, clock_in, clock_out, memo } = req.body;

    if (!rider_id || !work_date || !clock_in) {
      return res.status(400).json({ error: '기사, 근무일, 출근시간은 필수입니다.' });
    }

    // 근무시간 계산
    let workMinutes = null;
    let calculatedHours = null;
    if (clock_out) {
      workMinutes = Math.round((new Date(clock_out) - new Date(clock_in)) / 60000);
      if (workMinutes < 0) workMinutes = 0;

      // 1시간 미만 처리 정책 조회
      const [settings] = await pool.execute('SELECT min_work_policy FROM company_pay_settings WHERE company_id = ?', [companyId]);
      const policy = settings[0]?.min_work_policy || 'ROUND_DOWN';

      const hours = workMinutes / 60;
      const fullHours = Math.floor(hours);
      const remainder = hours - fullHours;

      switch (policy) {
        case 'ROUND_DOWN': calculatedHours = fullHours; break;
        case 'ROUND_UP': calculatedHours = remainder > 0 ? fullHours + 1 : fullHours; break;
        case 'ROUND_HALF': calculatedHours = remainder >= 0.5 ? fullHours + 1 : fullHours; break;
        case 'MIN_1HOUR': calculatedHours = hours < 1 ? 1 : fullHours; break;
        case 'ACTUAL': calculatedHours = Math.round(hours * 100) / 100; break;
        default: calculatedHours = fullHours;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO rider_attendance (company_id, rider_id, work_date, clock_in, clock_out, work_minutes, calculated_hours, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, rider_id, work_date, clock_in, clock_out || null, workMinutes, calculatedHours, memo || null]
    );

    res.status(201).json({ id: result.insertId, work_minutes: workMinutes, calculated_hours: calculatedHours, message: '출퇴근 기록이 등록되었습니다.' });
  } catch (err) {
    console.error('POST /attendance error:', err);
    res.status(500).json({ error: '출퇴근 기록 등록 실패' });
  }
});

// PUT /api/pay-settings/attendance/:id - 출퇴근 수정
router.put('/attendance/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { clock_in, clock_out, memo } = req.body;
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || req.user.company_id) : req.user.company_id;

    let workMinutes = null;
    let calculatedHours = null;
    if (clock_in && clock_out) {
      workMinutes = Math.round((new Date(clock_out) - new Date(clock_in)) / 60000);
      if (workMinutes < 0) workMinutes = 0;

      const [settings] = await pool.execute('SELECT min_work_policy FROM company_pay_settings WHERE company_id = ?', [companyId]);
      const policy = settings[0]?.min_work_policy || 'ROUND_DOWN';
      const hours = workMinutes / 60;
      const fullHours = Math.floor(hours);
      const remainder = hours - fullHours;

      switch (policy) {
        case 'ROUND_DOWN': calculatedHours = fullHours; break;
        case 'ROUND_UP': calculatedHours = remainder > 0 ? fullHours + 1 : fullHours; break;
        case 'ROUND_HALF': calculatedHours = remainder >= 0.5 ? fullHours + 1 : fullHours; break;
        case 'MIN_1HOUR': calculatedHours = hours < 1 ? 1 : fullHours; break;
        case 'ACTUAL': calculatedHours = Math.round(hours * 100) / 100; break;
        default: calculatedHours = fullHours;
      }
    }

    await pool.execute(
      'UPDATE rider_attendance SET clock_in = ?, clock_out = ?, work_minutes = ?, calculated_hours = ?, memo = ? WHERE id = ?',
      [clock_in, clock_out || null, workMinutes, calculatedHours, memo || null, req.params.id]
    );
    res.json({ message: '출퇴근 기록이 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '출퇴근 수정 실패' }); }
});

// DELETE /api/pay-settings/attendance/:id
router.delete('/attendance/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM rider_attendance WHERE id = ?', [req.params.id]);
    res.json({ message: '출퇴근 기록이 삭제되었습니다.' });
  } catch (err) { res.status(500).json({ error: '삭제 실패' }); }
});

module.exports = router;
