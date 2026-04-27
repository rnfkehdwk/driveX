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
      {/* (전체 원본은 git f39834b... 또는 이번 세션 이전 상태로 복원 가능) */}
      {/* 백업 목적: 픽커 추가 전 상태 식별 */}
    </div>
  );
}
