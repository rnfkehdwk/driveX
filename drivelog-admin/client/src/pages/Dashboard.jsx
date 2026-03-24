import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { fetchDailyStats, fetchPartnerStats, fetchMileageStats } from '../api/client';
import KpiCard from '../components/KpiCard';

export default function Dashboard() {
  const [daily, setDaily] = useState({ data: [], summary: {} });
  const [partners, setPartners] = useState({ data: [] });
  const [topCustomers, setTopCustomers] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDailyStats({ month }).then(setDaily).catch(() => {}),
      fetchPartnerStats({ month }).then(setPartners).catch(() => {}),
      fetchMileageStats({ month }).then(res => setTopCustomers((res.data || []).slice(0, 6))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [month]);

  const s = daily.summary || {};

  // 일별 매출 차트: 최근 7일만
  const allChartData = (daily.data || []).map(d => ({
    date: (d.date || '').slice(5),
    매출: Number(d.total_fare || 0),
    콜수: d.partner_calls || 0,
  }));
  const chartData = allChartData.slice(-7);

  // 제휴업체 TOP 6
  const topPartners = (partners.data || []).slice(0, 6);
  const totalCalls = partners.totalCalls || topPartners.reduce((s, p) => s + (p.calls || 0), 0);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터 로딩 중...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>조회 기간</div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: "'Noto Sans KR'" }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="총 매출" value={`${(s.total_fare || 0).toLocaleString()}원`} icon="💰" bg="#eff6ff" accent="#2563eb" />
        <KpiCard label="운행 건수" value={`${s.ride_count || 0}건`} icon="🚗" bg="#f0fdf4" accent="#16a34a" />
        <KpiCard label="제휴업체 콜" value={`${s.partner_calls || 0}건`} icon="📞" bg="#fffbeb" accent="#d97706" />
        <KpiCard label="마일리지 발생" value={`${(s.mileage_earned || 0).toLocaleString()}원`} icon="⭐" bg="#fdf2f8" accent="#db2777" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        {/* 일별 매출 (최근 7일) */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>일별 매출</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>최근 7일</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${v.toLocaleString()}원`, '매출']} />
              <Bar dataKey="매출" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 고객 TOP 6 */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>고객 TOP 6</div>
          {topCustomers.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>}
          {topCustomers.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < topCustomers.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? '#2563eb' : '#e2e8f0', color: i < 3 ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.customer_code || c.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{Number(c.total_fare || 0).toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        {/* 제휴업체 콜 TOP 6 */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>제휴업체 콜 TOP 6</div>
          {topPartners.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>}
          {topPartners.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < topPartners.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? '#d97706' : '#e2e8f0', color: i < 3 ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{p.calls}건</span>
                {totalCalls > 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>({((p.calls / totalCalls) * 100).toFixed(0)}%)</span>}
              </div>
            </div>
          ))}
        </div>

        {/* 일별 제휴 콜 추이 (최근 7일) */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>일별 제휴 콜 추이</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>최근 7일</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="콜수" stroke="#d97706" strokeWidth={2.5} dot={{ fill: '#d97706', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
