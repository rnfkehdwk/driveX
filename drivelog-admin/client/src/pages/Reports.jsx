import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMonthlyReport } from '../api/client';

export default function Reports() {
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetchMonthlyReport({ month }).then(setReport).catch(() => setReport(null)).finally(() => setLoading(false));
  }, [month]);

  const handlePrint = () => {
    const content = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>월간리포트_${month}</title><style>
      body { font-family: 'Noto Sans KR', sans-serif; padding: 20px; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th, td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 13px; }
      th { background: #f8fafc; font-weight: 600; color: #64748b; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin: 20px 0 8px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
      .kpi { display: flex; gap: 16px; margin: 12px 0; }
      .kpi-item { flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
      .kpi-label { font-size: 12px; color: #94a3b8; }
      .kpi-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
      @media print { body { padding: 0; } }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>리포트 로딩 중...</div>;

  const s = report?.sales || {};
  const chartData = (report?.dailyTrend || []).map(d => ({ date: (d.date || '').slice(5), 매출: Number(d.fare || 0) }));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>📈 월간 운행 리포트</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <button onClick={handlePrint} disabled={!report} style={{ padding: '6px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>인쇄 / PDF</button>
        </div>
      </div>

      {!report ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>해당 월 데이터가 없습니다.</div>
      ) : (
        <div ref={printRef}>
          {/* 리포트 헤더 */}
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <h1 style={{ margin: 0 }}>{report.company?.company_name || ''} 월간 운행 리포트</h1>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{month} | {report.company?.company_code} | 요금제: {report.company?.plan_name || '-'}</div>
          </div>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { label: '총 매출', value: `${Number(s.total_fare || 0).toLocaleString()}원`, color: '#2563eb' },
              { label: '총 운행', value: `${Number(s.total_rides || 0)}건`, color: '#16a34a' },
              { label: '평균 요금', value: `${Math.round(Number(s.avg_fare || 0)).toLocaleString()}원`, color: '#d97706' },
              { label: '제휴 콜', value: `${Number(s.partner_calls || 0)}건`, color: '#7c3aed' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginTop: 4 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* 일별 매출 차트 */}
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>일별 매출 추이</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} width={40} />
                <Tooltip formatter={v => [`${v.toLocaleString()}원`, '매출']} />
                <Bar dataKey="매출" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 기사별 실적 + 고객 TOP 10 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>기사별 실적</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'left', fontWeight: 600, color: '#64748b' }}>기사명</th><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>건수</th><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출</th></tr></thead>
                <tbody>
                  {(report.riders || []).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{r.rider_name}</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right' }}>{r.rides}건</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(r.fare).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>고객 TOP 10</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'left', fontWeight: 600, color: '#64748b' }}>고객</th><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>건수</th><th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출</th></tr></thead>
                <tbody>
                  {(report.topCustomers || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{c.name} <span style={{ color: '#94a3b8', fontSize: 11 }}>({c.customer_code})</span></td>
                      <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right' }}>{c.rides}건</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{Number(c.fare).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 제휴업체 TOP 10 */}
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>제휴업체 콜 TOP 10</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(report.topPartners || []).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span style={{ fontWeight: 700, color: '#d97706', fontSize: 13 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>{Number(p.calls)}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
