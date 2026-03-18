const jwt = require('jsonwebtoken');

// JWT 토큰 검증 미들웨어
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, company_id, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

// 역할 확인 미들웨어 (가변 인자)
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }
    next();
  };
}

// 같은 업체 소속 확인 (멀티테넌트 데이터 격리)
function sameCompany(req, res, next) {
  // MASTER는 모든 업체 접근 가능
  if (req.user.role === 'MASTER') return next();

  const requestedCompanyId = req.params.companyId || req.query.company_id || req.body?.company_id;
  if (requestedCompanyId && parseInt(requestedCompanyId) !== req.user.company_id) {
    return res.status(403).json({ error: '다른 업체의 데이터에 접근할 수 없습니다.' });
  }
  next();
}

module.exports = { authenticate, authorize, sameCompany };
