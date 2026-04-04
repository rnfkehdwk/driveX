import { useState, useEffect, useRef } from 'react';

const KAKAO_REST_KEY = '5bfc2766bfe2836aab70ff613c8c05be';

async function searchKeyword(query, lng, lat) {
  const params = new URLSearchParams({ query, size: 10 });
  if (lng && lat) { params.set('x', lng); params.set('y', lat); params.set('sort', 'distance'); }
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

async function searchAddress(query) {
  const params = new URLSearchParams({ query, size: 10 });
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

export default function AddressSearchModal({ onSelect, onClose, title = '주소 검색' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('keyword');
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === 'keyword') {
          const data = await searchKeyword(query);
          setResults((data.documents || []).map(d => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            detail: d.category_group_name || '',
            lat: parseFloat(d.y), lng: parseFloat(d.x),
          })));
        } else {
          const data = await searchAddress(query);
          setResults((data.documents || []).map(d => ({
            name: d.road_address?.address_name || d.address?.address_name || d.address_name,
            address: d.road_address?.address_name || d.address_name,
            detail: d.road_address ? '도로명' : '지번',
            lat: parseFloat(d.y), lng: parseFloat(d.x),
          })));
        }
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query, tab]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>📍 {title}</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <button onClick={() => { setTab('keyword'); setResults([]); }} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: tab === 'keyword' ? '#2563eb' : 'white', color: tab === 'keyword' ? 'white' : '#64748b' }}>🔍 장소 검색</button>
            <button onClick={() => { setTab('address'); setResults([]); }} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: tab === 'address' ? '#2563eb' : 'white', color: tab === 'address' ? 'white' : '#64748b' }}>🏠 주소 검색</button>
          </div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'keyword' ? '장소명, 상호명 검색 (예: 양양터미널)' : '도로명 또는 지번 주소 입력'}
              style={{ width: '100%', padding: '12px 40px 12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {query && <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: 16, color: '#94a3b8', cursor: 'pointer' }}>✕</button>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', minHeight: 160, maxHeight: '50vh' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>검색 중...</div>}
          {!loading && results.length === 0 && query && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div><div style={{ fontSize: 13 }}>검색 결과가 없습니다</div></div>}
          {!loading && results.length === 0 && !query && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 28, marginBottom: 8 }}>📍</div><div style={{ fontSize: 13 }}>검색어를 입력하세요</div></div>}
          {results.map((r, i) => (
            <div key={i} onClick={() => onSelect(r)} style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 6, border: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.address}{r.detail && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {r.detail}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
