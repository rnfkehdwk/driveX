const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '인증이 필요합니다.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    next();
  };
}

function sameCompany(req, res, next) {
  if (req.user.role === 'MASTER') return next();
  const requestedCompanyId = req.params.companyId || req.query.company_id || req.body?.company_id;
  if (requestedCompanyId && parseInt(requestedCompanyId) !== req.user.company_id) return res.status(403).json({ error: '다른 업체의 데이터에 접근할 수 없습니다.' });
  next();
}

/**
 * 라이선스 만료일 체크 미들웨어
 * - MASTER는 제한 없음
 * - 만료된 업체: req.licenseExpired = true, req.licenseExpires = '2026-03-24'
 * - 정상 업체: req.licenseExpired = false
 * - 데이터 조회 시 각 라우트에서 req.licenseExpires를 사용해 날짜 필터 적용
 */
async function checkLicense(req, res, next) {
  if (req.user.role === 'MASTER') {
    req.licenseExpired = false;
    req.licenseExpires = null;
    return next();
  }

  try {
    const [rows] = await pool.execute(
      'SELECT license_expires FROM companies WHERE company_id = ?',
      [req.user.company_id]
    );

    if (rows.length === 0) {
      req.licenseExpired = false;
      req.licenseExpires = null;
      return next();
    }

    const licenseExpires = rows[0].license_expires;
    req.licenseExpires = licenseExpires;

    if (licenseExpires) {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const exp = new Date(licenseExpires); exp.setHours(23, 59, 59, 999);
      req.licenseExpired = now > exp;
    } else {
      req.licenseExpired = false;
    }

    next();
  } catch (err) {
    console.error('checkLicense error:', err);
    req.licenseExpired = false;
    req.licenseExpires = null;
    next();
  }
}

module.exports = { authenticate, authorize, sameCompany, checkLicense };
