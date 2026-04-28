import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUsers, updateUser } from '../api/client';

// 한국 폰 번호 포맷
function formatPhone(v) {
  const n = (v || '').replace(/[^0-9]/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`;
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}

// Contact Picker 정규화
function normalizeKoreanPhone(rawTel) {
  if (!rawTel) return '';
  let digits = rawTel.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+82')) digits = '0' + digits.slice(3);
  digits = digits.replace(/[^0-9]/g, '');
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return digits;
}

// 기사 수정 모달
function EditRiderModal({ rider, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: rider.name || '',
    phone: rider.phone || '',
    email: rider.email || '',
    vehicle_number: rider.vehicle_number || '',
    vehicle_type: rider.vehicle_type || '',
  });
  const [saving, setSaving] = useState(false);

  const supportsContactPicker = typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const up = (k) => (e) => setForm(f => ({ ...f, [k]: k === 'phone' ? formatPhone(e.target.value) : e.target.value }));

  const handlePickContact = async () => {
    if (!supportsContactPicker) {
      alert('이 기능은 Android Chrome에서만 지원됩니다.');
      return;
    }
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
    if (!form.name.trim() || !form.phone.trim()) {
      alert('이름과 연락처는 필수입니다.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      alert('이메일 형식이 올바르지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await updateUser(rider.user_id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        vehicle_number: form.vehicle_number.trim() || null,
        vehicle_type: form.vehicle_type.trim() || null,
      });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const next = rider.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`${rider.name}님을 ${next === 'ACTIVE' ? '활성화' : '정지'} 하시겠습니까?`)) return;
    setSaving(true);
    try {
      await updateUser(rider.user_id, { status: next });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || '상태 변경 실패');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none',
    background: '#f8f9fb', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#6b7280' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>🧑‍✈️ 기사 정보 수정</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}>
          로그인 ID: <strong style={{ fontFamily: 'monospace' }}>{rider.login_id}</strong>
          <span style={{ marginLeft: 10, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: rider.status === 'ACTIVE' ? '#dcfce7' : '#fecaca', color: rider.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>
            {rider.status === 'ACTIVE' ? '활성' : '정지'}
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>이름 *</label>
          <input value={form.name} onChange={up('name')} placeholder="홍길동" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={labelStyle}>연락처 *</label>
            {supportsContactPicker && (
              <button type="button" onClick={handlePickContact} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe',
                background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>📞 연락처에서 가져오기</button>
            )}
          </div>
          <input value={form.phone} onChange={up('phone')} placeholder="010-1234-5678" inputMode="numeric" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>이메일 (선택)</label>
          <input value={form.email} onChange={up('email')} placeholder="rider@example.com" inputMode="email" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>차량번호</label>
          <input value={form.vehicle_number} onChange={up('vehicle_number')} placeholder="서울 12가 3456" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>차종</label>
          <input value={form.vehicle_type} onChange={up('vehicle_type')} placeholder="소나타" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: saving ? '#94a3b8' : '#2563eb', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        <button onClick={handleToggleStatus} disabled={saving} style={{
          width: '100%', padding: 12, borderRadius: 12,
          border: `1.5px solid ${rider.status === 'ACTIVE' ? '#fecaca' : '#bbf7d0'}`,
          background: rider.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4',
          color: rider.status === 'ACTIVE' ? '#dc2626' : '#16a34a',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {rider.status === 'ACTIVE' ? '⛔ 계정 정지' : '✅ 계정 활성화'}
        </button>
      </div>
    </div>
  );
}

export default function RiderList() {
  const nav = useNavigate();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    // RIDER 역할만 필터링 (현재 회사 소속만)
    fetchUsers({ role: 'RIDER', q: search || undefined })
      .then(r => setRiders(r.data || []))
      .catch(() => setRiders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const filtered = riders;
  const activeCount = filtered.filter(r => r.status === 'ACTIVE').length;
  const suspendedCount = filtered.filter(r => r.status === 'SUSPENDED').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {editing && (
        <EditRiderModal
          rider={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); alert('기사 정보가 수정되었습니다.'); }}
        />
      )}

      {/* 헤더 */}
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
          <span style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>기사 조회</span>
          <button onClick={() => nav('/rider/new')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#0891b2', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 신규 등록</button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 로그인ID, 연락처 검색..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>활성 기사</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>{activeCount}명</div>
        </div>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>정지된 계정</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626' }}>{suspendedCount}명</div>
        </div>
      </div>

      {/* 목록 */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, paddingLeft: 4 }}>
          탭하면 수정 가능
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧑‍✈️</div>
            <div style={{ fontSize: 14 }}>{search ? '검색 결과가 없습니다.' : '등록된 기사가 없습니다.'}</div>
          </div>
        ) : (
          filtered.map(r => (
            <div
              key={r.user_id}
              onClick={() => setEditing(r)}
              style={{
                background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                border: `1px solid ${r.status === 'ACTIVE' ? '#f1f5f9' : '#fecaca'}`,
                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                opacity: r.status === 'ACTIVE' ? 1 : 0.6,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: r.status === 'ACTIVE' ? '#ecfeff' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: r.status === 'ACTIVE' ? '#0891b2' : '#94a3b8',
                flexShrink: 0,
              }}>
                {(r.name || '?').charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: r.status === 'ACTIVE' ? '#dcfce7' : '#fecaca',
                    color: r.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                  }}>
                    {r.status === 'ACTIVE' ? '활성' : '정지'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
                  {r.login_id}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {r.phone || '연락처 없음'}
                  {r.vehicle_number && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {r.vehicle_number}</span>}
                </div>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 18, flexShrink: 0 }}>›</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
