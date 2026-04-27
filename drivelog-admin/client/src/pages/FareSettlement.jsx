import { useState, useEffect } from 'react';
import { fetchDailySettlement, fetchMonthlyPayout } from '../api/client';
import { exportToExcel, FARE_SETTLEMENT_COLUMNS } from '../utils/excel';
import useTenantConfig from '../hooks/useTenantConfig';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
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

// 운임정산서 공유 텍스트 생성 (카카오톡, 문자 등)
// fallbackName: companyName이 없을 때 표시할 기본 (업체 config의 brand.shortName)
function buildShareText(data, startDate, endDate, companyName, fmt, fallbackName) {
  const isRange = startDate !== endDate;
  const periodLabel = isRange ? `${startDate} ~ ${endDate}` : startDate;
  const lines = [];
  lines.push(`📊 [${companyName || fallbackName}] 운임정산서`);
  lines.push(`📅 ${periodLabel}`);
  lines.push('');
  lines.push(`💰 총 매출: ${fmt(data.total.fare)}원 (${data.total.count}건)`);
  for (const g of data.groups) {
    lines.push(`  · ${g.name}: ${fmt(g.total)}원 (${g.count}건)`);
  }
  if (data.riders.length > 0) {
    lines.push('');
    lines.push('🚗 기사별');
    for (const r of data.riders) {
      lines.push(`  · ${r.rider_name}: ${r.count}건 / ${fmt(r.total)}원`);
    }
  }
  lines.push('');
  lines.push('— DriveLog');
  return lines.join('\n');
}

async function shareSettlement(text) {
  // Web Share API 사용 가능하면 OS 공유 시트 열기 (모바일에서 카카톡 선택 가능)
  if (navigator.share) {
    try {
      await navigator.share({ title: '운임정산서', text });
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') console.error('share error:', e);
      return false;
    }
  }
  // Web Share API 없는 경우 클립보드로 복사
  try {
    await navigator.clipboard.writeText(text);
    alert('정산서가 클립보드에 복사되었습니다. 카카톡이나 원하는 곳에 붙여넣으세요.');
    return true;
  } catch {
    alert('공유 기능을 사용할 수 없습니다.');
    return false;
  }
}

// ============================================================
// 일별 정산 탭 — 기존 운임정산 컴포넌트 (시작일~종료일 범위)
// ============================================================
function DailyTab() {
  const tenantConfig = useTenantConfig();
  const fallbackBrand = tenantConfig.brand.shortName;
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

  const movePeriod = (delta) => {
    const len = daysBetween(startDate, endDate);
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
    <div className="print-area">
      {/* 인쇄 전용 헤더 — 화면에는 안 보임 */}
      <div className="print-only" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            {(() => { try { return JSON.parse(localStorage.getItem('user') || '{}').company_name || fallbackBrand; } catch { return fallbackBrand; } })()} 운임정산서
          </h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>인쇄: {new Date().toLocaleString('ko-KR')}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
          정산기간: {isRange ? `${startDate} ~ ${endDate} (${periodLen}일)` : startDate}
          {(() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.name ? ` · 작성자: ${u.name}` : ''; } catch { return ''; } })()}
        </div>
      </div>

      {/* 기간 선택 바 */}
      <div className="no-print" style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => movePeriod(-1)} title={`${periodLen}일 이전`} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <input type="date" value={startDate} onChange={e => handleStartChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }} />
          <span style={{ color: '#94a3b8', fontWeight: 600, padding: '0 4px' }}>~</span>
          <input type="date" value={endDate} onChange={e => handleEndChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }} />
          <button onClick={() => movePeriod(1)} title={`${periodLen}일 이후`} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>›</button>
          <button onClick={setToday} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>오늘</button>
          {isRange && (
            <span style={{ padding: '4px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700 }}>
              {periodLen}일
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              let companyName = fallbackBrand;
              try { companyName = JSON.parse(localStorage.getItem('user') || '{}').company_name || companyName; } catch {}
              const text = buildShareText(data, startDate, endDate, companyName, fmt, fallbackBrand);
              shareSettlement(text);
            }}
            disabled={data.rides.length === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: data.rides.length > 0 ? '#fbbf24' : '#cbd5e1', color: 'white', fontSize: 12, fontWeight: 600, cursor: data.rides.length > 0 ? 'pointer' : 'default' }}
            title="카카톡 등으로 정산서 요약 공유"
          >💬 공유</button>
          <button
            onClick={() => {
              const periodLabel = isRange ? `${startDate}~${endDate}` : startDate;
              exportToExcel(filteredRides, FARE_SETTLEMENT_COLUMNS, `운임정산_${periodLabel}`);
            }}
            disabled={filteredRides.length === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: filteredRides.length > 0 ? '#16a34a' : '#cbd5e1', color: 'white', fontSize: 12, fontWeight: 600, cursor: filteredRides.length > 0 ? 'pointer' : 'default' }}
          >⬇️ Excel</button>
          <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>🖨️ 정산서 인쇄</button>
        </div>
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

