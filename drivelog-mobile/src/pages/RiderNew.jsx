import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api/client';

function formatPhone(v) {
  const n = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`;
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}

export default function RiderNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', vehicle_number: '', vehicle_type: '' });
  const [saving, setSaving] = useState(false);
  const up = (k) => (e) => setForm(f => ({ ...f, [k]: k === 'phone' ? formatPhone(e.target.value) : e.target.value }));

  const S = { input: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none', background: '#f8f9fb' } };

  const handleSave = async () => {
    if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
    if (!form.login_id || !form.password) { alert('로그인 ID와 비밀번호는 필수입니다.'); return; }
    setSaving(true);
    try {
      await createUser({ ...form, role: 'RIDER' });
      alert('기사가 등록되었습니다.');
      nav('/');
    } catch (err) { alert(err.response?.data?.error || '등록 실패'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>기사 등록</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {[
            { k: 'name', label: '이름 *', ph: '홍길동', mode: 'text' },
            { k: 'phone', label: '연락처 *', ph: '010-1234-5678', mode: 'tel' },
            { k: 'login_id', label: '로그인 ID *', ph: 'rider_hong', mode: 'text' },
            { k: 'password', label: '비밀번호 *', ph: '비밀번호 (8자 이상)', mode: 'text', type: 'password' },
            { k: 'vehicle_number', label: '차량번호', ph: '서울 12가 3456', mode: 'text' },
            { k: 'vehicle_type', label: '차종', ph: '소나타', mode: 'text' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type || 'text'} style={S.input} inputMode={f.mode === 'tel' ? 'numeric' : undefined} placeholder={f.ph} value={form[f.k]} onChange={up(f.k)} />
            </div>
          ))}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
            fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 8, opacity: saving ? 0.7 : 1,
          }}>{saving ? '등록 중...' : '기사 등록'}</button>
        </div>
      </div>
    </div>
  );
}
