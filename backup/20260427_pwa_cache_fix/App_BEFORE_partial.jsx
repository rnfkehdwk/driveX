import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import RideNew from './pages/RideNew';
import RideList from './pages/RideList';
import RiderNew from './pages/RiderNew';
import CustomerNew from './pages/CustomerNew';
import CustomerList from './pages/CustomerList';
import PartnerList from './pages/PartnerList';
import CallList from './pages/CallList';
import Settings from './pages/Settings';
import { createInquiry } from './api/client';
import { enablePushNotifications } from './utils/pushSubscribe';

function InquiryModal({ user, onClose }) {
  const [form, setForm] = useState({ inquiry_type: 'RENEWAL', title: '서비스 갱신 요청', content: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const handleSubmit = async () => { if (!form.title) { alert('제목을 입력해주세요.'); return; } setSaving(true); try { await createInquiry(form); setDone(true); } catch (err) { alert(err.response?.data?.error || '문의 등록 실패'); } finally { setSaving(false); } };
  if (done) return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ background: 'white', borderRadius: 20, padding: '32px 24px', maxWidth: 360, width: '100%', textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>문의가 접수되었습니다</div><div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>관리자가 확인 후 연락드리겠습니다.</div><button onClick={onClose} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>확인</button></div></div>);
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: '28px 22px', maxWidth: 380, width: '100%' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📩 갱신 문의</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>문의 유형</label><select value={form.inquiry_type} onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: 'white' }}><option value="RENEWAL">서비스 갱신</option><option value="UPGRADE">요금제 업그레이드</option><option value="DOWNGRADE">요금제 다운그레이드</option><option value="GENERAL">일반 문의</option><option value="BUG">버그 신고</option></select></div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>제목</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div><div style={{ marginBottom: 20 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>상세 내용</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="문의 내용을 입력해주세요..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} /></div><div style={{ display: 'flex', gap: 8 }}><button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '전송 중...' : '문의 보내기'}</button></div></div></div>);
}

// (생략 - BlockedPage, ExpiringBanner, Guard, App 등은 변경 없음)
// 이 백업 파일은 UpdateToast 컴포넌트가 추가되기 전 상태를 식별하기 위함
// 전체 원본은 git에서 0588ce5 commit 시점으로 복원 가능
