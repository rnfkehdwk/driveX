import { useState, useEffect } from 'react';
import { fetchBilling, generateBilling, payBilling, fetchBillingPlans, createBillingPlan, changePlanPrice, fetchPlanPriceHistory, fetchSeasonalRates, createSeasonalRate, deleteSeasonalRate, fetchAllPlanHistory } from '../api/client';

export default function Billing({ user }) {
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [genMonth, setGenMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('billing');
  const [priceModal, setPriceModal] = useState(null);
  const [priceForm, setPriceForm] = useState({ base_fee: '', per_rider_fee: '', free_riders: '', max_riders: '', effective_from: '' });
  const [priceHistory, setPriceHistory] = useState([]);
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ plan_name: '', base_fee: '', per_rider_fee: '', free_riders: '', max_riders: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [seasonPlan, setSeasonPlan] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [seasonModal, setSeasonModal] = useState(false);
  const [seasonForm, setSeasonForm] = useState({ season_name: '', start_date: '', end_date: '', base_fee: '', per_rider_fee: '' });
  const [allHistory, setAllHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL'); // ALL | PRICE_CHANGE | SEASONAL

  const load = () => {
    fetchBilling({}).then(r => setList(r.data || [])).catch(() => {});
    fetchBillingPlans({}).then(r => setPlans(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const isMaster = user?.role === 'MASTER';

  // 이력 탭 선택 시 로드
  useEffect(() => {
    if (tab === 'history' && isMaster) {
      fetchAllPlanHistory().then(r => setAllHistory(r.data || [])).catch(() => setAllHistory([]));
    }
  }, [tab]);

  const handleGenerate = async () => {
    if (!genMonth) { alert('청구 월을 선택하세요.'); return; }
    setLoading(true);
    try { const res = await generateBilling({ billing_period: genMonth }); alert(res.message); load(); }
    catch (err) { alert(err.response?.data?.error || '생성 실패'); } finally { setLoading(false); }
  };
  const handlePay = async (id) => { if (!confirm('결제 완료 처리하시겠습니까?')) return; try { await payBilling(id); load(); } catch { alert('처리 실패'); } };

  const openPriceChange = (plan) => {
    setPriceModal(plan);
    setPriceForm({ base_fee: String(plan.base_fee), per_rider_fee: String(plan.per_rider_fee), free_riders: String(plan.free_riders), max_riders: String(plan.max_riders), effective_from: '' });
    fetchPlanPriceHistory(plan.plan_id).then(r => setPriceHistory(r.data || [])).catch(() => setPriceHistory([]));
  };
  const handlePriceChange = async () => {
    if (!priceForm.effective_from) { alert('시행일을 선택해주세요.'); return; }
    setSaving(true);
    try { const res = await changePlanPrice(priceModal.plan_id, { base_fee: parseInt(priceForm.base_fee) || 0, per_rider_fee: parseInt(priceForm.per_rider_fee) || 0, free_riders: parseInt(priceForm.free_riders) || 0, max_riders: parseInt(priceForm.max_riders) || 0, effective_from: priceForm.effective_from }); alert(res.message); setPriceModal(null); load(); }
    catch (err) { alert(err.response?.data?.error || '변경 실패'); } finally { setSaving(false); }
  };
  const handleNewPlan = async () => {
    if (!newPlan.plan_name) { alert('요금제명은 필수입니다.'); return; }
    setSaving(true);
    try { await createBillingPlan({ ...newPlan, base_fee: parseInt(newPlan.base_fee) || 0, per_rider_fee: parseInt(newPlan.per_rider_fee) || 0, free_riders: parseInt(newPlan.free_riders) || 0, max_riders: parseInt(newPlan.max_riders) || 0 }); alert('요금제가 등록되었습니다.'); setNewPlanModal(false); setNewPlan({ plan_name: '', base_fee: '', per_rider_fee: '', free_riders: '', max_riders: '', description: '' }); load(); }
    catch (err) { alert(err.response?.data?.error || '등록 실패'); } finally { setSaving(false); }
  };

  const loadSeasons = (planId) => { fetchSeasonalRates(planId).then(r => setSeasons(r.data || [])).catch(() => setSeasons([])); };
  const selectSeasonPlan = (p) => { setSeasonPlan(p); loadSeasons(p.plan_id); };
  const handleAddSeason = async () => {
    if (!seasonForm.season_name || !seasonForm.start_date || !seasonForm.end_date) { alert('시즌명, 시작일, 종료일은 필수입니다.'); return; }
    setSaving(true);
    try { const res = await createSeasonalRate(seasonPlan.plan_id, { ...seasonForm, base_fee: parseInt(seasonForm.base_fee) || 0, per_rider_fee: parseInt(seasonForm.per_rider_fee) || 0 }); alert(res.message); setSeasonModal(false); setSeasonForm({ season_name: '', start_date: '', end_date: '', base_fee: '', per_rider_fee: '' }); loadSeasons(seasonPlan.plan_id); }
    catch (err) { alert(err.response?.data?.error || '등록 실패'); } finally { setSaving(false); }
  };
  const handleDeleteSeason = async (id) => { if (!confirm('삭제하시겠습니까?')) return; try { await deleteSeasonalRate(id); loadSeasons(seasonPlan.plan_id); } catch { alert('삭제 실패'); } };

  const statusStyle = (st) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: st === 'PAID' ? '#f0fdf4' : st === 'INVOICED' ? '#fffbeb' : st === 'OVERDUE' ? '#fef2f2' : '#f8fafc', color: st === 'PAID' ? '#16a34a' : st === 'INVOICED' ? '#d97706' : st === 'OVERDUE' ? '#dc2626' : '#94a3b8' });
  const statusLabel = { DRAFT: '초안', INVOICED: '청구됨', PAID: '결제완료', OVERDUE: '연체' };
  const totalAmount = list.reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const paidAmount = list.filter(b => b.status === 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const unpaidAmount = list.filter(b => b.status !== 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const filteredHistory = historyFilter === 'ALL' ? allHistory : allHistory.filter(h => h.type === historyFilter);

  const tabConfig = [
    { key: 'billing', label: '청구 내역', color: '#2563eb' },
    { key: 'plans', label: '요금제 관리', color: '#7c3aed' },
    { key: 'seasonal', label: '시즌별 특별가', color: '#d97706' },
    { key: 'history', label: '요금 변경 이력', color: '#0891b2' },
  ];

  return (
    <div className="fade-in">
      {isMaster && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabConfig.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: tab === t.key ? `2px solid ${t.color}` : '1px solid #e2e8f0', background: tab === t.key ? `${t.color}11` : 'white', color: tab === t.key ? t.color : '#64748b' }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ─── 요금 변경 이력 탭 ─── */}
      {tab === 'history' && isMaster && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[{ key: 'ALL', label: '전체' }, { key: 'PRICE_CHANGE', label: '요금 변경' }, { key: 'SEASONAL', label: '특별가' }].map(f => (
              <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: historyFilter === f.key ? '2px solid #0891b2' : '1px solid #e2e8f0', background: historyFilter === f.key ? '#ecfeff' : 'white', color: historyFilter === f.key ? '#0891b2' : '#64748b' }}>{f.label}</button>
            ))}
            <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', marginLeft: 8 }}>{filteredHistory.length}건</span>
          </div>

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['구분', '요금제', '적용 기간', '기본료', '기사당 단가', '무료기사', '비고', '변경자', '등록일'].map(h => (
                    <th key={h} style={{ padding: '11px 10px', textAlign: ['기본료', '기사당 단가', '무료기사'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h, i) => {
                  const isPriceChange = h.type === 'PRICE_CHANGE';
                  const now = new Date().toISOString().slice(0, 10);
                  const isActive = isPriceChange
                    ? (h.start_date <= now && (!h.end_date || h.end_date >= now))
                    : (h.is_active && h.start_date <= now && h.end_date >= now);
                  const isFuture = h.start_date > now;
                  return (
                    <tr key={`${h.type}-${h.id}`} style={{ borderBottom: '1px solid #f1f5f9', background: isActive ? '#f0fdfa' : isFuture ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '11px 10px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: isPriceChange ? '#faf5ff' : '#fffbeb', color: isPriceChange ? '#7c3aed' : '#d97706' }}>
                          {isPriceChange ? '요금변경' : '특별가'}
                        </span>
                        {isActive && <span style={{ marginLeft: 4, fontSize: 9, color: '#0891b2', fontWeight: 700 }}>적용중</span>}
                        {isFuture && <span style={{ marginLeft: 4, fontSize: 9, color: '#2563eb', fontWeight: 700 }}>예정</span>}
                      </td>
                      <td style={{ padding: '11px 10px', fontWeight: 600 }}>{h.plan_name}</td>
                      <td style={{ padding: '11px 10px', fontFamily: 'monospace', fontSize: 12 }}>
                        {h.start_date || '-'} ~ {h.end_date || '현재'}
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600, color: isPriceChange ? '#7c3aed' : '#d97706' }}>{Number(h.base_fee).toLocaleString()}원</td>
                      <td style={{ padding: '11px 10px', textAlign: 'right' }}>{Number(h.per_rider_fee).toLocaleString()}원</td>
                      <td style={{ padding: '11px 10px', textAlign: 'right' }}>{isPriceChange ? `${h.free_riders}명` : '-'}</td>
                      <td style={{ padding: '11px 10px', color: '#94a3b8', fontSize: 12 }}>{h.season_name || '-'}</td>
                      <td style={{ padding: '11px 10px', fontSize: 12 }}>{h.changed_by_name || '-'}</td>
                      <td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{h.created_at?.slice(0, 10) || '-'}</td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>이력이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 요금제 관리 ─── */}
      {tab === 'plans' && isMaster && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setNewPlanModal(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 요금제 추가</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map(p => (
              <div key={p.plan_id} style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${p.is_active ? '#e2e8f0' : '#fecaca'}`, opacity: p.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{p.plan_name}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.is_active ? '#f0fdf4' : '#fef2f2', color: p.is_active ? '#16a34a' : '#dc2626' }}>{p.is_active ? '활성' : '비활성'}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginBottom: 8 }}>{Number(p.base_fee).toLocaleString()}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>원/월</span></div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 2 }}>기사당: <strong>{Number(p.per_rider_fee).toLocaleString()}원</strong> / 무료: <strong>{p.free_riders}명</strong> / 최대: <strong>{p.max_riders === 0 ? '무제한' : `${p.max_riders}명`}</strong></div>
                {p.description && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#f8fafc', fontSize: 12, color: '#94a3b8' }}>{p.description}</div>}
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>예) 기사 5명 → {Number(p.base_fee + Math.max(0, 5 - p.free_riders) * p.per_rider_fee).toLocaleString()}원/월</div>
                <button onClick={() => openPriceChange(p)} style={{ marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 10, border: '1.5px solid #ddd6fe', background: '#faf5ff', color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>금액 변경 (적용일자)</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 시즌별 특별가 ─── */}
      {tab === 'seasonal' && isMaster && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>시즌별 특별가: 해당 기간 청구 시 기본 요금 대신 적용 (예: 1~3월 비시즌 할인)</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {plans.filter(p => p.is_active).map(p => (
              <button key={p.plan_id} onClick={() => selectSeasonPlan(p)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: seasonPlan?.plan_id === p.plan_id ? '2px solid #d97706' : '1px solid #e2e8f0', background: seasonPlan?.plan_id === p.plan_id ? '#fffbeb' : 'white', color: seasonPlan?.plan_id === p.plan_id ? '#d97706' : '#64748b' }}>{p.plan_name}</button>
            ))}
          </div>
          {seasonPlan ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div><span style={{ fontSize: 16, fontWeight: 700 }}>{seasonPlan.plan_name}</span><span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 8 }}>기본: {Number(seasonPlan.base_fee).toLocaleString()}원</span></div>
                <button onClick={() => { setSeasonModal(true); setSeasonForm({ season_name: '', start_date: '', end_date: '', base_fee: String(seasonPlan.base_fee), per_rider_fee: String(seasonPlan.per_rider_fee) }); }} style={{ padding: '8px 16px', borderRadius: 8, background: '#d97706', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 시즌 추가</button>
              </div>
              {seasons.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14, border: '1px solid #f1f5f9' }}>등록된 시즌 요금이 없습니다.</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {seasons.map(s => {
                    const now = new Date().toISOString().slice(0, 10);
                    const isActive = s.is_active && s.start_date <= now && s.end_date >= now;
                    const isFuture = s.start_date > now;
                    return (
                      <div key={s.id} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: `2px solid ${isActive ? '#f59e0b' : '#f1f5f9'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>{s.season_name}</span>
                            {isActive && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#d97706' }}>적용중</span>}
                            {isFuture && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#2563eb' }}>예정</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{s.start_date} ~ {s.end_date}</div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>기본료: <strong style={{ color: '#d97706' }}>{Number(s.base_fee).toLocaleString()}원</strong> / 기사당: <strong style={{ color: '#d97706' }}>{Number(s.per_rider_fee).toLocaleString()}원</strong>
                            {s.base_fee < seasonPlan.base_fee && <span style={{ marginLeft: 6, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>({Math.round((1 - s.base_fee / seasonPlan.base_fee) * 100)}% 할인)</span>}
                            {s.base_fee > seasonPlan.base_fee && <span style={{ marginLeft: 6, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>({Math.round((s.base_fee / seasonPlan.base_fee - 1) * 100)}% 인상)</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSeason(s.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>삭제</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14, border: '1px solid #f1f5f9' }}>요금제를 선택하세요.</div>}
        </div>
      )}

      {/* ─── 청구 내역 ─── */}
      {tab === 'billing' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            {isMaster && <div style={{ display: 'flex', gap: 12, fontSize: 13 }}><span>총 <strong>{totalAmount.toLocaleString()}원</strong></span><span>결제 <strong style={{ color: '#16a34a' }}>{paidAmount.toLocaleString()}원</strong></span><span>미결제 <strong style={{ color: '#d97706' }}>{unpaidAmount.toLocaleString()}원</strong></span></div>}
            {isMaster && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} /><button onClick={handleGenerate} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{loading ? '생성 중...' : '청구 생성'}</button></div>}
          </div>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>{[...(isMaster ? ['업체명'] : []), '청구월', '요금제', '기사수', '기본료', '기사과금', '합계', '운행건수', '상태', '결제일', ...(isMaster ? ['관리'] : [])].map(h => (<th key={h} style={{ padding: '11px 10px', textAlign: ['기본료', '기사과금', '합계', '운행건수', '기사수'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>))}</tr></thead>
              <tbody>
                {list.map(b => (<tr key={b.billing_id} style={{ borderBottom: '1px solid #f8fafc' }}>{isMaster && <td style={{ padding: '11px 10px', fontWeight: 600 }}>{b.company_name}</td>}<td style={{ padding: '11px 10px' }}>{b.billing_period}</td><td style={{ padding: '11px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: b.memo?.includes('시즌') ? '#fffbeb' : '#faf5ff', color: b.memo?.includes('시즌') ? '#d97706' : '#7c3aed' }}>{b.plan_name || '-'}</span></td><td style={{ padding: '11px 10px', textAlign: 'right' }}>{b.active_riders || 0}명</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.base_fee || 0).toLocaleString()}</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.rider_fee || 0).toLocaleString()}</td><td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(b.billing_amount).toLocaleString()}원</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#94a3b8' }}>{b.total_rides}건</td><td style={{ padding: '11px 10px' }}><span style={statusStyle(b.status)}>{statusLabel[b.status] || b.status}</span></td><td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{b.paid_at ? b.paid_at.slice(0, 10) : '-'}</td>{isMaster && <td style={{ padding: '11px 10px' }}>{b.status === 'INVOICED' && <button onClick={() => handlePay(b.billing_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>결제완료</button>}</td>}</tr>))}
                {list.length === 0 && <tr><td colSpan={isMaster ? 11 : 9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>청구 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 금액 변경 모달 */}
      {priceModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setPriceModal(null)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 500, maxHeight: '85vh', overflow: 'auto' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>요금 변경 (적용일자)</div><div style={{ fontSize: 14, color: '#7c3aed', fontWeight: 700, marginBottom: 20 }}>{priceModal.plan_name}</div><div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>시행일 이후의 청구부터 새 금액이 적용됩니다.</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시행일 *</label><input type="date" value={priceForm.effective_from} onChange={e => setPriceForm(f => ({ ...f, effective_from: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[{ k: 'base_fee', label: '기본료' }, { k: 'per_rider_fee', label: '기사당 단가' }, { k: 'free_riders', label: '무료 기사' }, { k: 'max_riders', label: '최대 기사' }].map(f => (<div key={f.k}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input type="number" value={priceForm[f.k]} onChange={e => setPriceForm(p => ({ ...p, [f.k]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}</div>{priceHistory.length > 0 && <div style={{ marginTop: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>변경 이력</div><div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>{priceHistory.map((h, i) => (<div key={h.id} style={{ padding: '8px 12px', borderBottom: i < priceHistory.length - 1 ? '1px solid #f8fafc' : 'none', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>기본 {Number(h.base_fee).toLocaleString()} + 기사당 {Number(h.per_rider_fee).toLocaleString()}</span><span style={{ color: '#94a3b8' }}>{h.effective_from} ~ {h.effective_to || '현재'}</span></div>))}</div></div>}<div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button onClick={() => setPriceModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handlePriceChange} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '적용'}</button></div></div></div>)}

      {/* 요금제 추가 모달 */}
      {newPlanModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setNewPlanModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 440, maxHeight: '80vh', overflow: 'auto' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>새 요금제 등록</div>{[{ k: 'plan_name', label: '요금제명 *', ph: '엔터프라이즈', type: 'text' }, { k: 'base_fee', label: '기본료', ph: '100000', type: 'number' }, { k: 'per_rider_fee', label: '기사당 단가', ph: '3000', type: 'number' }, { k: 'free_riders', label: '무료 기사', ph: '10', type: 'number' }, { k: 'max_riders', label: '최대 기사', ph: '0', type: 'number' }, { k: 'description', label: '설명', ph: '맞춤 요금제', type: 'text' }].map(f => (<div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input type={f.type} value={newPlan[f.k]} onChange={e => setNewPlan(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}<div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button onClick={() => setNewPlanModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleNewPlan} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '등록'}</button></div></div></div>)}

      {/* 시즌 추가 모달 */}
      {seasonModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSeasonModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 440, maxHeight: '80vh', overflow: 'auto' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>시즌 요금 등록</div><div style={{ fontSize: 14, color: '#d97706', fontWeight: 700, marginBottom: 20 }}>{seasonPlan?.plan_name}</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시즌명 *</label><input value={seasonForm.season_name} onChange={e => setSeasonForm(p => ({ ...p, season_name: e.target.value }))} placeholder="비시즌 할인" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}><div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시작일 *</label><input type="date" value={seasonForm.start_date} onChange={e => setSeasonForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>종료일 *</label><input type="date" value={seasonForm.end_date} onChange={e => setSeasonForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시즌 기본료</label><input type="number" value={seasonForm.base_fee} onChange={e => setSeasonForm(f => ({ ...f, base_fee: e.target.value }))} placeholder={String(seasonPlan?.base_fee)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시즌 기사당 단가</label><input type="number" value={seasonForm.per_rider_fee} onChange={e => setSeasonForm(f => ({ ...f, per_rider_fee: e.target.value }))} placeholder={String(seasonPlan?.per_rider_fee)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div></div><div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button onClick={() => setSeasonModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleAddSeason} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#d97706', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '시즌 등록'}</button></div></div></div>)}
    </div>
  );
}
