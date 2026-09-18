export const fileSources = [
  { id: 'restroom', type: '화장실', file: 'public_restroom_info.csv', icon: 'W', color: '#8658c9' },
  { id: 'wifi', type: '무료와이파이', file: 'free_Wi-Fi_info.csv', icon: 'Wi', color: '#00838f' },
  { id: 'bicycle', type: '자전거보관소', file: 'bicycle_parking_info.csv', icon: 'B', color: '#a64d79' },
]

export function decodeCsv(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('euc-kr', { fatal: true }).decode(bytes)
  }
}

// Quoted commas, escaped quotes and line breaks inside a field are valid CSV.
export function* csvRows(text) {
  let row = [], field = '', quoted = false
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 }
      else quoted = !quoted
    } else if (!quoted && char === ',') {
      row.push(field); field = ''
    } else if (!quoted && (char === '\r' || char === '\n')) {
      row.push(field)
      if (row.some(value => value.trim())) yield row
      row = []; field = ''
      if (char === '\r' && text[i + 1] === '\n') i += 1
    } else field += char
  }
  if (quoted) throw new Error('CSV 따옴표 형식이 올바르지 않습니다.')
  row.push(field)
  if (row.some(value => value.trim())) yield row
}

const yesNo = value => ({ Y: '있음', N: '없음' })[value.toUpperCase()] ?? value

export function parseFacilities(text, source) {
  const rows = csvRows(text)
  const header = rows.next().value?.map(value => value.trim())
  const nameKey = source.id === 'restroom' ? '화장실명' : source.id === 'wifi' ? '설치장소명' : '자전거보관소명'
  const latKey = source.id === 'restroom' ? '위도' : 'WGS84위도'
  const lngKey = source.id === 'restroom' ? '경도' : 'WGS84경도'
  if (!header || ![nameKey, latKey, lngKey].every(key => header.includes(key))) {
    throw new Error('CSV의 필수 열 또는 인코딩을 확인해주세요.')
  }
  const indexes = Object.fromEntries(header.map((key, i) => [key, i]))
  const places = []
  let total = 0, omitted = 0
  for (const row of rows) {
    total += 1
    const get = key => (row[indexes[key]] ?? '').trim()
    const lat = Number(get(latKey)), lng = Number(get(lngKey))
    if (!(lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132)) { omitted += 1; continue }
    const info = source.id === 'restroom' ? {개방시간: get('개방시간상세') || get('개방시간'), 관리기관: get('관리기관명'), 문의전화: get('전화번호')} : source.id === 'wifi' ? {
      SSID: get('와이파이SSID'), 설치위치: get('설치장소상세'), 시설구분: get('설치시설구분명'),
      제공기관: get('서비스제공사명'), 관리기관: get('관리기관명'), 문의전화: get('관리기관전화번호'),
    } : {
      보관가능대수: get('보관대수') ? `${get('보관대수')}대` : '', 설치형태: get('설치형태'),
      차양막: yesNo(get('차양막설치여부')), 공기주입기: yesNo(get('공기주입기비치여부')),
      공기주입기유형: get('공기주입기유형명'), 수리대: yesNo(get('수리대설치여부')),
      관리기관: get('관리기관명'), 문의전화: get('관리기관전화번호'),
    }
    places.push({
      id: `${source.id}-${total}`, institutionCode: get('개방자치단체코드'), type: source.type, icon: source.icon, color: source.color,
      name: get(nameKey) || source.type,
      address: get('소재지도로명주소') || get('소재지지번주소') || (source.id === 'wifi' ? [get('설치시도명'), get('설치시군구명'), get('설치장소상세')].filter(Boolean).join(' ') : '') || '주소 미제공',
      lat, lng, info: Object.fromEntries(Object.entries(info).filter(([, value]) => value)),
    })
  }
  return { places, total, omitted }
}
