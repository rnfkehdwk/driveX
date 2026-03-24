import { useState, useEffect } from 'react';
import { fetchCompanies, createCompany, updateCompany, approveCompany, suspendCompany, fetchBillingPlans, changeCompanyPlan, fetchCompanyPlanHistory } from '../api/client';

function useSortable() {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const toggle = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const icon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const sort = (arr) => { if (!sortKey) return arr; return [...arr].sort((a, b) => { let va = a[sortKey], vb = b[sortKey]; if (va == null) va = ''; if (vb == null) vb = ''; return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko'); }); };
  return { toggle, icon, sort };
}

export default function Companies() {
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ company_code: '', company_name: '', ceo_name: '', phone: '', email: '', address: '', business_number: '', license_type: 'MONTHLY', plan_id: '1' });
  const [saving, setSaving] = useState(false);
  const [planModal, setPlanModal] = useState(null); // 요금제 변경 대상 업체
  const [planForm, setPlanForm] = useState({ plan_id: '', reason: '' });
  const [planHistory, setPlanHistory] = useState([]);
  const { toggle, icon, sort } = useSortable();

  const load = () => {
    fetchCompanies({ q: search || undefined, status: filterStatus || undefined }).then(r => setList(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); fetchBillingPlans({ active_only: 'true' }).then(r => setPlans(r.data || [])).catch(() => {}); }, [search, filterStatus]);

  const openNew = () => { setEditing(null); setForm({ company_code: '', company_name: '', ceo_name: '', phone: '', email: '', address: '', business_number: '', license_type: 'MONTHLY', plan_id: '1' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ company_code: c.company_code, company_name: c.company_name, ceo_name: c.ceo_name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', business_number: c.business_number || '', license_type: c.license_type || 'MONTHLY', plan_id: String(c.plan_id || 1) }); setModal(true); };

  const openPlanChange = (c) => {
    setPlanModal(c);
    setPlanForm({ plan_id: String(c.plan_id || 1), reason: '' });
    fetchCompanyPlanHistory(c.company_id).then(r => setPlanHistory(r.data || [])).catch(() => setPlanHistory([]));
  };

  const handleSave = async () => {
    if (!form.company_name) { alert('업체명은 필수입니다.'); return; }
    setSaving(true);
    try {
      if (editing) { const { company_code, plan_id, ...body } = form; await updateCompany(editing.company_id, body); }
      else { if (!form.company_code) { alert('업체코드는 필수입니다.'); setSaving(false); return; } await createCompany(form); }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const handlePlanChange = async () => {
    if (!planForm.plan_id) { alert('요금제를 선택하세요.'); return; }
    try {
      const res = await changeCompanyPlan(planModal.company_id, planForm);
      alert(res.message);
      setPlanModal(null); load();
    } catch (err) { alert(err.response?.data?.error || '요금제 변경 실패'); }
  };

  const handleApprove = async (id) => { if (!confirm('승인?')) return; try { await approveCompany(id); load(); } catch { alert('실패'); } };
  const handleSuspend = async (id) => { if (!confirm('정지?')) return; try { await suspendCompany(id); load(); } catch { alert('실패'); } };

  const statusColors = { ACTIVE: { bg: '#f0fdf4', color: '#16a34a' }, PENDING: { bg: '#fffbeb', color: '#d97706' }, SUSPENDED: { bg: '#fef2f2', color: '#dc2626' } };
  const statusLabel = { ACTIVE: '활성', PENDING: '승인대기', SUSPENDED: '정지', DELETED: '삭제' };

  const headers = [
    { key: null, label: '업체코드' }, { key: 'company_name', label: '업체명' }, { key: null, label: '요금제' }, { key: 'ceo_name', label: '대표' },
    { key: null, label: '연락처' }, { key: null, label: '기사수' }, { key: null, label: '월운행' },
    { key: null, label: '상태' }, { key: null, label: '관리' },
  ];
  const sorted = sort(list);

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: '전체', value: list.length, color: '#1e293b' },
          { label: '활성', value: list.filter(c => c.status === 'ACTIVE').length, color: '#16a34a' },
          { label: '승인대기', value: list.filter(c => c.status === 'PENDING').length, color: '#d97706' },
          { label: '정지', value: list.filter(c => c.status === 'SUSPENDED').length, color: '#dc2626' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명, 코드, 대표 검색..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 240 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="">전체 상태</option><option value="PENDING">승인대기</option><option value="ACTIVE">활성</option><option value="SUSPENDED">정지</option>
          </select>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#0f172a', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 업체 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h, i) => (
                <th key={i} onClick={() => h.key && toggle(h.key)} style={{ padding: '11px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: h.key ? 'pointer' : 'default', userSelect: 'none' }}>
                  {h.label}{h.key ? icon(h.key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.company_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '11px 10px', fontWeight: 600, color: '#2563eb' }}>{c.company_code}</td>
                <td style={{ padding: '11px 10px', fontWeight: 600 }}>{c.company_name}</td>
                <td style={{ padding: '11px 10px' }}>
                  <span onClick={() => openPlanChange(c)} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#7c3aed', cursor: 'pointer', border: '1px solid #ddd6fe' }}>
                    {c.plan_name || '미설정'} ✎
                  </span>
                </td>
                <td style={{ padding: '11px 10px' }}>{c.ceo_name || '-'}</td>
                <td style={{ padding: '11px 10px', color: '#64748b' }}>{c.phone || '-'}</td>
                <td style={{ padding: '11px 10px', textAlign: 'center' }}>{c.rider_count || 0}</td>
                <td style={{ padding: '11px 10px', textAlign: 'center' }}>{c.monthly_rides || 0}</td>
                <td style={{ padding: '11px 10px' }}><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, ...(statusColors[c.status] || {}) }}>{statusLabel[c.status] || c.status}</span></td>
                <td style={{ padding: '11px 10px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(c)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>
                    {c.status === 'PENDING' && <button onClick={() => handleApprove(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>}
                    {c.status === 'ACTIVE' && <button onClick={() => handleSuspend(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>정지</button>}
                    {c.status === 'SUSPENDED' && <button onClick={() => handleApprove(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>재활성</button>}
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>업체가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 업체 등록/수정 모달 */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '업체 정보 수정' : '업체 등록'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[{ k: 'company_code', label: editing ? '업체코드' : '업체코드 *', ph: 'YANGYANG01', disabled: !!editing }, { k: 'company_name', label: '업체명 *', ph: '양양대리' }, { k: 'ceo_name', label: '대표명', ph: '김사장' }, { k: 'phone', label: '연락처', ph: '033-672-0000' }, { k: 'email', label: '이메일', ph: 'yang@drivelog.co.kr' }, { k: 'business_number', label: '사업자번호', ph: '123-45-67890' }].map(f => (
                <div key={f.k}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} disabled={f.disabled} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: f.disabled ? '#f1f5f9' : 'white' }} /></div>
              ))}
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>주소</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="업체 주소" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
              {!editing && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>요금제</label>
                  <select value={form.plan_id} onChange={e => setForm(p => ({ ...p, plan_id: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                    {plans.map(p => <option key={p.plan_id} value={p.plan_id}>{p.plan_name} ({Number(p.base_fee).toLocaleString()}원/월 + 기사당 {Number(p.per_rider_fee).toLocaleString()}원)</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#0f172a', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 요금제 변경 모달 */}
      {planModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setPlanModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 500, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>요금제 변경</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>{planModal.company_name} ({planModal.company_code})</div>

            {/* 현재 요금제 */}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>현재 요금제</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{planModal.plan_name || '미설정'}</div>
            </div>

            {/* 변경할 요금제 선택 */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>변경할 요금제</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {plans.map(p => {
                  const isCurrent = String(p.plan_id) === String(planModal.plan_id);
                  const isSelected = String(p.plan_id) === planForm.plan_id;
                  const isUpgrade = p.plan_id > (planModal.plan_id || 0);
                  return (
                    <div key={p.plan_id} onClick={() => !isCurrent && setPlanForm(f => ({ ...f, plan_id: String(p.plan_id) }))}
                      style={{ padding: '14px 16px', borderRadius: 12, border: isSelected ? '2px solid #7c3aed' : isCurrent ? '2px solid #e2e8f0' : '1.5px solid #f1f5f9', background: isCurrent ? '#f8fafc' : isSelected ? '#faf5ff' : 'white', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                            {p.plan_name}
                            {isCurrent && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>(현재)</span>}
                            {!isCurrent && isUpgrade && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#dbeafe', color: '#2563eb' }}>업그레이드</span>}
                            {!isCurrent && !isUpgrade && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>다운그레이드</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>기본 {Number(p.base_fee).toLocaleString()}원 + 기사당 {Number(p.per_rider_fee).toLocaleString()}원 (무료 {p.free_riders}명)</div>
                        </div>
                        {isSelected && !isCurrent && <span style={{ fontSize: 18, color: '#7c3aed' }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 변경 사유 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>변경 사유 (선택)</label>
              <input value={planForm.reason} onChange={e => setPlanForm(f => ({ ...f, reason: e.target.value }))} placeholder="예) 기사 수 증가로 업그레이드" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>

            {/* 변경 이력 */}
            {planHistory.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>변경 이력</div>
                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                  {planHistory.map((h, i) => (
                    <div key={h.id} style={{ padding: '8px 12px', borderBottom: i < planHistory.length - 1 ? '1px solid #f8fafc' : 'none', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span><span style={{ color: '#94a3b8' }}>{h.old_plan_name || '-'}</span> → <span style={{ fontWeight: 600, color: '#7c3aed' }}>{h.new_plan_name}</span></span>
                        <span style={{ color: '#94a3b8' }}>{h.changed_at?.slice(0, 10)}</span>
                      </div>
                      {h.reason && <div style={{ color: '#94a3b8', marginTop: 2 }}>{h.reason}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPlanModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handlePlanChange} disabled={String(planForm.plan_id) === String(planModal.plan_id)} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: String(planForm.plan_id) === String(planModal.plan_id) ? 0.5 : 1 }}>요금제 변경</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
