import { useState, useEffect } from 'react';
import { fetchSettlements, previewSettlements, generateSettlements, approveSettlement, paySettlement, fetchPaySettings, savePaySettings, fetchRiderPayRates, saveRiderPayRate } from '../api/client';

const PAY_TYPE_LABEL = { HOURLY: '시급제', PER_RIDE: '건별제', COMMISSION: '수수료제' };
const MIN_WORK_LABEL = { ROUND_DOWN: '절삭 (40분→0시간)', ROUND_UP: '올림 (10분→1시간)', ROUND_HALF: '반올림 (30분 기준)', MIN_1HOUR: '최소 1시간 인정', ACTUAL: '분단위 실제 계산' };

export default function Settlements() {
  const [tab, setTab] = useState('list');
  const [data, setData] = useState({ data: [], summary: {} });
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ pay_type: 'PER_RIDE', default_hourly_rate: '', default_per_ride_rate: '', default_commission_pct: '', min_work_policy: 'ROUND_DOWN' });
  const [riders, setRiders] = useState([]);
  const [editRider, setEditRider] = useState(null);
  const [riderForm, setRiderForm] = useState({ hourly_rate: '', per_ride_rate: '', commission_pct: '', memo: '' });
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ period_start: '', period_end: '' });
  const [preview, setPreview] = useState([]);
  const [previewPayType, setPreviewPayType] = useState('');
  const [previewChecked, setPreviewChecked] = useState(false); // 조회 완료 여부
  const [riderHours, setRiderHours] = useState({});

  const load = () => fetchSettlements({ month }).then(setData).catch(() => {});
  const loadSettings = () => fetchPaySettings().then(r => { setPayForm({ pay_type: r.pay_type || 'PER_RIDE', default_hourly_rate: String(r.default_hourly_rate || ''), default_per_ride_rate: String(r.default_per_ride_rate || ''), default_commission_pct: String(r.default_commission_pct || ''), min_work_policy: r.min_work_policy || 'ROUND_DOWN' }); }).catch(() => {});
  const loadRiders = () => fetchRiderPayRates().then(r => setRiders(r.data || [])).catch(() => {});

  useEffect(() => { load(); }, [month]);
  useEffect(() => { if (tab === 'settings') { loadSettings(); loadRiders(); } }, [tab]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try { await savePaySettings({ ...payForm, default_hourly_rate: parseInt(payForm.default_hourly_rate) || 0, default_per_ride_rate: parseInt(payForm.default_per_ride_rate) || 0, default_commission_pct: parseFloat(payForm.default_commission_pct) || 20 }); alert('저장되었습니다.'); loadSettings(); }
    catch (err) { alert(err.response?.data?.error || '저장 실패'); } finally { setSaving(false); }
  };

  const openRiderEdit = (r) => { setEditRider(r); setRiderForm({ hourly_rate: r.hourly_rate ?? '', per_ride_rate: r.per_ride_rate ?? '', commission_pct: r.commission_pct ?? '', memo: r.memo || '' }); };
  const handleSaveRider = async () => {
    setSaving(true);
    try { await saveRiderPayRate(editRider.user_id, { hourly_rate: riderForm.hourly_rate ? parseInt(riderForm.hourly_rate) : null, per_ride_rate: riderForm.per_ride_rate ? parseInt(riderForm.per_ride_rate) : null, commission_pct: riderForm.commission_pct ? parseFloat(riderForm.commission_pct) : null, memo: riderForm.memo || null }); alert('저장되었습니다.'); setEditRider(null); loadRiders(); }
    catch (err) { alert(err.response?.data?.error || '저장 실패'); } finally { setSaving(false); }
  };

  const openGenModal = () => { setGenForm({ period_start: `${month}-01`, period_end: `${month}-31` }); setPreview([]); setPreviewPayType(''); setRiderHours({}); setPreviewChecked(false); setGenModal(true); };

  const handlePreview = async () => {
    if (!genForm.period_start || !genForm.period_end) { alert('기간을 선택하세요.'); return; }
    setLoading(true);
    setPreviewChecked(false);
    try {
      const res = await previewSettlements({ period_start: genForm.period_start, period_end: genForm.period_end });
      setPreview(res.data || []);
      setPreviewPayType(res.pay_type || 'PER_RIDE');
      setPreviewChecked(true);
      const hrs = {};
      (res.data || []).forEach(r => hrs[r.rider_id] = '');
      setRiderHours(hrs);
    } catch (err) { alert(err.response?.data?.error || '조회 실패'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (previewPayType === 'HOURLY') {
      const missing = preview.filter(r => !riderHours[r.rider_id] && riderHours[r.rider_id] !== '0');
      if (missing.length > 0) { alert('시급제: 모든 기사의 근무시간을 입력해주세요.'); return; }
    }
    setLoading(true);
    try {
      const body = { ...genForm, rider_hours: riderHours };
      const res = await generateSettlements(body);
      alert(res.message); setGenModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '생성 실패'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => { if (!confirm('승인?')) return; try { await approveSettlement(id); load(); } catch { alert('실패'); } };
  const handlePay = async (id) => { if (!confirm('지급 완료?')) return; try { await paySettlement(id); load(); } catch { alert('실패'); } };

  const s = data.summary || {};
  const statusStyle = (st) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: st === 'PAID' ? '#f0fdf4' : st === 'APPROVED' ? '#eff6ff' : '#fffbeb', color: st === 'PAID' ? '#16a34a' : st === 'APPROVED' ? '#2563eb' : '#d97706' });
  const statusLabel = { PENDING: '대기', APPROVED: '승인', PAID: '지급완료' };

  const calcPayout = (r) => {
    if (previewPayType === 'HOURLY') return Math.round((parseFloat(riderHours[r.rider_id]) || 0) * r.hourly_rate);
    if (previewPayType === 'PER_RIDE') return r.total_rides * r.per_ride_rate;
    if (previewPayType === 'COMMISSION') return Math.floor(r.total_fare * (100 - r.commission_pct) / 100);
    return 0;
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ key: 'list', label: '정산 내역', color: '#2563eb' }, { key: 'settings', label: '정산 설정', color: '#7c3aed' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: tab === t.key ? `2px solid ${t.color}` : '1px solid #e2e8f0', background: tab === t.key ? `${t.color}11` : 'white', color: tab === t.key ? t.color : '#64748b' }}>{t.label}</button>
        ))}
      </div>

      {/* ─── 정산 설정 ─── */}
      {tab === 'settings' && (
        <div>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid #f1f5f9', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>업체 정산방식</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {[{ v: 'HOURLY', label: '시급제', desc: '근무시간 × 시급', color: '#d97706' }, { v: 'PER_RIDE', label: '건별제', desc: '건수 × 건당 단가', color: '#2563eb' }, { v: 'COMMISSION', label: '수수료제', desc: '매출 × (100%-수수료)', color: '#16a34a' }].map(t => (
                <div key={t.v} onClick={() => setPayForm(f => ({ ...f, pay_type: t.v }))} style={{ flex: 1, padding: '16px 14px', borderRadius: 12, border: payForm.pay_type === t.v ? `2px solid ${t.color}` : '1.5px solid #e5e7eb', background: payForm.pay_type === t.v ? `${t.color}11` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: payForm.pay_type === t.v ? t.color : '#1e293b' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {payForm.pay_type === 'HOURLY' && (<>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>기본 시급 (원)</label><input type="number" value={payForm.default_hourly_rate} onChange={e => setPayForm(f => ({ ...f, default_hourly_rate: e.target.value }))} placeholder="10000" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>1시간 미만 처리</label><select value={payForm.min_work_policy} onChange={e => setPayForm(f => ({ ...f, min_work_policy: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>{Object.entries(MIN_WORK_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </>)}
              {payForm.pay_type === 'PER_RIDE' && (<div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>기본 건당 단가 (원)</label><input type="number" value={payForm.default_per_ride_rate} onChange={e => setPayForm(f => ({ ...f, default_per_ride_rate: e.target.value }))} placeholder="5000" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>)}
              {payForm.pay_type === 'COMMISSION' && (<div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>기본 수수료율 (%)</label><input type="number" step="0.1" value={payForm.default_commission_pct} onChange={e => setPayForm(f => ({ ...f, default_commission_pct: e.target.value }))} placeholder="20" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>)}
            </div>
            <button onClick={handleSaveSettings} disabled={saving} style={{ marginTop: 16, padding: '10px 28px', borderRadius: 10, background: '#7c3aed', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '설정 저장'}</button>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>기사별 개별 단가</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>비워두면 업체 기본값이 적용됩니다.</div>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>{['기사명', '연락처', payForm.pay_type === 'HOURLY' ? '시급' : payForm.pay_type === 'PER_RIDE' ? '건당 단가' : '수수료율', '비고', '관리'].map(h => (<th key={h} style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>))}</tr></thead>
                <tbody>
                  {riders.map(r => (
                    <tr key={r.user_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{r.phone}</td>
                      <td style={{ padding: '10px' }}>
                        {payForm.pay_type === 'HOURLY' && (r.hourly_rate != null ? `${Number(r.hourly_rate).toLocaleString()}원` : <span style={{ color: '#cbd5e1' }}>기본값</span>)}
                        {payForm.pay_type === 'PER_RIDE' && (r.per_ride_rate != null ? `${Number(r.per_ride_rate).toLocaleString()}원` : <span style={{ color: '#cbd5e1' }}>기본값</span>)}
                        {payForm.pay_type === 'COMMISSION' && (r.commission_pct != null ? `${r.commission_pct}%` : <span style={{ color: '#cbd5e1' }}>기본값</span>)}
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8', fontSize: 12 }}>{r.memo || '-'}</td>
                      <td style={{ padding: '10px' }}><button onClick={() => openRiderEdit(r)} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>설정</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 정산 내역 ─── */}
      {tab === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} /><span style={{ fontSize: 13, color: '#94a3b8' }}>{s.count || 0}건</span></div>
            <button onClick={openGenModal} style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 정산 생성</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            {[{ label: '총 운임', value: `${(s.total_fare || 0).toLocaleString()}원`, color: '#2563eb' }, { label: '수수료/공제', value: `${(s.total_commission || 0).toLocaleString()}원`, color: '#d97706' }, { label: '기사 지급액', value: `${(s.rider_payout || 0).toLocaleString()}원`, color: '#16a34a' }].map((c, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}><div style={{ fontSize: 12, color: '#94a3b8' }}>{c.label}</div><div style={{ fontSize: 24, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div></div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>{['기사', '정산방식', '기간', '건수', '총운임', '공제', '지급액', '상태', '관리'].map(h => (<th key={h} style={{ padding: '10px', textAlign: ['건수', '총운임', '공제', '지급액'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>))}</tr></thead>
              <tbody>
                {(data.data || []).map(row => (
                  <tr key={row.settlement_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{row.rider_name}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: row.pay_type === 'HOURLY' ? '#fffbeb' : row.pay_type === 'PER_RIDE' ? '#eff6ff' : '#f0fdf4', color: row.pay_type === 'HOURLY' ? '#d97706' : row.pay_type === 'PER_RIDE' ? '#2563eb' : '#16a34a' }}>{PAY_TYPE_LABEL[row.pay_type] || '-'}</span>
                      {row.pay_type === 'HOURLY' && row.work_hours != null && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{row.work_hours}h × {Number(row.hourly_rate || 0).toLocaleString()}원</div>}
                      {row.pay_type === 'PER_RIDE' && row.per_ride_rate && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{row.total_rides}건 × {Number(row.per_ride_rate).toLocaleString()}원</div>}
                      {row.pay_type === 'COMMISSION' && row.commission_pct && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>수수료 {row.commission_pct}%</div>}
                    </td>
                    <td style={{ padding: '10px', fontSize: 12 }}>{row.period_start?.slice(5)} ~ {row.period_end?.slice(5)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{row.total_rides}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{Number(row.total_fare).toLocaleString()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#d97706' }}>{Number(row.total_commission).toLocaleString()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{Number(row.rider_payout).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}><span style={statusStyle(row.status)}>{statusLabel[row.status] || row.status}</span></td>
                    <td style={{ padding: '10px' }}>
                      {row.status === 'PENDING' && <button onClick={() => handleApprove(row.settlement_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>}
                      {row.status === 'APPROVED' && <button onClick={() => handlePay(row.settlement_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>지급</button>}
                    </td>
                  </tr>
                ))}
                {(data.data || []).length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>정산 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 정산 생성 모달 */}
      {genModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setGenModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 600, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>정산 생성</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 16 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>시작일</label><input type="date" value={genForm.period_start} onChange={e => { setGenForm(f => ({ ...f, period_start: e.target.value })); setPreviewChecked(false); }} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>종료일</label><input type="date" value={genForm.period_end} onChange={e => { setGenForm(f => ({ ...f, period_end: e.target.value })); setPreviewChecked(false); }} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
              <div style={{ alignSelf: 'end' }}><button onClick={handlePreview} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, background: '#64748b', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{loading ? '조회 중...' : '조회'}</button></div>
            </div>

            {/* 조회했는데 결과 없음 */}
            {previewChecked && preview.length === 0 && (
              <div style={{ padding: '20px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>미정산 운행 기록이 없습니다</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>해당 기간의 운행이 모두 정산 완료되었거나, 완료된 운행이 없습니다.</div>
              </div>
            )}

            {/* 미리보기 결과 */}
            {preview.length > 0 && (
              <>
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: previewPayType === 'HOURLY' ? '#fffbeb' : previewPayType === 'PER_RIDE' ? '#eff6ff' : '#f0fdf4', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: previewPayType === 'HOURLY' ? '#d97706' : previewPayType === 'PER_RIDE' ? '#2563eb' : '#16a34a' }}>
                  정산방식: {PAY_TYPE_LABEL[previewPayType]}
                  {previewPayType === 'HOURLY' && ' — 각 기사의 근무시간을 입력해주세요'}
                </div>
                <div style={{ overflow: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>기사</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>건수</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>총운임</th>
                      {previewPayType === 'HOURLY' && <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#d97706', borderBottom: '1px solid #e2e8f0' }}>근무시간(h)</th>}
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>단가</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#16a34a', borderBottom: '1px solid #e2e8f0' }}>예상 지급액</th>
                    </tr></thead>
                    <tbody>
                      {preview.map(r => (
                        <tr key={r.rider_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.rider_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_rides}건</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.total_fare).toLocaleString()}원</td>
                          {previewPayType === 'HOURLY' && (
                            <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                              <input type="number" step="0.5" min="0" value={riderHours[r.rider_id] || ''} onChange={e => setRiderHours(h => ({ ...h, [r.rider_id]: e.target.value }))} placeholder="0" style={{ width: 70, padding: '6px 8px', borderRadius: 6, border: '2px solid #fde68a', fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
                            </td>
                          )}
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                            {previewPayType === 'HOURLY' && `${Number(r.hourly_rate).toLocaleString()}원/h`}
                            {previewPayType === 'PER_RIDE' && `${Number(r.per_ride_rate).toLocaleString()}원/건`}
                            {previewPayType === 'COMMISSION' && `수수료 ${r.commission_pct}%`}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{calcPayout(r).toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={previewPayType === 'HOURLY' ? 5 : 4} style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>총 예상 지급액</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#16a34a' }}>{preview.reduce((s, r) => s + calcPayout(r), 0).toLocaleString()}원</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setGenModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleGenerate} disabled={loading || preview.length === 0} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: preview.length > 0 ? '#2563eb' : '#cbd5e1', color: 'white', fontSize: 14, fontWeight: 700, cursor: preview.length > 0 ? 'pointer' : 'default' }}>
                {loading ? '생성 중...' : preview.length > 0 ? `${preview.length}명 정산 생성` : '먼저 조회하세요'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기사 단가 수정 모달 */}
      {editRider && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditRider(null)}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 400 }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>개별 단가 설정</div><div style={{ fontSize: 14, color: '#2563eb', fontWeight: 700, marginBottom: 16 }}>{editRider.name}</div><div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', fontSize: 12, color: '#64748b' }}>비워두면 업체 기본값 적용</div>{[{ k: 'hourly_rate', label: '시급 (원)' }, { k: 'per_ride_rate', label: '건당 단가 (원)' }, { k: 'commission_pct', label: '수수료율 (%)' }, { k: 'memo', label: '비고' }].map(f => (<div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input type={f.k === 'memo' ? 'text' : 'number'} step={f.k === 'commission_pct' ? '0.1' : '1'} value={riderForm[f.k]} onChange={e => setRiderForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder="기본값 사용" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>))}<div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button onClick={() => setEditRider(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleSaveRider} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '저장'}</button></div></div></div>)}
    </div>
  );
}
