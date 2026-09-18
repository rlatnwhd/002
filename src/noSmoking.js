const endpoint = 'https://api.data.go.kr/openapi/tn_pubr_public_prhsmk_zn_api'
const cache = new Map()
const value = (v) => String(v ?? '').trim() || '미제공'

export function normalizeNoSmoking(row, index, regionKey) {
  return {
    id: `no-smoking-${regionKey}-${index}`, type: '금연구역', icon: '금', color: '#d34b51',
    name: value(row.prhsmkNm), address: row.rdnmadr || row.lnmadr || '주소 미제공',
    lat: Number(row.latitude), lng: Number(row.longitude),
    info: {
      구분: value(row.prhsmkSe), 금연범위: value(row.prhsmkScopeDesc),
      지정근거: value(row.prhsmkAppnBasis),
      위반과태료: String(row.ffnlg ?? '').trim() && Number.isFinite(Number(row.ffnlg)) ? `${Number(row.ffnlg).toLocaleString('ko-KR')}원` : '미제공',
      신고전화: value(row.phoneNumber), 관리기관: value(row.institutionNm), 데이터기준일: value(row.referenceDate),
    },
  }
}

export async function loadNoSmoking(region, key, signal) {
  if (!key) throw new Error('공공데이터 인증키가 설정되지 않았습니다.')
  const province = region.region_1depth_name
  const district = region.region_2depth_name || ''
  if (!province || (!district && province !== '세종특별자치시')) throw new Error('조회할 시·군·구를 확인하지 못했습니다.')
  const regionKey = `${province} ${district}`.trim()
  if (cache.has(regionKey)) return cache.get(regionKey)
  let decodedKey = key.trim()
  try { decodedKey = decodeURIComponent(decodedKey) } catch { /* Already decoded. */ }
  const records = []
  let total = Infinity
  for (let page = 1; records.length < total; page += 1) {
    const url = new URL(endpoint)
    url.search = new URLSearchParams({serviceKey: decodedKey, pageNo: String(page), numOfRows: '1000', type: 'json', ctprvnNm: province, signguNm: district})
    if (!district) url.searchParams.delete('signguNm')
    let response
    try {
      response = await fetch(url, {signal: AbortSignal.any([signal, AbortSignal.timeout(20000)])})
    } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      throw new Error('금연구역 서버에 연결하지 못했습니다. 다시 검색해주세요.')
    }
    if (!response.ok) throw new Error(`금연구역 조회 실패 (HTTP ${response.status})`)
    let payload
    try { payload = await response.json() } catch { throw new Error('금연구역 응답을 읽지 못했습니다. API 인증 및 이용 상태를 확인해주세요.') }
    const data = payload.response ?? payload
    const code = String(data.header?.resultCode ?? '')
    if (code === '03') break
    if (!['00', '0'].includes(code)) throw new Error(`금연구역 API 오류 (${code || '응답 코드 없음'}). 인증 및 이용 상태를 확인해주세요.`)
    if (!data.body) throw new Error('금연구역 응답에 데이터가 없습니다.')
    const items = data.body.items?.item ?? []
    const rows = Array.isArray(items) ? items : [items]
    total = Number(data.body.totalCount ?? records.length + rows.length)
    if (!Number.isFinite(total) || total < 0) throw new Error('금연구역 데이터 건수가 올바르지 않습니다.')
    if (!rows.length) {
      if (records.length < total) throw new Error('금연구역 데이터를 모두 받지 못했습니다. 다시 검색해주세요.')
      break
    }
    records.push(...rows)
  }
  const places = records.map((row, i) => normalizeNoSmoking(row, i, regionKey))
    .filter(x => x.lat >= 33 && x.lat <= 39 && x.lng >= 124 && x.lng <= 132)
  const result = {places, regionKey, omitted: records.length - places.length}
  cache.set(regionKey, result)
  return result
}
