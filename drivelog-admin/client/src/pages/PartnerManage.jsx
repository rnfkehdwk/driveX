import { useState, useEffect } from 'react';
import { fetchPartners, createPartner, updatePartner, fetchCompanies } from '../api/client';

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
      return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko');
    });
  };
  return { toggle, icon, sort };
}

export default function PartnerManage() {
  const [list, setList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', contact_person: '', memo: '', company_id: '' });
  const [saving, setSaving] = useState(false);
  const { toggle, icon, sort } = useSortable();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const load = () => fetchPartners().then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {}); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', address: '', contact_person: '', memo: '', company_id: '' }); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, phone: p.phone || '', address: p.address || '', contact_person: p.contact_person || '', memo: p.memo || '', company_id: p.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { alert('업체명은 필수입니다.'); return; }
    if (isMaster && !editing && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) { await updatePartner(editing.partner_id, { name: form.name, phone: form.phone, address: form.address, contact_person: form.contact_person, memo: form.memo }); }
      else { await createPartner(form); }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const headers = isMaster
    ? [{ key: 'company_name', label: '소속업체' }, { key: null, label: '제휴코드' }, { key: 'name', label: '업체명' }, { key: null, label: '연락처' }, { key: null, label: '주소' }, { key: null, label: '담당자' }, { key: null, label: '메모' }, { key: null, label: '상태' }, { key: null, label: '관리' }]
    : [{ key: null, label: '제휴코드' }, { key: 'name', label: '업체명' }, { key: null, label: '연락처' }, { key: null, label: '주소' }, { key: null, label: '담당자' }, { key: null, label: '메모' }, { key: null, label: '상태' }, { key: null, label: '관리' }];

  const sorted = sort(list);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>등록 업체 {list.length}개</span>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 제휴업체 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h, i) => (
                <th key={i} onClick={() => h.key && toggle(h.key)} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: h.key ? 'pointer' : 'default', userSelect: 'none' }}>
                  {h.label}{h.key ? icon(h.key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr key={p.partner_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && <td style={{ padding: '11px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.company_name || '-'}</td>}
                <td style={{ padding: '11px 12px', color: '#7c3aed', fontWeight: 600, fontFamily: 'monospace' }}>{p.partner_code || '-'}</td>
                <td style={{ padding: '11px 12px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '11px 12px' }}>{p.phone || '-'}</td>
                <td style={{ padding: '11px 12px', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address || '-'}</td>
                <td style={{ padding: '11px 12px' }}>{p.contact_person || '-'}</td>
                <td style={{ padding: '11px 12px', color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.memo || '-'}</td>
                <td style={{ padding: '11px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: p.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>{p.status}</span></td>
                <td style={{ padding: '11px 12px' }}><button onClick={() => openEdit(p)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button></td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>제휴업체가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '제휴업체 수정' : '제휴업체 등록'}</div>
            {isMaster && !editing && (<div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label><select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}><option value="">업체를 선택하세요</option>{companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}</select></div>)}
            {editing && (<div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>제휴코드</label><input value={editing.partner_code || '-'} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f1f5f9', color: '#7c3aed', fontWeight: 600, fontFamily: 'monospace' }} /></div>)}
            {!editing && (<div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 12, color: '#6d28d9' }}>제휴코드는 등록 시 자동생성됩니다 (예: YANG-P001)</div>)}
            {[{ k: 'name', label: '업체명 *', ph: '녹원갈비' }, { k: 'phone', label: '연락처', ph: '033-671-2325' }, { k: 'address', label: '주소', ph: '강원도 양양군...' }, { k: 'contact_person', label: '담당자', ph: '김담당' }, { k: 'memo', label: '메모', ph: '참고사항' }].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
            ))}
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
