import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, fetchCompanies, fetchMasterCount, fetchRiderLimit, issueTempPassword } from '../api/client';

function useSortable() {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const toggle = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const icon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const sort = (arr) => { if (!sortKey) return arr; return [...arr].sort((a, b) => { let va = a[sortKey], vb = b[sortKey]; if (va == null) va = ''; if (vb == null) vb = ''; if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va; return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko'); }); };
  return { toggle, icon, sort };
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', email: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' });
  const [saving, setSaving] = useState(false);
  const [masterCount, setMasterCount] = useState({ count: 0, max: 3 });
  const [riderLimit, setRiderLimit] = useState({ current: 0, max: 0, free_riders: 0, plan_name: '-' });
  const [tempPwResult, setTempPwResult] = useState(null);
  const [issuingFor, setIssuingFor] = useState(null);
  const { toggle, icon, sort } = useSortable();

  // [BACKUP] 2026-04-29 20:30 - 원본
  // 이후 작업: PUT /api/users/:id에 login_id 추가, 수정 모달에 로그인ID 입력란 추가
  // (백업 본은 원본 그대로 보존)
}
