require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/database');

const authRoutes = require('./routes/auth');
const ridesRoutes = require('./routes/rides');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const customersRoutes = require('./routes/customers');
const partnersRoutes = require('./routes/partners');
const settlementsRoutes = require('./routes/settlements');
const settlementGroupsRoutes = require('./routes/settlementGroups');
const farePoliciesRoutes = require('./routes/farePolices');
const billingRoutes = require('./routes/billing');
const billingPlansRoutes = require('./routes/billingPlans');
const companiesRoutes = require('./routes/companies');
const paymentTypesRoutes = require('./routes/paymentTypes');
const permissionsRoutes = require('./routes/permissions');
const publicRoutes = require('./routes/publicRoutes');
const systemSettingsRoutes = require('./routes/systemSettings');
const paySettingsRoutes = require('./routes/paySettings');
const inquiriesRoutes = require('./routes/inquiries');
const callsRoutes = require('./routes/calls');
const auditLogsRoutes = require('./routes/auditLogs');
const mileageRoutes = require('./routes/mileage');
const pushRoutes = require('./routes/push');

const { startCleanupScheduler } = require('./middleware/cleanupTestData');
const { initVapid } = require('./utils/pushSender');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? ['https://admin.drivelog.co.kr', 'https://biz.drivelog.co.kr'] : '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), max: parseInt(process.env.RATE_LIMIT_MAX || '200'), message: { error: '요청이 너무 많습니다.' }, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: '로그인 시도가 너무 많습니다.' } }));
app.use('/api/public/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: '가입 시도가 너무 많습니다.' } }));
// 비밀번호 찾기 및 아이디 찾기 rate limit (시간당 5회/IP)
app.use('/api/public/find-id', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: '아이디 찾기 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' } }));
app.use('/api/public/request-password-reset', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: '비밀번호 찾기 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } }));

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/settlement-groups', settlementGroupsRoutes);
app.use('/api/fare-policies', farePoliciesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-plans', billingPlansRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/payment-types', paymentTypesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/pay-settings', paySettingsRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (req, res) => { res.json({ status: 'ok', version: '2.7', timestamp: new Date().toISOString() }); });

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });
app.use((err, req, res, next) => { console.error('Unhandled error:', err); res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' }); });

async function start() {
  await testConnection();
  // VAPID 초기화 시도 (실패해도 서버는 정상 기동)
  initVapid();
  app.listen(PORT, () => {
    console.log(`DriveLog Admin Server v2.7 running on http://localhost:${PORT}`);
    // 검증용 테스트 데이터 자동 정리 스케줄러 시작 (24h 주기, 14일 경과)
    startCleanupScheduler();
  });
}
start();
