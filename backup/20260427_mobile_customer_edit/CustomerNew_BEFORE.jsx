import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer } from '../api/client';

function formatPhone(v) {
  const n = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`;
  return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}

export default function CustomerNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ customer_code: '', name: '', phone: '', address: '', memo: '' });
  const [saving, setSaving] = useState(false);
  const up = (k) => (e) => setForm(f => ({ ...f, [k]: k === 'phone' ? formatPhone(e.target.value) : e.target.value }));

  const S = { input: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none', background: '#f8f9fb' } };

  const handleSave = async () => {
    if (!form.name) { alert('고객명을 입력하세요.'); return; }
    setSaving(true);
    try {
      await createCustomer(form);
      alert('고객이 등록되었습니다.');
      nav('/');
    } catch (err) { alert(err.response?.data?.error || '등록 실패'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>고객 등록</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {[
            { k: 'name', label: '고객명 *', ph: '홍길동', mode: 'text' },
            { k: 'customer_code', label: '고객코드', ph: '내부 식별코드 (선택)', mode: 'text' },
            { k: 'phone', label: '연락처', ph: '010-1234-5678', mode: 'tel' },
            { k: 'address', label: '주소', ph: '기본 주소', mode: 'text' },
            { k: 'memo', label: '메모', ph: '관리자 메모', mode: 'text' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input style={S.input} inputMode={f.mode === 'tel' ? 'numeric' : undefined} placeholder={f.ph} value={form[f.k]} onChange={up(f.k)} />
            </div>
          ))}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#2563eb', color: 'white',
            fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 8, opacity: saving ? 0.7 : 1,
          }}>{saving ? '등록 중...' : '고객 등록'}</button>
        </div>
      </div>
    </div>
  );
}
