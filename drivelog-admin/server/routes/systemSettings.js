const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/system-settings - 전체 설정 조회
router.get('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM system_settings ORDER BY setting_key');
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '설정 조회 실패' }); }
});

// PUT /api/system-settings/:key - 설정 변경
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
