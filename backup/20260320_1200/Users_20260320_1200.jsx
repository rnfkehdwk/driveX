import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser } from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '' });
  const [saving, setSaving] = useState(false);

  const load = () => fetchUsers({ q: search || undefined }).then(r => setUsers(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, [search]);

  const openNew = () => { setEditing(null); setForm({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '' }); setModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ login_id: u.login_id, name: u.name, phone: u.phone, role: u.role, vehicle_number: u.vehicle_number || '', vehicle_type: u.vehicle_type || '', password: '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, phone: form.phone, vehicle_number: form.vehicle_number, vehicle_type: form.vehicle_type };
        await updateUser(editing.user_id, body);
      } else {
        if (!form.login_id || !form.password) { alert('ID와 비밀번호는 필수입니다.'); setSaving(false); return; }
        await createUser(form);
      }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (u) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`${u.name}님을 ${next === 'ACTIVE' ? '활성화' : '정지'} 하시겠습니까?`)) return;
    await updateUser(u.user_id, { status: next }); load();
  };

  // 현재 로그인 유저 정보
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const roleMap = { MASTER: '마스터', SUPER_ADMIN: '관리자', RIDER: '기사' };
  const statusStyle = (s) => ({
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: s === 'ACTIVE' ? '#f0fdf4' : s === 'SUSPENDED' ? '#fef2f2' : '#f8fafc',
    color: s === 'ACTIVE' ? '#16a34a' : s === 'SUSPENDED' ? '#dc2626' : '#94a3b8',
  });

  const headers = isMaster
    ? ['업체명', '이름', '로그인ID', '역할', '연락처', '차량번호', '상태', '최근로그인', '관리']
    : ['이름', '로그인ID', '역할', '연락처', '차량번호', '상태', '최근로그인', '관리'];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, ID, 연락처 검색..."
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 240 }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {users.length}명</span>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + 기사 등록
        </button>
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
            {users.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && (
                  <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{u.company_name || '-'}</span>
                  </td>
                )}
                <td style={{ padding: '11px 12px', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{u.login_id}</td>
                <td style={{ padding: '11px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>{roleMap[u.role] || u.role}</span></td>
                <td style={{ padding: '11px 12px' }}>{u.phone}</td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{u.vehicle_number || '-'}</td>
                <td style={{ padding: '11px 12px' }}><span style={statusStyle(u.status)}>{u.status}</span></td>
                <td style={{ padding: '11px 12px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{u.last_login_at ? u.last_login_at.slice(0, 16) : '-'}</td>
                <td style={{ padding: '11px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>
                    <button onClick={() => toggleStatus(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: u.status === 'ACTIVE' ? '#dc2626' : '#16a34a' }}>
                      {u.status === 'ACTIVE' ? '정지' : '활성'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '기사 정보 수정' : '신규 기사 등록'}</div>
            {[
              { k: 'name', label: '이름 *', ph: '홍길동' },
              { k: 'phone', label: '연락처 *', ph: '010-1234-5678' },
              ...(!editing ? [{ k: 'login_id', label: '로그인 ID *', ph: 'rider_hong' }, { k: 'password', label: '비밀번호 *', ph: '비밀번호', type: 'password' }] : []),
              { k: 'vehicle_number', label: '차량번호', ph: '서울 12가 3456' },
              { k: 'vehicle_type', label: '차종', ph: '소나타' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '저장 중...' : editing ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
