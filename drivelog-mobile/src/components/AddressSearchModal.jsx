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

async function coord2Address(lng, lat) {
  const res = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

export default function AddressSearchModal({ onSelect, onClose, title = '주소 검색', currentLat, currentLng }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [tab, setTab] = useState('keyword'); // keyword | address
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === 'keyword') {
          const data = await searchKeyword(query, currentLng, currentLat);
          setResults((data.documents || []).map(d => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            detail: d.category_group_name || '',
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
            phone: d.phone || '',
          })));
        } else {
          const data = await searchAddress(query);
          setResults((data.documents || []).map(d => ({
            name: d.road_address?.address_name || d.address?.address_name || d.address_name,
            address: d.road_address?.address_name || d.address_name,
            detail: d.road_address ? '도로명' : '지번',
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
          })));
        }
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query, tab]);

  const handleGPS = () => {
    if (!navigator.geolocation) { alert('GPS를 지원하지 않습니다.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const data = await coord2Address(longitude, latitude);
          const doc = data.documents?.[0];
          const addr = doc?.road_address?.address_name || doc?.address?.address_name || '';
          onSelect({ name: addr, address: addr, lat: latitude, lng: longitude });
        } catch { alert('주소 변환 실패'); }
        finally { setGpsLoading(false); }
      },
      () => { alert('위치를 가져올 수 없습니다.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>📍 {title}</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>

          {/* GPS 버튼 */}
          <button onClick={handleGPS} disabled={gpsLoading} style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid #bfdbfe', background: '#eff6ff',
            color: '#2563eb', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12
          }}>
            {gpsLoading ? '📡 위치 확인 중...' : '📍 현재 위치 사용'}
          </button>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <button onClick={() => { setTab('keyword'); setResults([]); }} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === 'keyword' ? '#2563eb' : 'white', color: tab === 'keyword' ? 'white' : '#64748b'
            }}>🔍 장소 검색</button>
            <button onClick={() => { setTab('address'); setResults([]); }} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === 'address' ? '#2563eb' : 'white', color: tab === 'address' ? 'white' : '#64748b'
            }}>🏠 주소 검색</button>
          </div>

          {/* 검색 입력 */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'keyword' ? '장소명, 상호명 검색 (예: 양양터미널)' : '도로명 또는 지번 주소 입력'}
              style={{ width: '100%', padding: '14px 40px 14px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer'
              }}>✕</button>
            )}
          </div>
        </div>

        {/* 결과 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', minHeight: 200, maxHeight: '50vh' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>검색 중...</div>}

          {!loading && results.length === 0 && query && (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14 }}>검색 결과가 없습니다</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#cbd5e1' }}>
                {tab === 'keyword' ? '장소명이나 상호명으로 검색해보세요' : '도로명 또는 지번 주소를 입력하세요'}
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !query && (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
              <div style={{ fontSize: 14 }}>검색어를 입력하세요</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#cbd5e1' }}>
                또는 "현재 위치 사용" 버튼을 눌러주세요
              </div>
            </div>
          )}

          {results.map((r, i) => (
            <div key={i} onClick={() => onSelect(r)} style={{
              padding: '14px 16px', borderRadius: 14, marginBottom: 6, border: '1px solid #f1f5f9',
              cursor: 'pointer', transition: 'background 0.15s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: tab === 'keyword' ? '#fef3c7' : '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                }}>
                  {tab === 'keyword' ? '📍' : '🏠'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.address}
                    {r.detail && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {r.detail}</span>}
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
