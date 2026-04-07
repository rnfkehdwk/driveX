import { useState, useEffect } from 'react';
import { fetchDailySettlement } from '../api/client';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, delta) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => {
  // a, b는 yyyy-mm-dd 문자열. inclusive 일수.
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
};

export default function FareSettlement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [riderFilter, setRiderFilter] = useState('');

  const load = () => {
    setLoading(true);
    fetchDailySettlement({ start_date: startDate, end_date: endDate })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  // 화살표: 현재 기간 길이만큼 통째로 이동
  const movePeriod = (delta) => {
    const len = daysBetween(startDate, endDate); // inclusive
    const shift = delta * len;
    setStartDate(addDays(startDate, shift));
    setEndDate(addDays(endDate, shift));
  };

  const setToday = () => {
    const t = today();
    setStartDate(t);
    setEndDate(t);
  };

  const handleStartChange = (val) => {
    setStartDate(val);
    // 종료일이 시작일보다 뒤면 종료일도 시작일로 맞춤
    if (val > endDate) setEndDate(val);
  };
  const handleEndChange = (val) => {
    setEndDate(val);
    if (val < startDate) setStartDate(val);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터를 불러올 수 없습니다.</div>;

  const filteredRides = riderFilter ? data.rides.filter(r => String(r.rider_id) === riderFilter) : data.rides;
  const fmt = (n) => Number(n || 0).toLocaleString();
  const isRange = data.is_range;
  const periodLen = daysBetween(startDate, endDate);

  return (
    <div className="fade-in">
      {/* 기간 선택 바 */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => movePeriod(-1)} title={`${periodLen}일 이전`} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <input
            type="date"
            value={startDate}
            onChange={e => handleStartChange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }}
          />
          <span style={{ color: '#94a3b8', fontWeight: 600, padding: '0 4px' }}>~</span>
          <input
            type="date"
            value={endDate}
            onChange={e => handleEndChange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }}
          />
          <button onClick={() => movePeriod(1)} title={`${periodLen}일 이후`} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>›</button>
          <button onClick={setToday} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>오늘</button>
          {isRange && (
            <span style={{ padding: '4px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700 }}>
              {periodLen}일
            </span>
          )}
        </div>
        <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>🖨️ 인쇄</button>
      </div>

      {/* KPI: 총 매출 + 그룹별 합계 */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.groups.length + 1, 4)}, 1fr)`, gap: 12, marginBottom: 14 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>총 매출</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{fmt(data.total.fare)}원</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{data.total.count}건{isRange ? ` · ${periodLen}일` : ''}</div>
        </div>
        {data.groups.map(g => (
          <div key={g.group_id || 'unclassified'} style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', borderLeft: `4px solid ${g.color}` }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{g.name}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: g.color }}>{fmt(g.total)}원</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{g.count}건</div>
          </div>
        ))}
      </div>

      {/* 결제방법별 집계 */}
      {data.payments.length > 0 && (
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>결제방법별 집계</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.payments.length, 5)}, 1fr)`, gap: 8 }}>
            {data.payments.map(p => (
              <div key={p.code || 'unknown'} style={{ padding: 12, borderRadius: 8, background: (p.group_color || '#94a3b8') + '15', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: p.group_color || '#64748b', fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: p.group_color || '#1e293b', marginTop: 4 }}>{fmt(p.total)}</div>
                <div style={{ fontSize: 11, color: p.group_color || '#94a3b8', marginTop: 2 }}>{p.count}건</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 운행 내역 테이블 */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>운행 내역 ({filteredRides.length}건)</div>
          <select value={riderFilter} onChange={e => setRiderFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, background: 'white' }}>
            <option value="">기사 전체</option>
            {data.riders.map(r => (<option key={r.rider_id || 'unknown'} value={r.rider_id || ''}>{r.rider_name} ({r.count}건)</option>))}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: isRange ? 900 : 800 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {(isRange ? ['날짜', '시간', '기사', '고객', '출발 → 도착', '요금', '결제방법', '정산 그룹'] : ['시간', '기사', '고객', '출발 → 도착', '요금', '결제방법', '정산 그룹']).map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRides.map(r => (
                <tr key={r.ride_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  {isRange && <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>{r.ride_date}</td>}
                  <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{r.ride_time}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.rider_name || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{r.customer_name || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(r.start_address || '-')} → {(r.end_address || '-')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(r.total_fare)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>{r.payment_label || '-'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.group_name ? (
                      <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: (r.group_color || '#94a3b8') + '20', color: r.group_color || '#94a3b8' }}>{r.group_name}</span>
                    ) : (
                      <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#94a3b8' }}>미분류</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRides.length === 0 && <tr><td colSpan={isRange ? 8 : 7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>운행 내역이 없습니다.</td></tr>}
            </tbody>
            {filteredRides.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={isRange ? 5 : 4} style={{ padding: '10px 12px', fontSize: 13 }}>합계</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 14, color: '#1e293b' }}>{fmt(filteredRides.reduce((s, r) => s + Number(r.total_fare || 0), 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 기사별 정산 요약 */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>기사별 정산 요약</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>기사명</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>운행</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>총 매출</th>
                {data.groups.map(g => (
                  <th key={g.group_id || 'u'} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: g.color, fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{g.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.riders.map(r => (
                <tr key={r.rider_id || 'unknown'} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.rider_name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{r.count}건</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(r.total)}</td>
                  {data.groups.map(g => {
                    const key = g.group_id || 'unclassified';
                    return (
                      <td key={key} style={{ padding: '10px 12px', textAlign: 'right', color: g.color, fontWeight: 600 }}>
                        {fmt(r.groups[key] || 0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.riders.length === 0 && <tr><td colSpan={3 + data.groups.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>운행 데이터가 없습니다.</td></tr>}
            </tbody>
            {data.riders.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ padding: '10px 12px' }}>합계</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{data.total.count}건</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(data.total.fare)}</td>
                  {data.groups.map(g => (
                    <td key={g.group_id || 'u'} style={{ padding: '10px 12px', textAlign: 'right', color: g.color }}>{fmt(g.total)}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
