import { useState, useEffect, useRef } from 'react';

const KAKAO_REST_KEY = '5bfc2766bfe2836aab70ff613c8c05be';

async function searchKeyword(query, lng, lat) {
  const params = new URLSearchParams({ query, size: 15 });
  if (lng && lat) {
    params.set('x', lng);
    params.set('y', lat);
    params.set('sort', 'distance');
    params.set('radius', '20000'); // 20km 우선
  }
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

async function searchKeywordFallback(query) {
  const params = new URLSearchParams({ query, size: 15 });
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

async function searchAddress(query) {
  const params = new URLSearchParams({ query, size: 15 });
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
  });
  return res.json();
}

function formatDistance(meters) {
  const m = Number(meters);
  if (!m || isNaN(m)) return '';
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// 입력어와 실제 관련 있는 결과만 통과
function matchesQuery(item, query) {
  if (!query) return true;
  const tokens = query.trim().split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) {
    const q = query.trim();
    if (q.length === 0) return true;
    return (item.name && item.name.includes(q)) || (item.address && item.address.includes(q));
  }
  return tokens.every(tok => {
    return (item.name && item.name.includes(tok)) || (item.address && item.address.includes(tok));
  });
}

// 이전에 성공한 검색 좌표를 sessionStorage에 캐시 (다음 모달 열 때 fallback)
const LAST_COORD_KEY = 'addrSearchLastCoord';
function loadLastCoord() {
  try {
    const raw = sessionStorage.getItem(LAST_COORD_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (typeof obj.lat === 'number' && typeof obj.lng === 'number') return obj;
  } catch {}
  return null;
}
function saveLastCoord(lat, lng) {
  try { sessionStorage.setItem(LAST_COORD_KEY, JSON.stringify({ lat, lng, t: Date.now() })); } catch {}
}

// 회사 좌표를 localStorage의 user 객체에서 읽음 (로그인 시 저장됨)
function loadCompanyCoord() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u.company_lat && u.company_lng) {
      return { lat: parseFloat(u.company_lat), lng: parseFloat(u.company_lng) };
    }
  } catch {}
  return null;
}

export default function AddressSearchModal({ onSelect, onClose, title = '주소 검색', currentLat, currentLng }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('keyword');

  // 검색 기준 좌표 우선순위: GPS 자동 → props → sessionStorage 캐시 → 회사 좌표 (localStorage)
  const cached = loadLastCoord();
  const companyCoord = loadCompanyCoord();
  const initialLat = currentLat || cached?.lat || companyCoord?.lat || null;
  const initialLng = currentLng || cached?.lng || companyCoord?.lng || null;
  const [searchLat, setSearchLat] = useState(initialLat);
  const [searchLng, setSearchLng] = useState(initialLng);
  const [coordSource, setCoordSource] = useState(
    currentLat ? 'props' : (cached ? 'cache' : (companyCoord ? 'company' : 'none'))
  );

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // 모달 마운트 시 자동 GPS 1회 (silent)
  // 성공 시 최우선 기준으로 사용
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchLat(pos.coords.latitude);
        setSearchLng(pos.coords.longitude);
        setCoordSource('gps');
        // GPS 좌표도 캐시에 저장 (다음 세션에서 재사용)
        saveLastCoord(pos.coords.latitude, pos.coords.longitude);
      },
      () => { /* GPS 거부 — props 또는 캐시 fallback 사용 */ },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === 'keyword') {
          let data = null;
          if (searchLat && searchLng) {
            data = await searchKeyword(query, searchLng, searchLat);
            if (!data.documents || data.documents.length === 0) {
              data = await searchKeywordFallback(query);
            }
          } else {
            data = await searchKeywordFallback(query);
          }
          let mapped = (data.documents || []).map(d => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            detail: d.category_group_name || '',
            distance: d.distance ? formatDistance(d.distance) : '',
            lat: parseFloat(d.y), lng: parseFloat(d.x),
          }));
          const filtered = mapped.filter(r => matchesQuery(r, query));
          setResults(filtered.length > 0 ? filtered : mapped);
        } else {
          const data = await searchAddress(query);
          setResults((data.documents || []).map(d => ({
            name: d.road_address?.address_name || d.address?.address_name || d.address_name,
            address: d.road_address?.address_name || d.address_name,
            detail: d.road_address ? '도로명' : '지번',
            distance: '',
            lat: parseFloat(d.y), lng: parseFloat(d.x),
          })));
        }
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query, tab, searchLat, searchLng]);

  const hasLocationContext = !!(searchLat && searchLng);

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
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'keyword' ? '장소명, 상호명 검색 (예: 양우내안애)' : '도로명 또는 지번 주소 입력'}
              style={{ width: '100%', padding: '12px 40px 12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {query && <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: 16, color: '#94a3b8', cursor: 'pointer' }}>✕</button>}
          </div>
          {tab === 'keyword' && (
            <div style={{ fontSize: 11, color: hasLocationContext ? '#16a34a' : '#cbd5e1', marginBottom: 10, paddingLeft: 4 }}>
              {hasLocationContext
                ? `📡 가까운 순으로 정렬 (${coordSource === 'gps' ? 'GPS' : coordSource === 'props' ? '출발지' : coordSource === 'company' ? '회사 위치' : '이전 검색 위치'})`
                : '⚠️ 위치 정보 없음 — 지명 + 장소명으로 검색하세요 (예: "양양 양우내안애")'}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', minHeight: 160, maxHeight: '50vh' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>검색 중...</div>}
          {!loading && results.length === 0 && query && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div><div style={{ fontSize: 13 }}>검색 결과가 없습니다</div></div>}
          {!loading && results.length === 0 && !query && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 28, marginBottom: 8 }}>📍</div><div style={{ fontSize: 13 }}>검색어를 입력하세요</div></div>}
          {results.map((r, i) => (
            <div key={i} onClick={() => {
              if (r.lat && r.lng) saveLastCoord(r.lat, r.lng);
              onSelect(r);
            }} style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 6, border: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    {r.distance && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                        {r.distance}
                      </span>
                    )}
                  </div>
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
