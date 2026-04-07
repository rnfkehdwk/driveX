const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { month, rider_id, status } = req.query;
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;
    let where = 'WHERE s.company_id = ?'; const params = [companyId];
    if (month) { where += ' AND DATE_FORMAT(s.period_start, "%Y-%m") <= ? AND DATE_FORMAT(s.period_end, "%Y-%m") >= ?'; params.push(month, month); }
    if (rider_id) { where += ' AND s.rider_id = ?'; params.push(rider_id); }
    if (status) { where += ' AND s.status = ?'; params.push(status); }
    const [rows] = await pool.execute(`SELECT s.*, u.name AS rider_name, u.phone AS rider_phone, approver.name AS approved_by_name FROM settlements s JOIN users u ON s.rider_id = u.user_id LEFT JOIN users approver ON s.approved_by = approver.user_id ${where} ORDER BY s.period_start DESC, u.name`, params);
    const summary = rows.reduce((acc, r) => ({ total_fare: acc.total_fare + Number(r.total_fare), total_commission: acc.total_commission + Number(r.total_commission), rider_payout: acc.rider_payout + Number(r.rider_payout), count: acc.count + 1 }), { total_fare: 0, total_commission: 0, rider_payout: 0, count: 0 });
    res.json({ data: rows, summary });
  } catch (err) { console.error('GET /settlements error:', err); res.status(500).json({ error: '정산 목록 조회에 실패했습니다.' }); }
});

router.get('/preview', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { period_start, period_end } = req.query;
    const companyId = req.user.company_id;
    if (!period_start || !period_end) return res.status(400).json({ error: '기간을 선택하세요.' });
    const [riderStats] = await pool.execute(`SELECT r.rider_id, u.name AS rider_name, u.phone, COUNT(*) AS total_rides, COALESCE(SUM(r.total_fare), 0) AS total_fare FROM rides r JOIN users u ON r.rider_id = u.user_id WHERE r.company_id = ? AND r.status = 'COMPLETED' AND DATE(r.started_at) BETWEEN ? AND ? AND r.ride_id NOT IN (SELECT ride_id FROM settlement_rides) GROUP BY r.rider_id, u.name, u.phone`, [companyId, period_start, period_end]);
    const [riderRates] = await pool.execute('SELECT * FROM rider_pay_rates WHERE company_id = ?', [companyId]);
    const rateMap = {}; riderRates.forEach(r => rateMap[r.rider_id] = r);
    const [paySettings] = await pool.execute('SELECT * FROM company_pay_settings WHERE company_id = ?', [companyId]);
    const settings = paySettings[0] || { pay_type: 'PER_RIDE', default_hourly_rate: 0, default_per_ride_rate: 0, default_commission_pct: 20 };
    const preview = riderStats.map(stat => {
      const rate = rateMap[stat.rider_id] || {};
      return { rider_id: stat.rider_id, rider_name: stat.rider_name, phone: stat.phone, total_rides: stat.total_rides, total_fare: Number(stat.total_fare), hourly_rate: rate.hourly_rate ?? settings.default_hourly_rate, per_ride_rate: rate.per_ride_rate ?? settings.default_per_ride_rate, commission_pct: rate.commission_pct ?? Number(settings.default_commission_pct) };
    });
    res.json({ data: preview, pay_type: settings.pay_type, settings });
  } catch (err) { console.error('GET /settlements/preview error:', err); res.status(500).json({ error: '미리보기 조회 실패' }); }
});