// ============================================================
// 월별 정산 탭 — 기사별 월말 정산 내역서 (자동 계산)
// ============================================================
function MonthlyTab() {
  const tenantConfig = useTenantConfig();
  const fallbackBrand = tenantConfig.brand.shortName;
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchMonthlyPayout({ month })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month]);

  const fmt = (n) => Number(n || 0).toLocaleString();

  const moveMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // 카카오톡 공유 텍스트
  const buildMonthlyShareText = () => {
    if (!data) return '';
    const lines = [];
    let companyName = fallbackBrand;
    try { companyName = JSON.parse(localStorage.getItem('user') || '{}').company_name || companyName; } catch {}
    lines.push(`📊 [${companyName}] ${month} 월별 정산`);
    lines.push('');
    lines.push(`💰 총 매출: ${fmt(data.total.total_fare)}원 (${data.total.ride_count}건)`);
    lines.push(`  · 기사 보유: ${fmt(data.total.rider_holds)}원`);
    lines.push(`  · 회사 보유: ${fmt(data.total.company_holds)}원`);
    lines.push('');
    lines.push('🚗 기사별');
    for (const r of data.riders) {
      const arrow = r.rider_owes_company > 0 ? `📥 기사→회사 ${fmt(r.rider_owes_company)}원`
        : r.company_owes_rider > 0 ? `📤 회사→기사 ${fmt(r.company_owes_rider)}원`
        : '✅ 정산 완료';
      lines.push(`  · ${r.rider_name}: ${r.ride_count}건 / ${fmt(r.total_fare)}원 / ${arrow}`);
    }
    lines.push('');
    lines.push('— DriveLog');
    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = buildMonthlyShareText();
    if (navigator.share) {
      try { await navigator.share({ title: '월별 정산', text }); } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('월별 정산이 클립보드에 복사되었습니다. 카카톡이나 원하는 곳에 붙여넣으세요.');
      } catch { alert('공유 기능을 사용할 수 없습니다.'); }
    }
  };

  // Excel 다운로드용 컬럼
  const monthlyExcelColumns = [
    { key: 'rider_name', label: '기사명' },
    { key: 'pay_type', label: '정산방식', accessor: (r) => r.pay_type === 'COMMISSION' ? `수수료 ${r.commission_pct}%` : r.pay_type === 'HOURLY' ? `시급 ${fmt(r.hourly_rate)}원/h` : r.pay_type === 'PER_RIDE' ? `건당 ${fmt(r.per_ride_rate)}원` : r.pay_type },
    { key: 'ride_count', label: '운행건수' },
    { key: 'work_hours', label: '근무시간', accessor: (r) => r.work_hours || 0 },
    { key: 'total_fare', label: '총매출' },
    { key: 'rider_holds', label: '기사보유' },
    { key: 'company_holds', label: '회사보유' },
    { key: 'rider_share', label: '기사몫' },
    { key: 'company_share', label: '회사몫' },
    { key: 'rider_owes_company', label: '기사→회사 입금' },
    { key: 'company_owes_rider', label: '회사→기사 지급' },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터를 불러올 수 없습니다.</div>;

  const hasData = data.riders.length > 0;

  return (
    <div className="print-area">
      {/* 인쇄 전용 헤더 */}
      <div className="print-only" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            {(() => { try { return JSON.parse(localStorage.getItem('user') || '{}').company_name || fallbackBrand; } catch { return fallbackBrand; } })()} {month} 월별 정산서
          </h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>인쇄: {new Date().toLocaleString('ko-KR')}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
          정산월: {month}
          {(() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.name ? ` · 작성자: ${u.name}` : ''; } catch { return ''; } })()}
        </div>
      </div>

      {/* 월 선택 바 */}
      <div className="no-print" style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => moveMonth(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }} />
          <button onClick={() => moveMonth(1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, cursor: 'pointer' }}>›</button>
          <button onClick={() => setMonth(currentMonth())} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>이번달</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleShare} disabled={!hasData} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: hasData ? '#fbbf24' : '#cbd5e1', color: 'white', fontSize: 12, fontWeight: 600, cursor: hasData ? 'pointer' : 'default' }}>💬 공유</button>
          <button onClick={() => exportToExcel(data.riders, monthlyExcelColumns, `월별정산_${month}`)} disabled={!hasData} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: hasData ? '#16a34a' : '#cbd5e1', color: 'white', fontSize: 12, fontWeight: 600, cursor: hasData ? 'pointer' : 'default' }}>⬇️ Excel</button>
          <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>🖨️ 정산서 인쇄</button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>총 매출</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{fmt(data.total.total_fare)}원</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{data.total.ride_count}건</div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>기사 보유</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{fmt(data.total.rider_holds)}원</div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', borderLeft: '4px solid #0f6e56' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>회사 보유</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f6e56' }}>{fmt(data.total.company_holds)}원</div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>회사 수수료</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{fmt(data.total.company_share)}원</div>
        </div>
      </div>

      {/* 기본 정산 방식 안내 */}
      <div className="no-print" style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
        📝 업체 기본 정산방식: <strong>{data.company_pay_type === 'COMMISSION' ? `수수료 방식 (${data.default_commission_pct}%)` : data.company_pay_type === 'HOURLY' ? `시급제 (${fmt(data.default_hourly_rate)}원/h)` : data.company_pay_type === 'PER_RIDE' ? `건당 (${fmt(data.default_per_ride_rate)}원)` : data.company_pay_type}</strong>
        {' · '}기사별 개별 설정이 있으면 그가 우선적으로 적용됩니다.
      </div>

      {/* 기사별 정산 테이블 */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>기사별 정산 ({data.riders.length}명)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['기사명', '정산방식', '운행', '총매출', '기사보유', '회사보유', '기사몫', '회사몫', '정산'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: ['기사명', '정산방식'].includes(h) ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: 11, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.riders.map(r => {
                const payTypeLabel = r.pay_type === 'COMMISSION' ? `수수료 ${r.commission_pct}%`
                  : r.pay_type === 'HOURLY' ? `시급 ${fmt(r.hourly_rate)}/h × ${r.work_hours}h`
                  : r.pay_type === 'PER_RIDE' ? `건당 ${fmt(r.per_ride_rate)}` : r.pay_type;
                const payTypeColor = r.pay_type === 'COMMISSION' ? '#2563eb' : r.pay_type === 'HOURLY' ? '#7c3aed' : '#0f6e56';
                return (
                  <tr key={r.rider_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {r.rider_name}{r.is_super_admin && <span style={{ marginLeft: 4, color: '#fbbf24' }}>☆</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: payTypeColor + '15', color: payTypeColor, whiteSpace: 'nowrap' }}>{payTypeLabel}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{r.ride_count}건</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(r.total_fare)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>{fmt(r.rider_holds)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f6e56' }}>{fmt(r.company_holds)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{fmt(r.rider_share)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmt(r.company_share)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.rider_owes_company > 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>
                          기사→회사 {fmt(r.rider_owes_company)}
                        </span>
                      )}
                      {r.company_owes_rider > 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>
                          회사→기사 {fmt(r.company_owes_rider)}
                        </span>
                      )}
                      {r.rider_owes_company === 0 && r.company_owes_rider === 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#16a34a' }}>✅ 정산완료</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.riders.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{month}월 운행 데이터가 없습니다.</td></tr>
              )}
            </tbody>
            {data.riders.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ padding: '12px' }} colSpan={2}>합계</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{data.total.ride_count}건</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{fmt(data.total.total_fare)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#d97706' }}>{fmt(data.total.rider_holds)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#0f6e56' }}>{fmt(data.total.company_holds)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{fmt(data.total.rider_share)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb' }}>{fmt(data.total.company_share)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 메인 — 일별/월별 탭 컨트롤러
// ============================================================
export default function FareSettlement() {
  // URL 쿼리에서 탭 상태 복원 (?tab=monthly)
  const [tab, setTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') === 'monthly' ? 'monthly' : 'daily';
    } catch { return 'daily'; }
  });

  // 탭 변경 시 URL 쿼리 업데이트 (새로고침 시 유지)
  const handleTabChange = (newTab) => {
    setTab(newTab);
    try {
      const url = new URL(window.location.href);
      if (newTab === 'monthly') url.searchParams.set('tab', 'monthly');
      else url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  return (
    <div className="fade-in">
      {/* 탭 헤더 — 인쇄 시 숨김 */}
      <div className="no-print" style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => handleTabChange('daily')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: tab === 'daily' ? 800 : 600,
            color: tab === 'daily' ? '#2563eb' : '#94a3b8',
            cursor: 'pointer',
            borderBottom: tab === 'daily' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: -2,
          }}
        >📅 일별 정산</button>
        <button
          onClick={() => handleTabChange('monthly')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: tab === 'monthly' ? 800 : 600,
            color: tab === 'monthly' ? '#2563eb' : '#94a3b8',
            cursor: 'pointer',
            borderBottom: tab === 'monthly' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: -2,
          }}
        >📊 월별 정산</button>
      </div>

      {tab === 'daily' && <DailyTab />}
      {tab === 'monthly' && <MonthlyTab />}
    </div>
  );
}
