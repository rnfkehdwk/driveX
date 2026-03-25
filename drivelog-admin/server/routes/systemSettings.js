const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/system-settings - 전체 설정 조회 (MASTER 전용)
router.get('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM system_settings ORDER BY setting_key');
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '설정 조회 실패' }); }
});

// GET /api/system-settings/payment-info - 결제 계좌 정보 (SUPER_ADMIN도 조회 가능)
router.get('/payment-info', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('payment_bank', 'payment_account', 'payment_holder', 'payment_note')"
    );
    const info = {};
    rows.forEach(r => { info[r.setting_key] = r.setting_value; });
    res.json({
      bank: info.payment_bank || '',
      account: info.payment_account || '',
      holder: info.payment_holder || '',
      note: info.payment_note || '',
    });
  } catch (err) { res.status(500).json({ error: '결제 정보 조회 실패' }); }
});

// PUT /api/system-settings/:key - 설정 변경 (MASTER 전용)
router.put('/:key', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: '값을 입력해주세요.' });
    await pool.execute(
      'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
      [String(value), req.user.user_id, req.params.key]
    );
    res.json({ message: `설정이 변경되었습니다. (${req.params.key} = ${value})` });
  } catch (err) { res.status(500).json({ error: '설정 변경 실패' }); }
});

module.exports = router;
