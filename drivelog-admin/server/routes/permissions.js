const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/permissions - 기본 역할별 권한 목록
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM role_permissions ORDER BY menu_group, permission_id');
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /permissions error:', err);
    res.status(500).json({ error: '권한 목록 조회 실패' });
  }
});

// PUT /api/permissions/bulk/update - 기본 권한 일괄 수정 (MASTER)
router.put('/bulk/update', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || !Array.isArray(permissions)) return res.status(400).json({ error: '잘못된 요청' });
    for (const p of permissions) {
      await pool.execute(
        'UPDATE role_permissions SET role_master = ?, role_superadmin = ?, role_rider = ? WHERE permission_id = ?',
        [p.role_master ? 1 : 0, p.role_superadmin ? 1 : 0, p.role_rider ? 1 : 0, p.permission_id]
      );
    }
    res.json({ message: `${permissions.length}개 권한이 수정되었습니다.` });
  } catch (err) {
    console.error('PUT /permissions/bulk error:', err);
    res.status(500).json({ error: '권한 일괄 수정 실패' });
  }
});

// GET /api/permissions/company/:companyId - 특정 업체의 메뉴별 권한 조회
router.get('/company/:companyId', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const companyId = req.params.companyId;
    // role_permissions의 모든 메뉴 + company_permissions에서 해당 업체의 설정 JOIN
    const [rows] = await pool.execute(
      `SELECT rp.permission_id, rp.menu_key, rp.menu_label, rp.menu_group, rp.platform,
              rp.role_superadmin AS default_allowed,
              COALESCE(cp.is_allowed, rp.role_superadmin) AS is_allowed,
              IF(cp.id IS NOT NULL, TRUE, FALSE) AS is_custom
       FROM role_permissions rp
       LEFT JOIN company_permissions cp ON rp.menu_key = cp.menu_key AND cp.company_id = ?
       ORDER BY rp.menu_group, rp.permission_id`,
      [companyId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /permissions/company error:', err);
    res.status(500).json({ error: '업체 권한 조회 실패' });
  }
});

// PUT /api/permissions/company/:companyId - 특정 업체의 권한 일괄 저장
router.put('/company/:companyId', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { permissions } = req.body; // [{ menu_key, is_allowed }]
    if (!permissions || !Array.isArray(permissions)) return res.status(400).json({ error: '잘못된 요청' });

    for (const p of permissions) {
      // UPSERT: 있으면 업데이트, 없으면 삽입
      await pool.execute(
        `INSERT INTO company_permissions (company_id, menu_key, is_allowed)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
        [companyId, p.menu_key, p.is_allowed ? 1 : 0]
      );
    }
    res.json({ message: `${permissions.length}개 업체 권한이 저장되었습니다.` });
  } catch (err) {
    console.error('PUT /permissions/company error:', err);
    res.status(500).json({ error: '업체 권한 저장 실패' });
  }
});

// DELETE /api/permissions/company/:companyId - 업체 커스텀 권한 초기화 (기본값으로 복원)
router.delete('/company/:companyId', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM company_permissions WHERE company_id = ?', [req.params.companyId]);
    res.json({ message: '업체 권한이 기본값으로 초기화되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '초기화 실패' });
  }
});

module.exports = router;
