import { useEffect, useRef, useState } from 'react';

export default function KakaoMiniMap({ startLat, startLng, endLat, endLng, height = 250 }) {
  const mapRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);

  const hasStart = startLat && startLng;
  const hasEnd = endLat && endLng;

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      if (window.kakao.maps.LatLng) { setSdkReady(true); return; }
      window.kakao.maps.load(() => setSdkReady(true));
    } else {
      const iv = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(iv);
          if (window.kakao.maps.LatLng) { setSdkReady(true); }
          else { window.kakao.maps.load(() => setSdkReady(true)); }
        }
      }, 300);
      return () => clearInterval(iv);
    }
  }, []);

  useEffect(() => {
    if (!sdkReady || (!hasStart && !hasEnd) || !mapRef.current) return;

    const kakao = window.kakao;
    let centerLat, centerLng, level;

    if (hasStart && hasEnd) {
      centerLat = (startLat + endLat) / 2;
      centerLng = (startLng + endLng) / 2;
      const dist = Math.sqrt(Math.pow(startLat - endLat, 2) + Math.pow(startLng - endLng, 2));
      if (dist < 0.005) level = 4;
      else if (dist < 0.01) level = 5;
      else if (dist < 0.03) level = 7;
      else if (dist < 0.1) level = 9;
      else level = 11;
    } else if (hasStart) {
      centerLat = startLat; centerLng = startLng; level = 3;
    } else {
      centerLat = endLat; centerLng = endLng; level = 3;
    }

    mapRef.current.innerHTML = '';
    const center = new kakao.maps.LatLng(centerLat, centerLng);
    const markers = [];
    if (hasStart) markers.push({ position: new kakao.maps.LatLng(startLat, startLng), text: '출발' });
    if (hasEnd) markers.push({ position: new kakao.maps.LatLng(endLat, endLng), text: '도착' });

    new kakao.maps.StaticMap(mapRef.current, { center, level, marker: markers });
  }, [sdkReady, startLat, startLng, endLat, endLng]);

  if (!hasStart && !hasEnd) return null;

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #e2e8f0', marginTop: 10, marginBottom: 14, background: '#f8fafc' }}>
      <div ref={mapRef} style={{ width: '100%', height }} />
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
        {hasStart && <span>🔵 출발 {Number(startLat).toFixed(4)}, {Number(startLng).toFixed(4)}</span>}
        {hasEnd && <span>🔴 도착 {Number(endLat).toFixed(4)}, {Number(endLng).toFixed(4)}</span>}
      </div>
    </div>
  );
}
