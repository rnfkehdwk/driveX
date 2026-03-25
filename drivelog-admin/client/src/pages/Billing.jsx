import { useState, useEffect } from 'react';
import { fetchBilling, generateBilling, payBilling, fetchBillingPlans, createBillingPlan, changePlanPrice, fetchPlanPriceHistory, fetchSeasonalRates, createSeasonalRate, deleteSeasonalRate, fetchAllPlanHistory, createInquiry, fetchPaymentInfo } from '../api/client';

// 결제 안내 + 입금 완료 모달 (계좌 정보를 API에서 불러옴)
function PaymentModal({ billing, user, onClose, onSubmit }) {
  const [step, setStep] = useState('info');
  const [depositName, setDepositName] = useState(user?.company_name || '');
  const [depositAmount, setDepositAmount] = useState(String(billing?.billing_amount || ''));
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositMemo, setDepositMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payInfo, setPayInfo] = useState({ bank: '', account: '', holder: '', note: '' });
  const [payInfoLoading, setPayInfoLoading] = useState(true);

  useEffect(() => {
    fetchPaymentInfo().then(setPayInfo).catch(() => {}).finally(() => setPayInfoLoading(false));
  }, []);

  const handleCopy = (text) => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); };

  const handleSubmit = async () => {
    if (!depositName) { alert('입금자명을 입력해주세요.'); return; }
    if (!depositAmount) { alert('입금 금액을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await onSubmit({ inquiry_type: 'GENERAL', title: `💳 입금 완료 신고 — ${billing.billing_period} (${Number(depositAmount).toLocaleString()}원)`, content: [`📋 청구 정보`, `- 청구월: ${billing.billing_period}`, `- 요금제: ${billing.plan_name || '-'}`, `- 청구금액: ${Number(billing.billing_amount).toLocaleString()}원`, ``, `💰 입금 정보`, `- 입금자명: ${depositName}`, `- 입금금액: ${Number(depositAmount).toLocaleString()}원`, `- 입금일자: ${depositDate}`, depositMemo ? `- 메모: ${depositMemo}` : ''].filter(Boolean).join('\n') });
      alert('입금 완료가 접수되었습니다.\n관리자 확인 후 결제 처리됩니다.'); onClose();
    } catch (err) { alert(err.response?.data?.error || '접수 실패'); } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {[{ key: 'info', label: '① 결제 안내' }, { key: 'confirm', label: '② 입금 완료' }].map(s => (
            <div key={s.key} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: step === s.key ? '#2563eb' : '#f1f5f9', color: step === s.key ? 'white' : '#94a3b8' }}>{s.label}</div>
          ))}
        </div>

        {step === 'info' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>💳 사용료 결제 안내</div>
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 600, marginBottom: 8 }}>청구 정보</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, color: '#1e293b' }}>
                <div>청구월: <strong>{billing.billing_period}</strong></div>
                <div>요금제: <strong>{billing.plan_name || '-'}</strong></div>
                <div>기사수: <strong>{billing.active_riders || 0}명</strong></div>
                <div>운행건수: <strong>{billing.total_rides}건</strong></div>
              </div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900, color: '#2563eb', textAlign: 'center' }}>{Number(billing.billing_amount).toLocaleString()}원</div>
            </div>

            {payInfoLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>계좌 정보 로딩 중...</div>
            ) : !payInfo.account ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: 12, marginBottom: 16 }}>결제 계좌 정보가 설정되지 않았습니다. 관리자에게 문의하세요.</div>
            ) : (
              <div style={{ background: '#faf5ff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, marginBottom: 10 }}>입금 계좌</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><div style={{ fontSize: 11, color: '#94a3b8' }}>은행</div><div style={{ fontSize: 15, fontWeight: 700 }}>{payInfo.bank}</div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: 11, color: '#94a3b8' }}>계좌번호</div><div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>{payInfo.account}</div></div>
                    <button onClick={() => handleCopy(payInfo.account)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd6fe', background: copied ? '#f0fdf4' : 'white', color: copied ? '#16a34a' : '#7c3aed', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied ? '✓ 복사됨' : '📋 복사'}</button>
                  </div>
                  <div><div style={{ fontSize: 11, color: '#94a3b8' }}>예금주</div><div style={{ fontSize: 15, fontWeight: 700 }}>{payInfo.holder}</div></div>
                </div>
              </div>
            )}

            {payInfo.note && (
              <div style={{ background: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 20, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.8 }}>
                  📌 {payInfo.note}<br />
                  📌 입금 후 아래 "입금 완료" 버튼을 눌러주세요.<br />
                  📌 관리자 확인 후 결제 처리됩니다.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
              <button onClick={() => setStep('confirm')} disabled={!payInfo.account} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#16a34a', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: payInfo.account ? 1 : 0.5 }}>입금 완료 → 다음</button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>✅ 입금 완료 신고</div>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#16a34a' }}>청구금액</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{Number(billing.billing_amount).toLocaleString()}원</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{billing.billing_period} | {billing.plan_name}</div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={labelStyle}>입금자명 *</label><input value={depositName} onChange={e => setDepositName(e.target.value)} style={inputStyle} placeholder="입금자명 (업체명)" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>입금 금액 *</label><input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>입금 일자</label><input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label style={labelStyle}>메모 (선택)</label><input value={depositMemo} onChange={e => setDepositMemo(e.target.value)} style={inputStyle} placeholder="참고사항" /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('info')} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← 이전</button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '접수 중...' : '입금 완료 접수'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Billing({ user }) {
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [genMonth, setGenMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(() => user?.role === 'SUPER_ADMIN' ? 'myplan' : 'billing');
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
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [changeReqModal, setChangeReqModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  const load = () => { fetchBilling({}).then(r => setList(r.data || [])).catch(() => {}); fetchBillingPlans({}).then(r => setPlans(r.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const isMaster = user?.role === 'MASTER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const currentPlan = plans.find(p => p.plan_id === user?.plan_id);

  useEffect(() => { if (tab === 'history' && isMaster) { fetchAllPlanHistory().then(r => setAllHistory(r.data || [])).catch(() => setAllHistory([])); } }, [tab]);

  const handleGenerate = async () => { if (!genMonth) { alert('청구 월을 선택하세요.'); return; } setLoading(true); try { const res = await generateBilling({ billing_period: genMonth }); alert(res.message); load(); } catch (err) { alert(err.response?.data?.error || '생성 실패'); } finally { setLoading(false); } };
  const handlePay = async (id) => { if (!confirm('결제 완료 처리하시겠습니까?')) return; try { await payBilling(id); load(); } catch { alert('처리 실패'); } };
  const openPriceChange = (plan) => { setPriceModal(plan); setPriceForm({ base_fee: String(plan.base_fee), per_rider_fee: String(plan.per_rider_fee), free_riders: String(plan.free_riders), max_riders: String(plan.max_riders), effective_from: '' }); fetchPlanPriceHistory(plan.plan_id).then(r => setPriceHistory(r.data || [])).catch(() => setPriceHistory([])); };
  const handlePriceChange = async () => { if (!priceForm.effective_from) { alert('시행일을 선택해주세요.'); return; } setSaving(true); try { await changePlanPrice(priceModal.plan_id, { base_fee: parseInt(priceForm.base_fee) || 0, per_rider_fee: parseInt(priceForm.per_rider_fee) || 0, free_riders: parseInt(priceForm.free_riders) || 0, max_riders: parseInt(priceForm.max_riders) || 0, effective_from: priceForm.effective_from }); alert('변경 완료'); setPriceModal(null); load(); } catch (err) { alert(err.response?.data?.error || '변경 실패'); } finally { setSaving(false); } };
  const handleNewPlan = async () => { if (!newPlan.plan_name) { alert('요금제명은 필수'); return; } setSaving(true); try { await createBillingPlan({ ...newPlan, base_fee: parseInt(newPlan.base_fee) || 0, per_rider_fee: parseInt(newPlan.per_rider_fee) || 0, free_riders: parseInt(newPlan.free_riders) || 0, max_riders: parseInt(newPlan.max_riders) || 0 }); alert('등록 완료'); setNewPlanModal(false); setNewPlan({ plan_name: '', base_fee: '', per_rider_fee: '', free_riders: '', max_riders: '', description: '' }); load(); } catch (err) { alert(err.response?.data?.error || '등록 실패'); } finally { setSaving(false); } };
  const loadSeasons = (planId) => { fetchSeasonalRates(planId).then(r => setSeasons(r.data || [])).catch(() => setSeasons([])); };
  const selectSeasonPlan = (p) => { setSeasonPlan(p); loadSeasons(p.plan_id); };
  const handleAddSeason = async () => { if (!seasonForm.season_name || !seasonForm.start_date || !seasonForm.end_date) { alert('필수 입력'); return; } setSaving(true); try { await createSeasonalRate(seasonPlan.plan_id, { ...seasonForm, base_fee: parseInt(seasonForm.base_fee) || 0, per_rider_fee: parseInt(seasonForm.per_rider_fee) || 0 }); alert('등록 완료'); setSeasonModal(false); setSeasonForm({ season_name: '', start_date: '', end_date: '', base_fee: '', per_rider_fee: '' }); loadSeasons(seasonPlan.plan_id); } catch (err) { alert(err.response?.data?.error || '등록 실패'); } finally { setSaving(false); } };
  const handleDeleteSeason = async (id) => { if (!confirm('삭제?')) return; try { await deleteSeasonalRate(id); loadSeasons(seasonPlan.plan_id); } catch { alert('삭제 실패'); } };
  const handlePlanChangeRequest = async (targetPlan, type) => { setSaving(true); try { await createInquiry({ inquiry_type: type, title: `요금제 ${type === 'UPGRADE' ? '업그레이드' : '다운그레이드'}: ${currentPlan?.plan_name || ''} → ${targetPlan.plan_name}`, content: `현재: ${currentPlan?.plan_name || '미지정'}\n변경: ${targetPlan.plan_name}\n기본료: ${Number(targetPlan.base_fee).toLocaleString()}원/월` }); alert('요금제 변경 요청이 접수되었습니다.'); setChangeReqModal(null); } catch (err) { alert(err.response?.data?.error || '요청 실패'); } finally { setSaving(false); } };
  const handlePaymentSubmit = async (data) => { await createInquiry(data); load(); };

  const statusStyle = (st) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: st === 'PAID' ? '#f0fdf4' : st === 'INVOICED' ? '#fffbeb' : st === 'OVERDUE' ? '#fef2f2' : '#f8fafc', color: st === 'PAID' ? '#16a34a' : st === 'INVOICED' ? '#d97706' : st === 'OVERDUE' ? '#dc2626' : '#94a3b8' });
  const statusLabel = { DRAFT: '초안', INVOICED: '청구됨', PAID: '결제완료', OVERDUE: '연체' };
  const totalAmount = list.reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const paidAmount = list.filter(b => b.status === 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const unpaidAmount = list.filter(b => b.status !== 'PAID').reduce((s, b) => s + Number(b.billing_amount || 0), 0);
  const filteredHistory = historyFilter === 'ALL' ? allHistory : allHistory.filter(h => h.type === historyFilter);

  const tabConfig = isMaster ? [
    { key: 'billing', label: '청구 내역', color: '#2563eb' }, { key: 'plans', label: '요금제 관리', color: '#7c3aed' }, { key: 'seasonal', label: '시즌별 특별가', color: '#d97706' }, { key: 'history', label: '요금 변경 이력', color: '#0891b2' },
  ] : [
    { key: 'myplan', label: '내 요금제', color: '#2563eb' }, { key: 'billing', label: '청구 내역', color: '#7c3aed' },
  ];

  return (
    <div className="fade-in">
      {paymentModal && <PaymentModal billing={paymentModal} user={user} onClose={() => setPaymentModal(null)} onSubmit={handlePaymentSubmit} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabConfig.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: tab === t.key ? `2px solid ${t.color}` : '1px solid #e2e8f0', background: tab === t.key ? `${t.color}11` : 'white', color: tab === t.key ? t.color : '#64748b' }}>{t.label}</button>))}
      </div>

      {/* ─── SUPER_ADMIN: 내 요금제 ─── */}
      {tab === 'myplan' && isSuperAdmin && (<div>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '2px solid #2563eb', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div><div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>현재 이용 중인 요금제</div><div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{currentPlan?.plan_name || '미지정'}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: '#94a3b8' }}>만료일</div><div style={{ fontSize: 15, fontWeight: 700, color: user?.license_expired ? '#dc2626' : '#1e293b' }}>{user?.license_expires?.slice(0, 10) || '-'}</div></div>
          </div>
          {currentPlan && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>{[{ l: '기본료', v: `${Number(currentPlan.base_fee).toLocaleString()}원` }, { l: '기사당 단가', v: `${Number(currentPlan.per_rider_fee).toLocaleString()}원` }, { l: '무료 기사', v: `${currentPlan.free_riders}명` }].map((x, i) => (<div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}><div style={{ fontSize: 11, color: '#94a3b8' }}>{x.l}</div><div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{x.v}</div></div>))}</div>)}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>요금제 비교</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {plans.filter(p => p.is_active).map(p => { const isCurr = p.plan_id === user?.plan_id; const isUp = currentPlan && p.base_fee > currentPlan.base_fee; return (
            <div key={p.plan_id} style={{ background: 'white', borderRadius: 16, padding: 20, border: isCurr ? '2px solid #2563eb' : '1px solid #e2e8f0', position: 'relative' }}>
              {isCurr && <div style={{ position: 'absolute', top: -10, left: 16, padding: '2px 12px', borderRadius: 4, background: '#2563eb', color: 'white', fontSize: 11, fontWeight: 700 }}>현재 요금제</div>}
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, marginTop: isCurr ? 4 : 0 }}>{p.plan_name}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb', marginBottom: 8 }}>{Number(p.base_fee).toLocaleString()}<span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>원/월</span></div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8, marginBottom: 12 }}>기사당 {Number(p.per_rider_fee).toLocaleString()}원 / 무료 {p.free_riders}명 / 최대 {p.max_riders === 0 ? '무제한' : `${p.max_riders}명`}</div>
              {!isCurr && <button onClick={() => setChangeReqModal({ plan: p, type: isUp ? 'UPGRADE' : 'DOWNGRADE' })} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: isUp ? '#2563eb' : '#f59e0b', color: 'white' }}>{isUp ? '⬆️ 업그레이드 요청' : '⬇️ 다운그레이드 요청'}</button>}
            </div>); })}
        </div>
      </div>)}

      {/* ─── 요금 변경 이력 (MASTER) ─── */}
      {tab === 'history' && isMaster && (<div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>{[{ key: 'ALL', label: '전체' }, { key: 'PRICE_CHANGE', label: '요금 변경' }, { key: 'SEASONAL', label: '특별가' }].map(f => (<button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: historyFilter === f.key ? '2px solid #0891b2' : '1px solid #e2e8f0', background: historyFilter === f.key ? '#ecfeff' : 'white', color: historyFilter === f.key ? '#0891b2' : '#64748b' }}>{f.label}</button>))}<span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', marginLeft: 8 }}>{filteredHistory.length}건</span></div>
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#f8fafc' }}>{['구분', '요금제', '적용 기간', '기본료', '기사당', '무료', '비고', '변경자', '등록일'].map(h => (<th key={h} style={{ padding: '11px 10px', textAlign: ['기본료', '기사당', '무료'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>))}</tr></thead><tbody>{filteredHistory.map((h) => { const isPc = h.type === 'PRICE_CHANGE'; const now = new Date().toISOString().slice(0, 10); const isAct = isPc ? (h.start_date <= now && (!h.end_date || h.end_date >= now)) : (h.is_active && h.start_date <= now && h.end_date >= now); const isFut = h.start_date > now; return (<tr key={`${h.type}-${h.id}`} style={{ borderBottom: '1px solid #f1f5f9', background: isAct ? '#f0fdfa' : isFut ? '#eff6ff' : 'transparent' }}><td style={{ padding: '11px 10px' }}><span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: isPc ? '#faf5ff' : '#fffbeb', color: isPc ? '#7c3aed' : '#d97706' }}>{isPc ? '변경' : '특별가'}</span>{isAct && <span style={{ marginLeft: 4, fontSize: 9, color: '#0891b2', fontWeight: 700 }}>적용중</span>}</td><td style={{ padding: '11px 10px', fontWeight: 600 }}>{h.plan_name}</td><td style={{ padding: '11px 10px', fontFamily: 'monospace', fontSize: 12 }}>{h.start_date || '-'} ~ {h.end_date || '현재'}</td><td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(h.base_fee).toLocaleString()}원</td><td style={{ padding: '11px 10px', textAlign: 'right' }}>{Number(h.per_rider_fee).toLocaleString()}원</td><td style={{ padding: '11px 10px', textAlign: 'right' }}>{isPc ? `${h.free_riders}명` : '-'}</td><td style={{ padding: '11px 10px', color: '#94a3b8', fontSize: 12 }}>{h.season_name || '-'}</td><td style={{ padding: '11px 10px', fontSize: 12 }}>{h.changed_by_name || '-'}</td><td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{h.created_at?.slice(0, 10) || '-'}</td></tr>); })}{filteredHistory.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>이력이 없습니다.</td></tr>}</tbody></table></div>
      </div>)}

      {/* ─── 요금제 관리 (MASTER) ─── */}
      {tab === 'plans' && isMaster && (<div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => setNewPlanModal(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 요금제 추가</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>{plans.map(p => (<div key={p.plan_id} style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${p.is_active ? '#e2e8f0' : '#fecaca'}`, opacity: p.is_active ? 1 : 0.6 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div style={{ fontSize: 18, fontWeight: 800 }}>{p.plan_name}</div><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.is_active ? '#f0fdf4' : '#fef2f2', color: p.is_active ? '#16a34a' : '#dc2626' }}>{p.is_active ? '활성' : '비활성'}</span></div><div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginBottom: 8 }}>{Number(p.base_fee).toLocaleString()}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>원/월</span></div><div style={{ fontSize: 13, color: '#64748b', lineHeight: 2 }}>기사당: <strong>{Number(p.per_rider_fee).toLocaleString()}원</strong> / 무료: <strong>{p.free_riders}명</strong> / 최대: <strong>{p.max_riders === 0 ? '무제한' : `${p.max_riders}명`}</strong></div><button onClick={() => openPriceChange(p)} style={{ marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 10, border: '1.5px solid #ddd6fe', background: '#faf5ff', color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>금액 변경</button></div>))}</div>
      </div>)}

      {/* ─── 시즌별 특별가 (MASTER) ─── */}
      {tab === 'seasonal' && isMaster && (<div>
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>시즌별 특별가: 해당 기간 청구 시 기본 요금 대신 적용</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>{plans.filter(p => p.is_active).map(p => (<button key={p.plan_id} onClick={() => selectSeasonPlan(p)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: seasonPlan?.plan_id === p.plan_id ? '2px solid #d97706' : '1px solid #e2e8f0', background: seasonPlan?.plan_id === p.plan_id ? '#fffbeb' : 'white', color: seasonPlan?.plan_id === p.plan_id ? '#d97706' : '#64748b' }}>{p.plan_name}</button>))}</div>
        {seasonPlan ? (<div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><span style={{ fontSize: 16, fontWeight: 700 }}>{seasonPlan.plan_name}</span><button onClick={() => { setSeasonModal(true); setSeasonForm({ season_name: '', start_date: '', end_date: '', base_fee: String(seasonPlan.base_fee), per_rider_fee: String(seasonPlan.per_rider_fee) }); }} style={{ padding: '8px 16px', borderRadius: 8, background: '#d97706', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 시즌 추가</button></div>{seasons.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14 }}>등록된 시즌이 없습니다.</div> : (<div style={{ display: 'grid', gap: 12 }}>{seasons.map(s => { const now = new Date().toISOString().slice(0, 10); const isA = s.is_active && s.start_date <= now && s.end_date >= now; return (<div key={s.id} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: `2px solid ${isA ? '#f59e0b' : '#f1f5f9'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 15, fontWeight: 700 }}>{s.season_name} {isA && <span style={{ fontSize: 10, color: '#d97706' }}>적용중</span>}</div><div style={{ fontSize: 12, color: '#64748b' }}>{s.start_date} ~ {s.end_date} | {Number(s.base_fee).toLocaleString()}원</div></div><button onClick={() => handleDeleteSeason(s.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>삭제</button></div>); })}</div>)}</div>) : <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14 }}>요금제를 선택하세요.</div>}
      </div>)}

      {/* ─── 청구 내역 ─── */}
      {tab === 'billing' && (<div>
        {isSuperAdmin && list.some(b => b.status === 'INVOICED') && (<div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 18px', marginBottom: 16, border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}><div><div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>💳 미결제 청구가 있습니다</div><div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>"결제하기" 버튼을 눌러 입금 안내를 확인하세요.</div></div><div style={{ fontSize: 18, fontWeight: 900, color: '#d97706' }}>{list.filter(b => b.status === 'INVOICED').reduce((s, b) => s + Number(b.billing_amount || 0), 0).toLocaleString()}원</div></div>)}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          {isMaster && <div style={{ display: 'flex', gap: 12, fontSize: 13 }}><span>총 <strong>{totalAmount.toLocaleString()}원</strong></span><span>결제 <strong style={{ color: '#16a34a' }}>{paidAmount.toLocaleString()}원</strong></span><span>미결제 <strong style={{ color: '#d97706' }}>{unpaidAmount.toLocaleString()}원</strong></span></div>}
          {isMaster && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} /><button onClick={handleGenerate} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{loading ? '생성 중...' : '청구 생성'}</button></div>}
        </div>
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8fafc' }}>{[...(isMaster ? ['업체명'] : []), '청구월', '요금제', '기사수', '기본료', '기사과금', '합계', '운행', '상태', '결제일', '관리'].map(h => (<th key={h} style={{ padding: '11px 10px', textAlign: ['기본료', '기사과금', '합계', '운행', '기사수'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>))}</tr></thead>
            <tbody>{list.map(b => (<tr key={b.billing_id} style={{ borderBottom: '1px solid #f8fafc' }}>{isMaster && <td style={{ padding: '11px 10px', fontWeight: 600 }}>{b.company_name}</td>}<td style={{ padding: '11px 10px' }}>{b.billing_period}</td><td style={{ padding: '11px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#7c3aed' }}>{b.plan_name || '-'}</span></td><td style={{ padding: '11px 10px', textAlign: 'right' }}>{b.active_riders || 0}</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.base_fee || 0).toLocaleString()}</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#64748b' }}>{Number(b.rider_fee || 0).toLocaleString()}</td><td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(b.billing_amount).toLocaleString()}원</td><td style={{ padding: '11px 10px', textAlign: 'right', color: '#94a3b8' }}>{b.total_rides}</td><td style={{ padding: '11px 10px' }}><span style={statusStyle(b.status)}>{statusLabel[b.status] || b.status}</span></td><td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{b.paid_at ? b.paid_at.slice(0, 10) : '-'}</td><td style={{ padding: '11px 10px' }}>{isMaster && b.status === 'INVOICED' && <button onClick={() => handlePay(b.billing_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>결제완료</button>}{isSuperAdmin && b.status === 'INVOICED' && <button onClick={() => setPaymentModal(b)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💳 결제하기</button>}{b.status === 'PAID' && <span style={{ fontSize: 11, color: '#16a34a' }}>✓</span>}</td></tr>))}{list.length === 0 && <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>청구 내역이 없습니다.</td></tr>}</tbody>
          </table>
        </div>
      </div>)}

      {/* 요금제 변경 요청 모달 */}
      {changeReqModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setChangeReqModal(null)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>{changeReqModal.type === 'UPGRADE' ? '⬆️' : '⬇️'}</div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>요금제 {changeReqModal.type === 'UPGRADE' ? '업그레이드' : '다운그레이드'} 요청</div><div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 20 }}><strong>{currentPlan?.plan_name || '현재'}</strong> → <strong style={{ color: '#2563eb' }}>{changeReqModal.plan.plan_name}</strong><br />월 {Number(changeReqModal.plan.base_fee).toLocaleString()}원</div><div style={{ display: 'flex', gap: 10 }}><button onClick={() => setChangeReqModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={() => handlePlanChangeRequest(changeReqModal.plan, changeReqModal.type)} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: changeReqModal.type === 'UPGRADE' ? '#2563eb' : '#f59e0b', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '요청 중...' : '변경 요청'}</button></div></div></div>)}
      {/* 금액 변경 모달 */}
      {priceModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setPriceModal(null)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 500, maxHeight: '85vh', overflow: 'auto' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>요금 변경 — {priceModal.plan_name}</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시행일 *</label><input type="date" value={priceForm.effective_from} onChange={e => setPriceForm(f => ({ ...f, effective_from: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[{ k: 'base_fee', l: '기본료' }, { k: 'per_rider_fee', l: '기사당' }, { k: 'free_riders', l: '무료기사' }, { k: 'max_riders', l: '최대기사' }].map(f => (<div key={f.k}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.l}</label><input type="number" value={priceForm[f.k]} onChange={e => setPriceForm(p => ({ ...p, [f.k]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}</div><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button onClick={() => setPriceModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handlePriceChange} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '적용'}</button></div></div></div>)}
      {newPlanModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setNewPlanModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 440 }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>새 요금제 등록</div>{[{ k: 'plan_name', l: '요금제명 *', t: 'text' }, { k: 'base_fee', l: '기본료', t: 'number' }, { k: 'per_rider_fee', l: '기사당', t: 'number' }, { k: 'free_riders', l: '무료기사', t: 'number' }, { k: 'max_riders', l: '최대기사', t: 'number' }, { k: 'description', l: '설명', t: 'text' }].map(f => (<div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.l}</label><input type={f.t} value={newPlan[f.k]} onChange={e => setNewPlan(p => ({ ...p, [f.k]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}<div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button onClick={() => setNewPlanModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleNewPlan} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '등록'}</button></div></div></div>)}
      {seasonModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSeasonModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 440 }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>시즌 요금 — {seasonPlan?.plan_name}</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시즌명 *</label><input value={seasonForm.season_name} onChange={e => setSeasonForm(p => ({ ...p, season_name: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>{[{ k: 'start_date', l: '시작일 *', t: 'date' }, { k: 'end_date', l: '종료일 *', t: 'date' }, { k: 'base_fee', l: '시즌 기본료', t: 'number' }, { k: 'per_rider_fee', l: '시즌 기사당', t: 'number' }].map(f => (<div key={f.k}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.l}</label><input type={f.t} value={seasonForm[f.k]} onChange={e => setSeasonForm(p => ({ ...p, [f.k]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}</div><div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button onClick={() => setSeasonModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleAddSeason} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#d97706', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '시즌 등록'}</button></div></div></div>)}
    </div>
  );
}
