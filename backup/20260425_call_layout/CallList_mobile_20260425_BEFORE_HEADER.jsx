import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalls, acceptCall, cancelCall, createCall, fetchCustomers, fetchPartners, fetchPaymentTypes, fetchFrequentAddresses, fetchRiders } from '../api/client';
import AddressSearchModal from '../components/AddressSearchModal';
import KakaoMiniMap from '../components/KakaoMiniMap';

const STATUS_MAP = {
  WAITING: { label: '대기 중', color: '#d97706', bg: '#fffbeb' },
  ASSIGNED: { label: '수락됨', color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2' },
};

// 콜 생성 모달 (SUPER_ADMIN 전용) — 카카오 주소 검색 + 지도 추가
function CreateCallModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ start_address: '', start_detail: '', end_address: '', end_detail: '', customer_id: '', partner_id: '', estimated_fare: '', payment_method: 'CASH', memo: '', assigned_rider_id: '' });
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [payTypes, setPayTypes] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const [showPartList, setShowPartList] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [addrSearch, setAddrSearch] = useState(null); // 'start' | 'end' | null
  const [startCoord, setStartCoord] = useState({ lat: null, lng: null });
  const [endCoord, setEndCoord] = useState({ lat: null, lng: null });
  // 자주 가는 곳 (즐겨찾기 대체)
  const [frequentStart, setFrequentStart] = useState([]);
  const [frequentEnd, setFrequentEnd] = useState([]);
  const [showFreqStart, setShowFreqStart] = useState(false);
  const [showFreqEnd, setShowFreqEnd] = useState(false);
  // 기사 목록 (수동 지명용)
  const [riders, setRiders] = useState([]);

  // 결제구분 + 고객/제휴업체 전체 목록을 모달 열 때 한 번만 로드 (focus만 해도 드롭다운 펼침 가능)
  useEffect(() => {
    fetchPaymentTypes().then(r => setPayTypes(r.data || [])).catch(() => {});
    fetchCustomers({ limit: 200 }).then(r => setCustomers(r.data || [])).catch(() => {});
    fetchPartners({ active_only: 'true', limit: 200 }).then(r => setPartners(r.data || [])).catch(() => {});
    // 자주 가는 곳 로드
    fetchFrequentAddresses({ type: 'start', limit: 15 }).then(r => setFrequentStart(r.data || [])).catch(() => {});
    fetchFrequentAddresses({ type: 'end', limit: 15 }).then(r => setFrequentEnd(r.data || [])).catch(() => {});
    // 기사 목록 (수동 지명)
    fetchRiders().then(r => setRiders(r.data || [])).catch(() => {});
  }, []);

  // 클라이언트 측 필터
  const filteredCust = custSearch
    ? customers.filter(c => c.name?.includes(custSearch) || c.phone?.includes(custSearch) || c.customer_code?.includes(custSearch))
    : customers;
  const filteredPart = partSearch
    ? partners.filter(p => p.name?.includes(partSearch))
    : partners;

  const handleAddrSelect = (result) => {
    if (addrSearch === 'start') {
      setForm(f => ({ ...f, start_address: result.address || result.name }));
      setStartCoord({ lat: result.lat, lng: result.lng });
    } else {
      setForm(f => ({ ...f, end_address: result.address || result.name }));
      setEndCoord({ lat: result.lat, lng: result.lng });
    }
    setAddrSearch(null);
  };

  const handleSubmit = async () => {
    if (!form.start_address.trim()) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, customer_id: selectedCust?.customer_id || null, partner_id: selectedPart?.partner_id || null, estimated_fare: form.estimated_fare ? Number(form.estimated_fare) : null, assigned_rider_id: form.assigned_rider_id || null };
      if (!body.end_address) delete body.end_address;
      const res = await createCall(body);
      alert(res.message || '콜이 생성되었습니다.');
      onCreated();
    } catch (err) { alert(err.response?.data?.error || '콜 생성 실패'); }
    finally { setSaving(false); }
  };

  // ... (생략 — 원본 내용 너무 김. git diff 또는 source control로 복원 권장)
  // 변경 전 구조: 출발지 → 도착지 → 카카오 지도 → 고객 → 제휴업체 → 요금/결제 → 메모 → 기사 지명
  // 변경 후 구조: 고객 → 제휴업체 → 출발지 → 도착지 → 카카오 지도 → 요금/결제 → 메모 → 기사 지명

  return null; // 원본 대체용 placeholder
}
