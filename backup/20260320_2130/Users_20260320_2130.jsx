import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, fetchCompanies } from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' });
  const [saving, setSaving] = useState(false);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const load = () => fetchUsers({ q: search || undefined }).then(r => setUsers(r.data || [])).catch(() => {});
  useEffect(() => {
    load();
    if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {});
  }, [search]);

  const openNew = () => {
    setEditing(null);
    setForm({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' });
    setModal(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ login_id: u.login_id, name: u.name, phone: u.phone, role: u.role, vehicle_number: u.vehicle_number || '', vehicle_type: u.vehicle_type || '', password: '', company_id: u.company_id || '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
    if (isMaster && !editing && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
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

  // ... (rest of original file)
}
