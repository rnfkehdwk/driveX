import { useState, useEffect } from 'react';
import { fetchBilling, generateBilling, payBilling, fetchBillingPlans, updateBillingMemo } from '../api/client';

export default function Billing({ user }) {
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [genMonth, setGenMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('billing'); // billing | plans

  const load = () => {
    fetchBilling({}).then(r => setList(r.data || [])).catch(() => {});
    fetchBillingPlans({}).then(r => setPlans(r.data || [])).catch(() => {});
  };
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

  // 합계
  const totalAmount = list.reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const paidAmount = list.filter(b => b.status === 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const unpaidAmount = list.filter(b => b.status !== 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);

  return (
    <div className="fade-in">
      {/* 탭 */}
      {isMaster && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab('billing')} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: tab === 'billing' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: tab === 'billing' ? '#eff6ff' : 'white', color: tab === 'billing' ? '#2563eb' : '#64748b' }}>청구 내역</button>
          <button onClick={() => setTab('plans')} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: tab === 'plans' ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: tab === 'plans' ? '#faf5ff' : 'white', color: tab === 'plans' ? '#7c3aed' : '#64748b' }}>요금제 관리</button>
        </div>
      )}

      {tab === 'plans' && isMaster ? (
        /* 요금제 관리 */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map(p => (
              <div key={p.plan_id} style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${p.is_active ? '#e2e8f0' : '#fecaca'}`, opacity: p.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{p.plan_name}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.is_active ? '#f0fdf4' : '#fef2f2', color: p.is_active ? '#16a34a' : '#dc2626' }}>{p.is_active ? '활성' : '비활성'}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginBottom: 8 }}>{Number(p.base_fee).toLocaleString()}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>원/월</span></div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 2 }}>
                  <div>기사당 단가: <strong>{Number(p.per_rider_fee).toLocaleString()}원</strong></div>
                  <div>무료 기사: <strong>{p.free_riders}명</strong> 포함</div>
                  <div>최대 기사: <strong>{p.max_riders === 0 ? '무제한' : `${p.max_riders}명`}</strong></div>
                </div>
                {p.description && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#f8fafc', fontSize: 12, color: '#94a3b8' }}>{p.description}</div>}
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
                  예) 기사 5명 → {Number(p.base_fee + Math.max(0, 5 - p.free_riders) * p.per_rider_fee).toLocaleString()}원/월
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 청구 내역 */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            {isMaster && (
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <span>총 <strong style={{ color: '#1e293b' }}>{totalAmount.toLocaleString()}원</strong></span>
                <span>결제 <strong style={{ color: '#16a34a' }}>{paidAmount.toLocaleString()}원</strong></span>
                <span>미결제 <strong style={{ color: '#d97706' }}>{unpaidAmount.toLocaleString()}원</strong></span>
              </div>
            )}
            {isMaster && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <button onClick={handleGenerate} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{loading ? '생성 중...' : '청구 생성'}</button>
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {[...(isMaster ? ['업체명'] : []), '청구월', '요금제', '기사수', '기본료', '기사과금', '합계', '운행건수', '상태', '결제일', ...(isMaster ? ['관리'] : [])].map(h => (
                    <th key={h} style={{ padding: '11px 10px', textAlign: ['기본료', '기사과금', '합계', '운행건수', '기사수'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.billing_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    {isMaster && <td style={{ padding: '11px 10px', fontWeight: 600 }}>{b.company_name}</td>}
                    <td style={{ padding: '11px 10px' }}>{b.billing_period}</td>
                    <td style={{ padding: '11px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#7c3aed' }}>{b.plan_name || '-'}</span></td>
                    <td style={{ padding: '11px 10px', textAlign: 'right' }}>{b.active_riders || 0}명</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.base_fee || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.rider_fee || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(b.billing_amount).toLocaleString()}원</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', color: '#94a3b8' }}>{b.total_rides}건</td>
                    <td style={{ padding: '11px 10px' }}><span style={statusStyle(b.status)}>{statusLabel[b.status] || b.status}</span></td>
                    <td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{b.paid_at ? b.paid_at.slice(0, 10) : '-'}</td>
                    {isMaster && (
                      <td style={{ padding: '11px 10px' }}>
                        {b.status === 'INVOICED' && <button onClick={() => handlePay(b.billing_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>결제완료</button>}
                      </td>
                    )}
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={isMaster ? 11 : 9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>청구 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
