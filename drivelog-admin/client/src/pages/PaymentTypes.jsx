import { useState, useEffect } from 'react';
import { fetchPaymentTypes, createPaymentType, updatePaymentType, deletePaymentType, fetchCompanies } from '../api/client';

export default function PaymentTypes() {
  const [list, setList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', label: '', sort_order: 0, company_id: '' });
  const [saving, setSaving] = useState(false);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const load = () => fetchPaymentTypes().then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {}); }, []);

  const openNew = () => { setEditing(null); setForm({ code: '', label: '', sort_order: list.length + 1, company_id: '' }); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ code: p.code, label: p.label, sort_order: p.sort_order, company_id: p.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.code || !form.label) { alert('코드와 표시명은 필수입니다.'); return; }
    if (isMaster && !editing && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) { await updatePaymentType(editing.payment_type_id, { label: form.label, sort_order: form.sort_order }); }
      else { await createPaymentType(form); }
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
    ? ['소속업체', '코드', '표시명', '순서', '상태', '관리']
    : ['코드', '표시명', '순서', '상태', '관리'];

  return (
    <div className="fade-in">
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
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '결제구분 수정' : '결제구분 등록'}</div>
            {isMaster && !editing && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label>
                <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                  <option value="">업체를 선택하세요</option>
                  {companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>코드 * (영문 대문자)</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} placeholder="CASH" disabled={!!editing}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'monospace', background: editing ? '#f1f5f9' : 'white' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>표시명 *</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="현금"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>정렬 순서</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} placeholder="1"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
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
