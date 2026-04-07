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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDailyStats({ month }).then(setDaily).catch(() => {}),
      fetchPartnerStats({ month }).then(setPartners).catch(() => {}),
      fetchMileageStats({ month }).then(res => setTopCustomers((res.data || []).slice(0, 6))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [month]);

  const s = daily.summary || {};

  const allChartData = (daily.data || []).map(d => ({
    date: (d.date || '').slice(5),
    매출: Number(d.total_fare || 0),
    콜수: Number(d.partner_calls || 0),
    운행건수: Number(d.ride_count || 0),
  }));
  const chartData14 = allChartData.slice(-14);
  const chartData7 = allChartData.slice(-7);
  const hasChartData = allChartData.some(d => d.매출 > 0 || d.운행건수 > 0 || d.콜수 > 0);
  const has7DayCustomerData = chartData7.some(d => d.운행건수 > 0);
  const has7DayPartnerData = chartData7.some(d => d.콜수 > 0);

  // 매출 0인 고객/파트너는 의미 없는 row이므로 제거
  const visibleCustomers = topCustomers.filter(c => Number(c.total_fare || 0) > 0);
  const topPartners = (partners.data || []).filter(p => Number(p.calls || 0) > 0).slice(0, 6);
  const totalCalls = Number(partners.totalCalls || 0) || topPartners.reduce((s, p) => s + Number(p.calls || 0), 0);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터 로딩 중...</div>;

  const cardStyle = { background: 'white', borderRadius: 14, padding: isMobile ? 16 : 24, border: '1px solid #f1f5f9' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>조회 기간</div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: "'Noto Sans KR'" }} />
      </div>

      {/* KPI 카드: 모바일 2x2, 데스크톱 4열 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        <KpiCard label="총 매출" value={`${Number(s.total_fare || 0).toLocaleString()}원`} icon="💰" bg="#eff6ff" accent="#2563eb" />
        <KpiCard label="운행 건수" value={`${Number(s.ride_count || 0)}건`} icon="🚗" bg="#f0fdf4" accent="#16a34a" />
        <KpiCard label="제휴업체 콜" value={`${Number(s.partner_calls || 0)}건`} icon="📞" bg="#fffbeb" accent="#d97706" />
        <KpiCard label="마일리지 발생" value={`${Number(s.mileage_earned || 0).toLocaleString()}원`} icon="⭐" bg="#fdf2f8" accent="#db2777" />
      </div>

      {/* 1행: 일별 매출 (14일, 전체 너비) */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>일별 매출</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>최근 14일</div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
          {hasChartData ? (
            <BarChart data={chartData14}>
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} width={40} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${v.toLocaleString()}원`, '매출']} />
              <Bar dataKey="매출" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
          )}
        </ResponsiveContainer>
      </div>

      {/* 2행: 고객 TOP 6 + 일별 고객 콜 추이 (모바일: 세로 스택) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>고객 TOP 6</div>
          {visibleCustomers.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isMobile ? 180 : 220, color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
          ) : visibleCustomers.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < visibleCustomers.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? '#2563eb' : '#e2e8f0', color: i < 3 ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name || c.customer_code}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{Number(c.total_fare || 0).toLocaleString()}원</span>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>일별 고객 콜 추이</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>최근 7일</div>
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            {has7DayCustomerData ? (
              <LineChart data={chartData7}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${v}건`, '운행건수']} />
                <Line type="monotone" dataKey="운행건수" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 3 }} />
              </LineChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3행: 제휴업체 콜 TOP 6 + 일별 제휴 콜 추이 (모바일: 세로 스택) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>제휴업체 콜 TOP 6</div>
          {topPartners.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isMobile ? 180 : 220, color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
          ) : topPartners.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < topPartners.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? '#d97706' : '#e2e8f0', color: i < 3 ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{Number(p.calls)}건</span>
                {totalCalls > 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>({((Number(p.calls) / totalCalls) * 100).toFixed(0)}%)</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>일별 제휴 콜 추이</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>최근 7일</div>
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            {has7DayPartnerData ? (
              <LineChart data={chartData7}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${v}건`, '제휴콜']} />
                <Line type="monotone" dataKey="콜수" stroke="#d97706" strokeWidth={2.5} dot={{ fill: '#d97706', r: 3 }} />
              </LineChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