// 만료 시 정산 생성 차단
router.post('/generate', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 정산 생성이 불가합니다.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { period_start, period_end, period_type = 'MONTHLY', rider_hours = {} } = req.body;
    const companyId = req.user.company_id;
    if (!period_start || !period_end) return res.status(400).json({ error: '정산 기간은 필수입니다.' });
    const [paySettings] = await conn.execute('SELECT * FROM company_pay_settings WHERE company_id = ?', [companyId]);
    const settings = paySettings[0] || { pay_type: 'PER_RIDE', default_hourly_rate: 0, default_per_ride_rate: 0, default_commission_pct: 20 };
    const payType = settings.pay_type;
    const [riderStats] = await conn.execute(`SELECT r.rider_id, u.name AS rider_name, COUNT(*) AS total_rides, COALESCE(SUM(r.total_fare), 0) AS total_fare FROM rides r JOIN users u ON r.rider_id = u.user_id WHERE r.company_id = ? AND r.status = 'COMPLETED' AND DATE(r.started_at) BETWEEN ? AND ? AND r.ride_id NOT IN (SELECT ride_id FROM settlement_rides) GROUP BY r.rider_id, u.name`, [companyId, period_start, period_end]);
    if (riderStats.length === 0) { await conn.rollback(); return res.status(400).json({ error: '해당 기간에 미정산 운행 기록이 없습니다.' }); }
    const [riderRates] = await conn.execute('SELECT * FROM rider_pay_rates WHERE company_id = ?', [companyId]);
    const rateMap = {}; riderRates.forEach(r => rateMap[r.rider_id] = r);
    const created = [];
    for (const stat of riderStats) {
      const rate = rateMap[stat.rider_id] || {};
      let payout = 0, commission = 0, workHours = null, appliedHourlyRate = null, appliedPerRideRate = null, appliedCommissionPct = null;
      switch (payType) {
        case 'HOURLY': workHours = parseFloat(rider_hours[stat.rider_id]) || 0; appliedHourlyRate = rate.hourly_rate ?? settings.default_hourly_rate; payout = Math.round(workHours * appliedHourlyRate); commission = Number(stat.total_fare) - payout; if (commission < 0) commission = 0; break;
        case 'PER_RIDE': appliedPerRideRate = rate.per_ride_rate ?? settings.default_per_ride_rate; payout = stat.total_rides * appliedPerRideRate; commission = Number(stat.total_fare) - payout; if (commission < 0) commission = 0; break;
        case 'COMMISSION': appliedCommissionPct = rate.commission_pct ?? Number(settings.default_commission_pct); commission = Math.floor(Number(stat.total_fare) * appliedCommissionPct / 100); payout = Number(stat.total_fare) - commission; break;
      }
      const [result] = await conn.execute(`INSERT INTO settlements (company_id, rider_id, period_start, period_end, period_type, total_rides, total_fare, total_commission, total_platform_fee, rider_payout, status, pay_type, work_hours, hourly_rate, per_ride_rate, commission_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', ?, ?, ?, ?, ?)`, [companyId, stat.rider_id, period_start, period_end, period_type, stat.total_rides, stat.total_fare, commission, payout, payType, workHours, appliedHourlyRate, appliedPerRideRate, appliedCommissionPct]);
      const [rides] = await conn.execute(`SELECT ride_id FROM rides WHERE company_id = ? AND rider_id = ? AND status = 'COMPLETED' AND DATE(started_at) BETWEEN ? AND ? AND ride_id NOT IN (SELECT ride_id FROM settlement_rides)`, [companyId, stat.rider_id, period_start, period_end]);
      for (const ride of rides) await conn.execute('INSERT INTO settlement_rides (settlement_id, ride_id) VALUES (?, ?)', [result.insertId, ride.ride_id]);
      created.push({ settlement_id: result.insertId, rider_name: stat.rider_name, total_rides: stat.total_rides, total_fare: stat.total_fare, payout, work_hours: workHours });
    }
    await conn.commit();
    writeAuditLog({ company_id: companyId, user_id: req.user.user_id, action: 'SETTLEMENT_GENERATE', detail: { period_start, period_end, pay_type: payType, count: created.length }, ip_address: req.ip });
    res.status(201).json({ message: `${created.length}건의 정산이 생성되었습니다. (${payType})`, data: created });
  } catch (err) { await conn.rollback(); console.error('POST /settlements/generate error:', err); res.status(500).json({ error: '정산 생성에 실패했습니다.' }); }
  finally { conn.release(); }
});

router.put('/:id/approve', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try { await pool.execute(`UPDATE settlements SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE settlement_id = ? AND company_id = ?`, [req.user.user_id, req.params.id, req.user.company_id]); res.json({ message: '정산이 승인되었습니다.' }); }
  catch (err) { res.status(500).json({ error: '정산 승인에 실패했습니다.' }); }
});

router.put('/:id/pay', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try { await pool.execute(`UPDATE settlements SET status = 'PAID', paid_at = NOW() WHERE settlement_id = ? AND status = 'APPROVED'`, [req.params.id]); res.json({ message: '지급 처리가 완료되었습니다.' }); }
  catch (err) { res.status(500).json({ error: '지급 처리에 실패했습니다.' }); }
});

