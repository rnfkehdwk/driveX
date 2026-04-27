import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers, updateCustomer } from '../api/client';

function formatPhone(v) {
  const n = (v || '').replace(/[^0-9]/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`;
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}

// Contact Picker API 정규화 (한국 폰 번호 포맷)
function normalizeKoreanPhone(rawTel) {
  if (!rawTel) return '';
  let digits = rawTel.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+82')) digits = '0' + digits.slice(3);
  digits = digits.replace(/[^0-9]/g, '');
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return digits;
}

// 고객 수정 모달 (SA 전용)
function EditCustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    memo: customer.memo || '',
  });
  const [saving, setSaving] = useState(false);

  const supportsContactPicker = typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const up = (k) => (e) => setForm(f => ({ ...f, [k]: k === 'phone' ? formatPhone(e.target.value) : e.target.value }));

  const handlePickContact = async () => {
    if (!supportsContactPicker) return;
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!contacts || contacts.length === 0) return;
      const c = contacts[0];
      const pickedTel = normalizeKoreanPhone((c.tel && c.tel[0]) || '');
      if (pickedTel) setForm(f => ({ ...f, phone: pickedTel }));
    } catch (err) {
      console.warn('Contact picker failed:', err);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('고객명을 입력하세요.'); return; }
    setSaving(true);
    try {
      await updateCustomer(customer.customer_id, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        memo: form.memo.trim() || null,
      });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const is = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8f9fb', boxSizing: 'border-box', fontFamily: 'inherit' };
  const ls = { fontSize: 12, fontWeight: 700, color: '#6b7280' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>👤 고객 정보 수정</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {customer.customer_code && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>고객코드: <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>{customer.customer_code}</span></div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ ...ls, display: 'block', marginBottom: 6 }}>고객명 *</label>
          <input value={form.name} onChange={up('name')} placeholder="홍길동" style={is} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={ls}>연락처</label>
            {supportsContactPicker && (
              <button
                type="button"
                onClick={handlePickContact}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >📞 연락처에서 가져오기</button>
            )}
          </div>
          <input value={form.phone} onChange={up('phone')} placeholder="010-1234-5678" inputMode="numeric" style={is} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ ...ls, display: 'block', marginBottom: 6 }}>주소</label>
          <input value={form.address} onChange={up('address')} placeholder="기본 주소" style={is} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...ls, display: 'block', marginBottom: 6 }}>메모</label>
          <textarea value={form.memo} onChange={up('memo')} placeholder="관리자 메모" rows={2} style={{ ...is, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: saving ? '#94a3b8' : '#2563eb', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerList() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  // 현재 사용자 권한 확인 (수정은 SA/MASTER만 가능 — 백엔드 PUT /customers/:id 정책과 일치)
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MASTER';

  const load = () => {
    setLoading(true);
    fetchCustomers({ q: search || undefined }).then(r => setList(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); alert('고객 정보가 수정되었습니다.'); }}
        />
      )}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>고객 조회</span>
          {canEdit && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>탭하여 수정</span>}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 코드, 전화번호 검색..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>검색 결과 {list.length}명</div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : list.map(c => (
          <div
            key={c.customer_id}
            onClick={canEdit ? () => setEditing(c) : undefined}
            style={{
              background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14,
              cursor: canEdit ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#92400e', flexShrink: 0 }}>
              {c.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {c.customer_code && <span>{c.customer_code} · </span>}
                {c.phone || '연락처 없음'}
              </div>
              {c.address && <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{(c.mileage_balance || 0).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>마일리지</div>
            </div>
            {canEdit && <div style={{ color: '#cbd5e1', fontSize: 18, flexShrink: 0 }}>›</div>}
          </div>
        ))}
        {!loading && list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객이 없습니다.</div>}
      </div>
    </div>
  );
}
