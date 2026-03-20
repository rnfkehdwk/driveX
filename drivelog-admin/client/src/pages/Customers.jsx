import { useState, useEffect } from 'react';
import { fetchCustomers, createCustomer, fetchCompanies } from '../api/client';
import api from '../api/client';

function formatPhone(v) {
  const n = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`;
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}

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

export default function Customers() {
  const [list, setList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', memo: '', company_id: '' });
  const [saving, setSaving] = useState(false);
  const { toggle, icon, sort } = useSortable();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const load = () => fetchCustomers({ q: search || undefined }).then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {}); }, [search]);

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', address: '', memo: '', company_id: '' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', address: c.address || '', memo: c.memo || '', company_id: c.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { alert('고객명은 필수입니다.'); return; }
    if (isMaster && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, phone: form.phone, address: form.address, memo: form.memo };
        if (isMaster) body.company_id = form.company_id;
        await api.put(`/customers/${editing.customer_id}`, body);
      } else { await createCustomer(form); }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const totalMileage = list.reduce((s, c) => s + (c.mileage_balance || 0), 0);

  const headers = isMaster
    ? [{ key: 'company_name', label: '업체명' }, { key: null, label: '고객코드' }, { key: 'name', label: '고객명' }, { key: null, label: '연락처' }, { key: null, label: '주소' }, { key: null, label: '마일리지' }, { key: null, label: '메모' }, { key: null, label: '등록일' }, { key: null, label: '관리' }]
    : [{ key: null, label: '고객코드' }, { key: 'name', label: '고객명' }, { key: null, label: '연락처' }, { key: null, label: '주소' }, { key: null, label: '마일리지' }, { key: null, label: '메모' }, { key: null, label: '등록일' }, { key: null, label: '관리' }];

  const sorted = sort(list);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 코드, 전화번호 검색..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 260 }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {list.length}명 | 마일리지 합계: {totalMileage.toLocaleString()}</span>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#d97706', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 고객 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h, i) => (
                <th key={i} onClick={() => h.key && toggle(h.key)} style={{ padding: '11px 12px', textAlign: h.label === '마일리지' ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: h.key ? 'pointer' : 'default', userSelect: 'none' }}>
                  {h.label}{h.key ? icon(h.key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.customer_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && <td style={{ padding: '11px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.company_name || '-'}</td>}
                <td style={{ padding: '11px 12px', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>{c.customer_code || '-'}</td>
                <td style={{ padding: '11px 12px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '11px 12px' }}>{c.phone || '-'}</td>
                <td style={{ padding: '11px 12px', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '-'}</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{(c.mileage_balance || 0).toLocaleString()}</td>
                <td style={{ padding: '11px 12px', color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.memo || '-'}</td>
                <td style={{ padding: '11px 12px', fontSize: 12, color: '#94a3b8' }}>{c.created_at ? c.created_at.slice(0, 10) : '-'}</td>
                <td style={{ padding: '11px 12px' }}><button onClick={() => openEdit(c)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button></td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '고객 정보 수정' : '신규 고객 등록'}</div>
            {isMaster && (<div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label><select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}><option value="">업체를 선택하세요</option>{companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}</select></div>)}
            {editing && (<div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>고객코드</label><input value={editing.customer_code || '자동생성 전'} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f1f5f9', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }} /></div>)}
            {!editing && (<div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>고객코드는 등록 시 자동생성됩니다 (예: YANG-001)</div>)}
            {[{ k: 'name', label: '고객명 *', ph: '홍길동' }, { k: 'phone', label: '연락처', ph: '010-1234-5678', format: true }, { k: 'address', label: '주소', ph: '기본 주소' }, { k: 'memo', label: '메모', ph: '관리자 메모' }].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: f.format ? formatPhone(e.target.value) : e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#d97706', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
