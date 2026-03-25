const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { role, status, q } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    if (req.user.role !== 'MASTER') { where += ' AND u.company_id = ?'; params.push(req.user.company_id); }
    if (role) { where += ' AND u.role = ?'; params.push(role); }
    if (status) { where += ' AND u.status = ?'; params.push(status); }
    if (q) { where += ' AND (u.name LIKE ? OR u.login_id LIKE ? OR u.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const [rows] = await pool.execute(`SELECT u.user_id, u.company_id, u.login_id, u.role, u.name, u.phone, u.email, u.vehicle_number, u.vehicle_type, u.status, u.last_login_at, u.created_at, c.company_name FROM users u LEFT JOIN companies c ON u.company_id = c.company_id ${where} ORDER BY u.created_at DESC`, params);
    res.json({ data: rows });
  } catch (err) { console.error('GET /users error:', err); res.status(500).json({ error: '사용자 목록 조회에 실패했습니다.' }); }
});

router.get('/riders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT user_id, name, phone, vehicle_number FROM users WHERE company_id = ? AND role = 'RIDER' AND status = 'ACTIVE' ORDER BY name`, [req.user.company_id]);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '기사 목록 조회에 실패했습니다.' }); }
});

// GET /api/users/rider-limit — 현재 기사수 + 요금제 제한 정보
router.get('/rider-limit', authenticate, async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;
    if (!companyId) return res.json({ current: 0, max: 0, plan_name: '-' });

    const [riderCount] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE company_id = ? AND role = 'RIDER' AND status = 'ACTIVE'",
      [companyId]
    );
    const [planInfo] = await pool.execute(
      `SELECT p.plan_name, p.max_riders, p.free_riders
       FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id
       WHERE c.company_id = ?`,
      [companyId]
    );

    const plan = planInfo[0] || {};
    res.json({
      current: riderCount[0].cnt,
      max: plan.max_riders || 0,  // 0 = 무제한
      free_riders: plan.free_riders || 0,
      plan_name: plan.plan_name || '미지정',
    });
  } catch (err) { res.status(500).json({ error: '기사 제한 정보 조회 실패' }); }
});

router.get('/master-count', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'MASTER'");
    res.json({ count: rows[0].cnt });
  } catch (err) { res.status(500).json({ error: '조회 실패' }); }
});

