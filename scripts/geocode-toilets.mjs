import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const input = path.join(root, 'data', '공중화장실정보.csv')
const output = path.join(root, 'data', '공중화장실정보_좌표.csv')
const failures = path.join(root, 'data', '공중화장실정보_좌표_실패.csv')
const checkpoint = path.join(root, 'data', '.toilet-geocode-progress.json')
const key = process.env.KAKAO_REST_API_KEY
if (!key) throw new Error('KAKAO_REST_API_KEY 환경변수가 필요합니다.')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const escapeCsv = (value = '') => `"${String(value).replaceAll('"', '""')}"`
function parseCsv(line) { const out = []; let value = ''; let quote = false; for (let i = 0; i < line.length; i += 1) { const c = line[i]; if (c === '"') { if (quote && line[i + 1] === '"') { value += '"'; i += 1 } else quote = !quote } else if (c === ',' && !quote) { out.push(value); value = '' } else value += c } return [...out, value] }

const csvText = new TextDecoder('euc-kr').decode(await fs.readFile(input))
const [headerLine, ...rawRows] = csvText.split(/\r?\n/)
const header = parseCsv(headerLine).map((column) => column.replace(/^\uFEFF/, '').trim())
const rows = rawRows.filter(Boolean).map(parseCsv)
const roadIndex = header.indexOf('소재지도로명주소'); const lotIndex = header.indexOf('소재지지번주소')
if (roadIndex < 0 || lotIndex < 0) throw new Error('주소 컬럼을 찾지 못했습니다.')

let progress = { completed: 0, cache: {} }
if (existsSync(checkpoint)) progress = JSON.parse(await fs.readFile(checkpoint, 'utf8'))
const addressCache = progress.cache
const uniqueAddresses = [...new Set(rows.map((row) => row[roadIndex]?.trim() || row[lotIndex]?.trim()).filter(Boolean))]

for (let index = progress.completed; index < uniqueAddresses.length; index += 1) {
  const address = uniqueAddresses[index]
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`
    const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
    if (response.status === 429) throw new Error('호출 한도에 도달했습니다. 잠시 후 다시 실행하세요.')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const json = await response.json(); const result = json.documents?.[0]
    addressCache[address] = result ? { lat: result.y, lng: result.x } : null
  } catch (error) { await fs.writeFile(checkpoint, JSON.stringify({ completed: index, cache: addressCache }), 'utf8'); throw error }
  if (index % 50 === 0) { progress = { completed: index + 1, cache: addressCache }; await fs.writeFile(checkpoint, JSON.stringify(progress), 'utf8'); console.log(`${index + 1}/${uniqueAddresses.length}`) }
  await wait(120)
}

const enriched = [header.join(','), ...rows.map((row) => { const address = row[roadIndex]?.trim() || row[lotIndex]?.trim(); const point = addressCache[address]; return [...row, point?.lat || '', point?.lng || ''].map(escapeCsv).join(',') })]
const failed = [header.join(','), ...rows.filter((row) => !addressCache[row[roadIndex]?.trim() || row[lotIndex]?.trim()]).map((row) => row.map(escapeCsv).join(','))]
await fs.writeFile(output, [enriched[0].replace(/^/, '\uFEFF').replace(/$/, ',위도,경도'), ...enriched.slice(1)].join('\n'), 'utf8')
await fs.writeFile(failures, failed.join('\n'), 'utf8')
await fs.rm(checkpoint, { force: true })
console.log(`완료: ${output}`)
