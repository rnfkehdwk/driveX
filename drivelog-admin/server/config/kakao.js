// server/config/kakao.js
// 카카오 로컬 API 헬퍼 (백엔드 전용)
// REST 키를 환경변수 또는 하드코딩 fallback으로 사용

const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY || '5bfc2766bfe2836aab70ff613c8c05be';

/**
 * 주소 문자열을 위도/경도로 변환 (geocoding)
 * 카카오 로컬 검색 API 사용
 *
 * @param {string} address - 한국 주소 (도로명 또는 지번)
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    });
    if (!res.ok) {
      console.warn(`[geocode] kakao address API ${res.status} for "${trimmed}"`);
      return null;
    }
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc || !doc.x || !doc.y) {
      // address 검색이 실패하면 keyword 검색으로 한 번 더 시도 (상호명일 수도 있음)
      return await geocodeKeyword(trimmed);
    }
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch (err) {
    console.error('[geocode] address error:', err.message);
    return null;
  }
}

/**
 * 키워드 검색으로 좌표 변환 (장소명, 상호명 등)
 */
async function geocodeKeyword(query) {
  if (!query) return null;
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query.trim())}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc || !doc.x || !doc.y) return null;
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch (err) {
    console.error('[geocode] keyword error:', err.message);
    return null;
  }
}

module.exports = { geocodeAddress, geocodeKeyword };
