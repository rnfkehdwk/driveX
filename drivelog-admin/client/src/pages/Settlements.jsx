import { useState, useEffect } from 'react';
import { fetchSettlements, generateSettlements, approveSettlement, paySettlement } from '../api/client';

function useSortable() {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const toggle = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const icon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const sort = (arr) => {
    if (!sortKey) return arr;
    return [...arr].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (va == null) va = ''; if (vb == null) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko');
    });
  };
  return { toggle, icon, sort };
}

export default function Settlements() {
  const [data, setData] = useState({ data: [], summary: {} });
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ period_start: '', period_end: '' });
  const [loading, setLoading] = useState(false);
  const { toggle, icon, sort } = useSortable();

  const load = () => fetchSettlements({ month }).then(setData).catch(() => {});
  useEffect(() => { load(); }, [month]);

  const handleGenerate = async () => {
    if (!genForm.period_start || !genForm.period_end) { alert('기간을 선택하세요.'); return; }
    setLoading(true);
    try { const res = await generateSettlements(genForm); alert(res.message); setGenModal(false); load(); }
    catch (err) { alert(err.response?.data?.error || '생성 실패'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => { if (!confirm('승인하시겠습니까?')) return; try { await approveSettlement(id); load(); } catch { alert('실패'); } };
  const handlePay = async (id) => { if (!confirm('지급 완료 처리?')) return; try { await paySettlement(id); load(); } catch { alert('실패'); } };

  const s = data.summary || {};
  const statusStyle = (st) => ({
    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: st === 'PAID' ? '#f0fdf4' : st === 'APPROVED' ? '#eff6ff' : st === 'PENDING' ? '#fffbeb' : '#f8fafc',
    color: st === 'PAID' ? '#16a34a' : st === 'APPROVED' ? '#2563eb' : st === 'PENDING' ? '#d97706' : '#94a3b8',
  });
  const statusLabel = { DRAFT: '초안', PENDING: '대기', APPROVED: '승인', PAID: '지급완료', DISPUTED: '분쟁' };

  const headers = [
    { key: 'rider_name', label: '기사' },
    { key: 'period_start', label: '기간' },
    { key: null, label: '운행건수' },
    { key: null, label: '총 운임' },
    { key: null, label: '수수료' },
    { key: null, label: '지급액' },
    { key: null, label: '상태' },
    { key: null, label: '승인일' },
    { key: null, label: '관리' },
  ];
  const sorted = sort(data.data || []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {s.count || 0}건</span>
        </div>
        <button onClick={() => { setGenForm({ period_start: `${month}-01`, period_end: `${month}-31` }); setGenModal(true); }}
          style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + 정산 생성
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: '총 운임', value: `${(s.total_fare || 0).toLocaleString()}원`, color: '#2563eb' },
          { label: '수수료 합계', value: `${(s.total_commission || 0).toLocaleString()}원`, color: '#d97706' },
          { label: '기사 지급액', value: `${(s.rider_payout || 0).toLocaleString()}원`, color: '#16a34a' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h, i) => (
                <th key={i} onClick={() => h.key && toggle(h.key)} style={{
                  padding: '11px 10px', textAlign: ['총 운임','수수료','지급액','운행건수'].includes(h.label) ? 'right' : 'left',
                  fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0',
                  cursor: h.key ? 'pointer' : 'default', userSelect: 'none',
                }}>{h.label}{h.key ? icon(h.key) : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.settlement_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '11px 10px', fontWeight: 600 }}>{s.rider_name}</td>
                <td style={{ padding: '11px 10px', fontSize: 12 }}>{s.period_start} ~ {s.period_end}</td>
                <td style={{ padding: '11px 10px', textAlign: 'right' }}>{s.total_rides}</td>
                <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(s.total_fare).toLocaleString()}</td>
                <td style={{ padding: '11px 10px', textAlign: 'right', color: '#d97706' }}>{Number(s.total_commission).toLocaleString()}</td>
                <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{Number(s.rider_payout).toLocaleString()}</td>
                <td style={{ padding: '11px 10px' }}><span style={statusStyle(s.status)}>{statusLabel[s.status] || s.status}</span></td>
                <td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{s.approved_at ? s.approved_at.slice(0, 10) : '-'}</td>
                <td style={{ padding: '11px 10px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.status === 'PENDING' && <button onClick={() => handleApprove(s.settlement_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>}
                    {s.status === 'APPROVED' && <button onClick={() => handlePay(s.settlement_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>지급</button>}
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>정산 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {genModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setGenModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>정산 자동 생성</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시작일</label>
              <input type="date" value={genForm.period_start} onChange={e => setGenForm(f => ({ ...f, period_start: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>종료일</label>
              <input type="date" value={genForm.period_end} onChange={e => setGenForm(f => ({ ...f, period_end: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setGenModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleGenerate} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? '생성 중...' : '정산 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
