import { useState, useEffect } from 'react';
import {
  fetchPaymentTypes, createPaymentType, updatePaymentType, deletePaymentType, fetchCompanies,
  fetchSettlementGroups, createSettlementGroup, updateSettlementGroup, deleteSettlementGroup,
} from '../api/client';

const GROUP_COLORS = ['#d97706', '#0f6e56', '#2563eb', '#7c3aed', '#dc2626', '#0891b2', '#64748b'];

// ─── 정산 그룹 관리 탭 ───
function SettlementGroupsTab({ isMaster, companies }) {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#d97706', sort_order: 0, company_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => fetchSettlementGroups().then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', color: '#d97706', sort_order: list.length + 1, company_id: '' }); setModal(true); };
  const openEdit = (g) => { setEditing(g); setForm({ name: g.name, color: g.color, sort_order: g.sort_order, company_id: g.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { alert('그룹명은 필수입니다.'); return; }
    if (isMaster && !editing && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) { await updateSettlementGroup(editing.group_id, { name: form.name, color: form.color, sort_order: form.sort_order }); }
      else { await createSettlementGroup(form); }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (g) => {
    if (g.payment_type_count > 0) { alert(`이 그룹에 ${g.payment_type_count}개의 결제구분이 연결되어 있습니다. 먼저 해제해주세요.`); return; }
    if (!confirm(`'${g.name}' 그룹을 삭제하시겠습니까?`)) return;
    try { await deleteSettlementGroup(g.group_id); load(); } catch (err) { alert(err.response?.data?.error || '삭제 실패'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>등록 {list.length}개</span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>운임 정산 시 결제구분을 묶는 단위입니다 (예: 기사 보유, 회사 보유)</span>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 정산 그룹 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {(isMaster ? ['소속업체', '그룹명', '색상', '연결된 결제구분', '순서', '관리'] : ['그룹명', '색상', '연결된 결제구분', '순서', '관리']).map(h => (
                <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(g => (
              <tr key={g.group_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && <td style={{ padding: '11px 12px', fontWeight: 600 }}>{g.company_name || '-'}</td>}
                <td style={{ padding: '11px 12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }} />
                    {g.name}
                  </span>
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: g.color + '20', color: g.color, fontFamily: 'monospace' }}>{g.color}</span>
                </td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{g.payment_type_count || 0}개</td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{g.sort_order}</td>
                <td style={{ padding: '11px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(g)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>
                    <button onClick={() => handleDelete(g)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={isMaster ? 6 : 5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>정산 그룹이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '정산 그룹 수정' : '정산 그룹 등록'}</div>
            {isMaster && !editing && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label>
                <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                  <option value="">업체를 선택하세요</option>
                  {companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>그룹명 *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="기사 보유" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>색상</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GROUP_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: form.color === c ? '3px solid #1e293b' : '1px solid #e2e8f0', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>정렬 순서</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 결제구분 관리 탭 ───
function PaymentTypesTab({ isMaster, companies }) {
  const [list, setList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', label: '', sort_order: 0, company_id: '', settlement_group_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchPaymentTypes().then(r => setList(r.data || [])).catch(() => {});
    fetchSettlementGroups().then(r => setGroups(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // 등록 모달에서 선택한 업체에 맞춰 그룹 필터링
  const filteredGroups = isMaster && form.company_id
    ? groups.filter(g => g.company_id === parseInt(form.company_id))
    : isMaster ? groups : groups;

  const openNew = () => { setEditing(null); setForm({ code: '', label: '', sort_order: list.length + 1, company_id: '', settlement_group_id: '' }); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ code: p.code, label: p.label, sort_order: p.sort_order, company_id: p.company_id || '', settlement_group_id: p.settlement_group_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.code || !form.label) { alert('코드와 표시명은 필수입니다.'); return; }
    if (isMaster && !editing && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        label: form.label,
        sort_order: form.sort_order,
        settlement_group_id: form.settlement_group_id || null,
      };
      if (editing) {
        await updatePaymentType(editing.payment_type_id, body);
      } else {
        await createPaymentType({ ...form, settlement_group_id: form.settlement_group_id || null });
      }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 결제구분을 삭제하시겠습니까?')) return;
    try { await deletePaymentType(id); load(); } catch { alert('삭제 실패'); }
  };

  const handleToggle = async (p) => {
    try { await updatePaymentType(p.payment_type_id, { is_active: !p.is_active }); load(); } catch { alert('변경 실패'); }
  };

  const headers = isMaster
    ? ['소속업체', '코드', '표시명', '정산 그룹', '순서', '상태', '관리']
    : ['코드', '표시명', '정산 그룹', '순서', '상태', '관리'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>등록 {list.length}개</span>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#0891b2', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 결제구분 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map(h => (
                <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.payment_type_id} style={{ borderBottom: '1px solid #f8fafc', opacity: p.is_active ? 1 : 0.5 }}>
                {isMaster && <td style={{ padding: '11px 12px', fontWeight: 600 }}>{p.company_name || '-'}</td>}
                <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: '#0891b2', fontWeight: 600 }}>{p.code}</td>
                <td style={{ padding: '11px 12px', fontWeight: 600 }}>{p.label}</td>
                <td style={{ padding: '11px 12px' }}>
                  {p.settlement_group_name ? (
                    <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: (p.settlement_group_color || '#94a3b8') + '20', color: p.settlement_group_color || '#94a3b8' }}>
                      {p.settlement_group_name}
                    </span>
                  ) : (
                    <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#94a3b8' }}>미분류</span>
                  )}
                </td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{p.sort_order}</td>
                <td style={{ padding: '11px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.is_active ? '#f0fdf4' : '#f8fafc', color: p.is_active ? '#16a34a' : '#94a3b8' }}>{p.is_active ? '활성' : '비활성'}</span>
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>
                    <button onClick={() => handleToggle(p)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: p.is_active ? '#d97706' : '#16a34a' }}>{p.is_active ? '비활성' : '활성'}</button>
                    <button onClick={() => handleDelete(p.payment_type_id)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>결제구분이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '결제구분 수정' : '결제구분 등록'}</div>
            {isMaster && !editing && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label>
                <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value, settlement_group_id: '' }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                  <option value="">업체를 선택하세요</option>
                  {companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>코드 * (영문 대문자)</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} placeholder="CASH" disabled={!!editing} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'monospace', background: editing ? '#f1f5f9' : 'white' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>표시명 *</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="현금" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>정산 그룹</label>
              <select value={form.settlement_group_id} onChange={e => setForm(p => ({ ...p, settlement_group_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                <option value="">미분류</option>
                {filteredGroups.map(g => (<option key={g.group_id} value={g.group_id}>{g.name}</option>))}
              </select>
              {filteredGroups.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>등록된 정산 그룹이 없습니다. 정산 그룹 탭에서 먼저 등록해주세요.</div>}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>정렬 순서</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#0891b2', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 ───
export default function PaymentTypes() {
  const [tab, setTab] = useState('payment');
  const [companies, setCompanies] = useState([]);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  useEffect(() => { if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {}); }, []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('payment')} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          border: tab === 'payment' ? '2px solid #0891b2' : '1px solid #e2e8f0',
          background: tab === 'payment' ? '#0891b2' : 'white', color: tab === 'payment' ? 'white' : '#64748b',
        }}>💳 결제구분 관리</button>
        <button onClick={() => setTab('groups')} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          border: tab === 'groups' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
          background: tab === 'groups' ? '#7c3aed' : 'white', color: tab === 'groups' ? 'white' : '#64748b',
        }}>🗂️ 정산 그룹</button>
      </div>

      {tab === 'payment' ? <PaymentTypesTab isMaster={isMaster} companies={companies} /> : <SettlementGroupsTab isMaster={isMaster} companies={companies} />}
    </div>
  );
}