// POST — 기사 등록 (만료 차단 + 요금제 기사수 제한)
router.post('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 계정 등록이 불가합니다.' });

  try {
    const { login_id, password, role, name, phone, email, vehicle_number, vehicle_type } = req.body;
    if (!login_id || !password || !name || !phone) return res.status(400).json({ error: '필수 항목을 입력하세요.' });

    const targetRole = role || 'RIDER';
    const companyId = req.user.role === 'MASTER' ? (req.body.company_id || null) : req.user.company_id;

    // MASTER 계정 제한
    if (targetRole === 'MASTER') {
      if (req.user.role !== 'MASTER') return res.status(403).json({ error: 'MASTER 계정은 MASTER만 생성 가능합니다.' });
      const [cnt] = await pool.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'MASTER'");
      if (cnt[0].c >= 3) return res.status(400).json({ error: 'MASTER 계정은 최대 3개까지만 생성 가능합니다.' });
    }

    // 요금제 기사수 제한 체크 (RIDER 또는 SUPER_ADMIN 생성 시)
    if (companyId && ['RIDER', 'SUPER_ADMIN'].includes(targetRole) && req.user.role !== 'MASTER') {
      const [planInfo] = await pool.execute(
        `SELECT p.max_riders, p.plan_name
         FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id
         WHERE c.company_id = ?`,
        [companyId]
      );
      const maxRiders = planInfo[0]?.max_riders || 0;

      if (maxRiders > 0) {
        // 현재 활성 기사 + SUPER_ADMIN 수 (MASTER 제외)
        const [currentCount] = await pool.execute(
          "SELECT COUNT(*) AS cnt FROM users WHERE company_id = ? AND role IN ('RIDER', 'SUPER_ADMIN') AND status = 'ACTIVE'",
          [companyId]
        );

        if (currentCount[0].cnt >= maxRiders) {
          return res.status(400).json({
            error: `요금제(${planInfo[0]?.plan_name || ''})의 최대 계정 수(${maxRiders}명)에 도달했습니다. 요금제를 업그레이드하거나 비활성 계정을 정리해주세요.`,
            code: 'RIDER_LIMIT_EXCEEDED',
            current: currentCount[0].cnt,
            max: maxRiders,
          });
        }
      }
    }

    const [existing] = await pool.execute('SELECT user_id FROM users WHERE login_id = ?', [login_id]);
    if (existing.length > 0) return res.status(409).json({ error: '이미 사용 중인 로그인 ID입니다.' });

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(password, rounds);

    const [result] = await pool.execute(
      `INSERT INTO users (company_id, login_id, password_hash, role, name, phone, email, vehicle_number, vehicle_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [companyId, login_id, hash, targetRole, name, phone, email || null, vehicle_number || null, vehicle_type || null]
    );
    await pool.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [result.insertId, hash]);
    writeAuditLog({ company_id: companyId, user_id: req.user.user_id, action: 'USER_CREATE', target_table: 'users', target_id: result.insertId, ip_address: req.ip });
    res.status(201).json({ user_id: result.insertId, message: '사용자가 등록되었습니다.' });
  } catch (err) { console.error('POST /users error:', err); res.status(500).json({ error: '사용자 등록에 실패했습니다.' }); }
});

// PUT — 수정 (만료 차단 + 비활성→활성 전환 시에도 기사수 체크)
router.put('/:id', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 계정 수정이 불가합니다.' });

  try {
    // 비활성→활성 전환 시 기사수 체크
    if (req.body.status === 'ACTIVE' && req.user.role !== 'MASTER') {
      const companyId = req.user.company_id;
      const [targetUser] = await pool.execute('SELECT status, role FROM users WHERE user_id = ? AND company_id = ?', [req.params.id, companyId]);

      if (targetUser.length > 0 && targetUser[0].status !== 'ACTIVE' && ['RIDER', 'SUPER_ADMIN'].includes(targetUser[0].role)) {
        const [planInfo] = await pool.execute(
          `SELECT p.max_riders, p.plan_name FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id WHERE c.company_id = ?`, [companyId]
        );
        const maxRiders = planInfo[0]?.max_riders || 0;

        if (maxRiders > 0) {
          const [currentCount] = await pool.execute(
            "SELECT COUNT(*) AS cnt FROM users WHERE company_id = ? AND role IN ('RIDER', 'SUPER_ADMIN') AND status = 'ACTIVE'", [companyId]
          );
          if (currentCount[0].cnt >= maxRiders) {
            return res.status(400).json({
              error: `요금제(${planInfo[0]?.plan_name || ''})의 최대 계정 수(${maxRiders}명)에 도달하여 계정을 활성화할 수 없습니다.`,
              code: 'RIDER_LIMIT_EXCEEDED',
            });
          }
        }
      }
    }

    if (req.body.role === 'MASTER' && req.user.role === 'MASTER') {
      const [cnt] = await pool.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'MASTER' AND user_id != ?", [req.params.id]);
      if (cnt[0].c >= 3) return res.status(400).json({ error: 'MASTER 계정은 최대 3개까지만 가능합니다.' });
    }

    const baseAllowed = ['name', 'phone', 'email', 'vehicle_number', 'vehicle_type', 'status', 'role'];
    const allowed = req.user.role === 'MASTER' ? [...baseAllowed, 'company_id'] : baseAllowed;
    if (req.user.role === 'SUPER_ADMIN' && req.body.role && !['RIDER', 'SUPER_ADMIN'].includes(req.body.role)) return res.status(403).json({ error: '허용되지 않는 권한입니다.' });

    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    if (req.user.role === 'SUPER_ADMIN') { values.push(req.user.company_id); await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ? AND company_id = ?`, values); }
    else await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);

    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'USER_UPDATE', target_table: 'users', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '사용자 정보가 수정되었습니다.' });
  } catch (err) { console.error('PUT /users/:id error:', err); res.status(500).json({ error: '사용자 수정에 실패했습니다.' }); }
});

module.exports = router;
