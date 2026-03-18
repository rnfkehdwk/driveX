require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const ridesRoutes = require('./routes/rides');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const customersRoutes = require('./routes/customers');
const partnersRoutes = require('./routes/partners');
const settlementsRoutes = require('./routes/settlements');
const farePoliciesRoutes = require('./routes/farePolices');
const billingRoutes = require('./routes/billing');
const companiesRoutes = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Middleware ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://admin.drivelog.co.kr', 'https://biz.drivelog.co.kr']
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.' },
});
app.use('/api/auth/login', loginLimiter);

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/fare-policies', farePoliciesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/companies', companiesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.5', timestamp: new Date().toISOString() });
});

// ---- Serve React build (production) ----
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ---- Start ----
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`DriveLog Admin Server v1.5 running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