// GET /api/settlements/daily - 일일 운임 정산 리포트
router.get('/daily', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;
    if (!companyId) return res.status(400).json({ error: '업체를 선택하세요.' });

    // 1. 해당 날짜의 완료된 운행 내역 (취소 제외)
    const [rides] = await pool.execute(
      `SELECT r.ride_id, DATE_FORMAT(r.started_at, '%H:%i') AS ride_time, r.total_fare, r.cash_amount, r.mileage_used,
              r.payment_method, r.start_address, r.end_address,
              cust.name AS customer_name, cust.customer_code,
              rider.name AS rider_name, r.rider_id,
              partner.name AS partner_name,
              pt.payment_type_id, pt.label AS payment_label, pt.settlement_group_id,
              sg.name AS group_name, sg.color AS group_color
       FROM rides r
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id
       LEFT JOIN users rider ON r.rider_id = rider.user_id
       LEFT JOIN partner_companies partner ON r.partner_id = partner.partner_id
       LEFT JOIN payment_types pt ON pt.company_id = r.company_id AND pt.code = r.payment_method
       LEFT JOIN settlement_groups sg ON pt.settlement_group_id = sg.group_id
       WHERE r.company_id = ? AND r.status != 'CANCELLED' AND DATE(r.started_at) = ?
       ORDER BY r.started_at DESC`,
      [companyId, targetDate]
    );

    // 2. 정산 그룹 목록 (설정되지 않은 결제구분도 '미분류'로 표시)
    const [groups] = await pool.execute(
      `SELECT group_id, name, color FROM settlement_groups WHERE company_id = ? ORDER BY sort_order, group_id`,
      [companyId]
    );

    // 3. 결제방법별 집계
    const byPayment = {};
    rides.forEach(r => {
      const key = r.payment_method || 'UNKNOWN';
      if (!byPayment[key]) {
        byPayment[key] = {
          code: key,
          label: r.payment_label || r.payment_method || '미분류',
          group_id: r.settlement_group_id,
          group_name: r.group_name || '미분류',
          group_color: r.group_color || '#94a3b8',
          total: 0, count: 0
        };
      }
      byPayment[key].total += Number(r.total_fare || 0);
      byPayment[key].count += 1;
    });

    // 4. 정산 그룹별 집계
    const byGroup = {};
    groups.forEach(g => {
      byGroup[g.group_id] = { group_id: g.group_id, name: g.name, color: g.color, total: 0, count: 0 };
    });
    byGroup['unclassified'] = { group_id: null, name: '미분류', color: '#94a3b8', total: 0, count: 0 };

    rides.forEach(r => {
      const gid = r.settlement_group_id || 'unclassified';
      if (!byGroup[gid]) byGroup[gid] = { group_id: gid, name: r.group_name || '미분류', color: r.group_color || '#94a3b8', total: 0, count: 0 };
      byGroup[gid].total += Number(r.total_fare || 0);
      byGroup[gid].count += 1;
    });

    // 5. 기사별 집계 (그룹별 금액 포함)
    const byRider = {};
    rides.forEach(r => {
      const rid = r.rider_id || 'unknown';
      if (!byRider[rid]) {
        byRider[rid] = {
          rider_id: r.rider_id,
          rider_name: r.rider_name || '미배정',
          total: 0,
          count: 0,
          groups: {}
        };
      }
      byRider[rid].total += Number(r.total_fare || 0);
      byRider[rid].count += 1;
      const gid = r.settlement_group_id || 'unclassified';
      if (!byRider[rid].groups[gid]) byRider[rid].groups[gid] = 0;
      byRider[rid].groups[gid] += Number(r.total_fare || 0);
    });

    // 6. 전체 합계
    const totalFare = rides.reduce((sum, r) => sum + Number(r.total_fare || 0), 0);

    res.json({
      date: targetDate,
      total: { fare: totalFare, count: rides.length },
      groups: Object.values(byGroup).filter(g => g.count > 0 || g.group_id !== null),
      payments: Object.values(byPayment),
      riders: Object.values(byRider),
      rides,
    });
  } catch (err) {
    console.error('GET /settlements/daily error:', err);
    res.status(500).json({ error: '일일 정산 조회에 실패했습니다.' });
  }
});

module.exports = router;
