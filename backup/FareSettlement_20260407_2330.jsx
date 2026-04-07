import { useState, useEffect } from 'react';
import { fetchDailySettlement } from '../api/client';

export default function FareSettlement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [riderFilter, setRiderFilter] = useState('');

  const load = () => {
    setLoading(true);
    fetchDailySettlement({ date }).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const moveDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터를 불러올 수 없습니다.</div>;

  const filteredRides = riderFilter ? data.rides.filter(r => String(r.rider_id) === riderFilter) : data.rides;
  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="fade-in">
      {/* 날짜 선택 바 */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => moveDate(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }} />
          <button onClick={() => moveDate(1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>›</button>
          <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>오늘</button>
        </div>
        <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>🖨️ 인쇄</button>
      </div>
      {/* ... 이하 단일 날짜 버전 본체 (운임정산 페이지 백업, 2026-04-07 기간선택 추가 직전) ... */}
    </div>
  );
}
