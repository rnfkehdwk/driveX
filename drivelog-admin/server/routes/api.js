const express = require('express');
const router = express.Router();
const { rides, dailyStats, partnerCalls, customerMileage } = require('../data/mockData');

// GET /api/rides - 운행일지 목록
router.get('/rides', (req, res) => {
  const { page = 1, limit = 30, month, driver, customer } = req.query;
  let filtered = [...rides];

  if (month) filtered = filtered.filter(r => r.date.startsWith(month));
  if (driver) filtered = filtered.filter(r => r.rider_name.includes(driver));
  if (customer) filtered = filtered.filter(r => r.customer_name.includes(customer));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + Number(limit));

  res.json({ data, total, page: Number(page), limit: Number(limit) });
});

// GET /api/stats/daily - 일자별 통계 (마일리지 관리 일자별)
router.get('/stats/daily', (req, res) => {
  const { month } = req.query;
  let filtered = [...dailyStats];
  if (month) filtered = filtered.filter(s => s.date.startsWith(month));

  const summary = filtered.reduce((acc, s) => ({
    total_fare: acc.total_fare + s.total_fare,
    ride_count: acc.ride_count + s.ride_count,
    partner_calls: acc.partner_calls + s.partner_calls,
    mileage_earned: acc.mileage_earned + s.mileage_earned,
  }), { total_fare: 0, ride_count: 0, partner_calls: 0, mileage_earned: 0 });

  res.json({ data: filtered, summary });
});

// GET /api/stats/partners - 제휴업체별 콜횟수
router.get('/stats/partners', (req, res) => {
  const totalCalls = partnerCalls.reduce((sum, p) => sum + p.calls, 0);
  res.json({ data: partnerCalls, totalCalls });
});

// GET /api/stats/mileage - 고객별 마일리지
router.get('/stats/mileage', (req, res) => {
  const { q } = req.query;
  let filtered = [...customerMileage];
  if (q) filtered = filtered.filter(c => c.customer_code.includes(q));

  const summary = filtered.reduce((acc, c) => ({
    total_fare: acc.total_fare + c.total_fare,
    mileage_earned: acc.mileage_earned + c.mileage_earned,
    mileage_used: acc.mileage_used + c.mileage_used,
  }), { total_fare: 0, mileage_earned: 0, mileage_used: 0 });

  res.json({ data: filtered, summary });
});

module.exports = router;
