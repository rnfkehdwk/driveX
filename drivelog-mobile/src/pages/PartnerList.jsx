import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPartners, createPartner, updatePartner } from '../api/client';

export default function PartnerList() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', contact_person: '', memo: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); fetchPartners().then(r => setList(r.data || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(p => !search || p.name.includes(search) || (p.partner_code || '').includes(search) || (p.phone || '').includes(search));

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', address: '', contact_person: '', memo: '' }); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, phone: p.phone || '', address: p.address || '', contact_person: p.contact_person || '', memo: p.memo || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { alert('업체명은 필수입니다.'); return; }
    setSaving(true);
    try {
      if (editing) await updatePartner(editing.partner_id, form);
      else await createPartner(form);
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
          <span style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>제휴업체 관리</span>
          <button onClick={openNew} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 등록</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명, 코드, 전화번호 검색..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }} />
      </div>

      {/* 목록 */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>총 {filtered.length}개</div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div> :
          filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>제휴업체가 없습니다.</div> :
          filtered.map(p => (
            <div key={p.partner_id} onClick={() => openEdit(p)} style={{
              background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>🤝</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {p.partner_code && <span style={{ color: '#7c3aed', fontWeight: 600, marginRight: 6 }}>{p.partner_code}</span>}
                  {p.phone || ''} {p.contact_person && `· ${p.contact_person}`}
                </div>
                {p.address && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</div>}
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: p.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: p.status === 'ACTIVE' ? '#16a34a' : '#dc2626', flexShrink: 0 }}>{p.status === 'ACTIVE' ? '활성' : '비활성'}</span>
            </div>
          ))
        }
      </div>

      {/* 등록/수정 모달 */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '85vh', background: 'white', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{editing ? '제휴업체 수정' : '제휴업체 등록'}</div>
                <span onClick={() => setModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span>
              </div>
              {editing && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>코드: {editing.partner_code || '-'}</div>}
              {!editing && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 12, color: '#6d28d9' }}>제휴코드는 등록 시 자동생성됩니다</div>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {[{ k: 'name', label: '업체명 *', ph: '녹원갈비' }, { k: 'phone', label: '연락처', ph: '033-671-2325' }, { k: 'address', label: '주소', ph: '강원도 양양군...' }, { k: 'contact_person', label: '담당자', ph: '김담당' }, { k: 'memo', label: '메모', ph: '참고사항' }].map(f => (
                <div key={f.k} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setModal(false)} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '14px 0', borderRadius: 12, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
