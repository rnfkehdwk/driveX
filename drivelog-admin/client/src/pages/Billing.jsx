import { useState, useEffect } from 'react';
import { fetchBilling, generateBilling, payBilling } from '../api/client';

export default function Billing({ user }) {
  const [list, setList] = useState([]);
  const [genMonth, setGenMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => fetchBilling({}).then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const isMaster = user?.role === 'MASTER';

  const handleGenerate = async () => {
    if (!genMonth) { alert('청구 월을 선택하세요.'); return; }
    setLoading(true);
    try {
      const res = await generateBilling({ billing_period: genMonth });
      alert(res.message); load();
    } catch (err) { alert(err.response?.data?.error || '생성 실패'); }
    finally { setLoading(false); }
  };

  const handlePay = async (id) => {
    if (!confirm('결제 완료 처리하시겠습니까?')) return;
    try { await payBilling(id); load(); } catch { alert('처리 실패'); }
  };

  const statusStyle = (st) => ({
    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: st === 'PAID' ? '#f0fdf4' : st === 'INVOICED' ? '#fffbeb' : st === 'OVERDUE' ? '#fef2f2' : '#f8fafc',
    color: st === 'PAID' ? '#16a34a' : st === 'INVOICED' ? '#d97706' : st === 'OVERDUE' ? '#dc2626' : '#94a3b8',
  });
  const statusLabel = { DRAFT: '초안', INVOICED: '청구됨', PAID: '결제완료', OVERDUE: '연체' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{isMaster ? '앱 사용료 정산' : '결제 현황'}</span>
        {isMaster && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <button onClick={handleGenerate} disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? '생성 중...' : '청구 생성'}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[...(isMaster ? ['업체명', '업체코드'] : []), '청구월', '운행건수', '청구금액', '상태', '결제일', ...(isMaster ? ['관리'] : [])].map(h => (
                <th key={h} style={{ padding: '11px 12px', textAlign: ['청구금액', '운행건수'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(b => (
              <tr key={b.billing_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && <td style={{ padding: '11px 12px', fontWeight: 600 }}>{b.company_name}</td>}
                {isMaster && <td style={{ padding: '11px 12px', color: '#64748b' }}>{b.company_code}</td>}
                <td style={{ padding: '11px 12px' }}>{b.billing_period}</td>
                <td style={{ padding: '11px 12px', textAlign: 'right' }}>{b.total_rides}건</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700 }}>{Number(b.billing_amount).toLocaleString()}원</td>
                <td style={{ padding: '11px 12px' }}><span style={statusStyle(b.status)}>{statusLabel[b.status] || b.status}</span></td>
                <td style={{ padding: '11px 12px', fontSize: 12, color: '#94a3b8' }}>{b.paid_at ? b.paid_at.slice(0, 10) : '-'}</td>
                {isMaster && (
                  <td style={{ padding: '11px 12px' }}>
                    {b.status === 'INVOICED' && <button onClick={() => handlePay(b.billing_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>결제완료</button>}
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={isMaster ? 8 : 5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>청구 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
