import { nearbyTiles, nearest } from './nearby.js'

const jsonCache = new Map()
const apiCache = new Map()

async function jsonFile(path, signal) {
  if (jsonCache.has(path)) return jsonCache.get(path)
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, { signal })
  if (!response.ok) throw new Error('주변 시설 파일을 읽지 못했습니다.')
  const data = await response.json()
  jsonCache.set(path, data)
  return data
}

export async function localIndex(signal) {
  return jsonFile('nearby/index.json', signal)
}

export function institutionCodes(index, origin) {
  return [...new Set(nearbyTiles(origin).flatMap(key => index.tiles[key]?.codes ?? []))]
}

export async function localPlaces(source, origin, index, signal, userPosition = origin) {
  const keys = nearbyTiles(origin).filter(key => index.tiles[key]?.sources.includes(source.id))
  const groups = await Promise.all(keys.map(key => jsonFile(`nearby/${index.version}/${source.id}/${key}.json`, signal)))
  return nearest(groups.flat(), origin, 100, userPosition)
}

export async function regionalRecords(source, code, serviceKey, signal, onPage) {
  if (!/^\d{7}$/.test(code)) throw new Error('주변 지역을 확인하지 못했습니다.')
  if (!serviceKey) throw new Error('공공데이터 인증키가 없습니다.')
  const cacheKey = `${source.endpoint}:${code}`
  if (apiCache.has(cacheKey)) { onPage(apiCache.get(cacheKey)); return }
  let key = serviceKey.trim()
  try { key = decodeURIComponent(key) } catch { /* Decoded key. */ }
  const records = []
  let total = Infinity
  for (let page = 1; records.length < total; page += 1) {
    signal.throwIfAborted()
    const url = new URL(`https://api.data.go.kr/openapi/${source.endpoint}`)
    url.search = new URLSearchParams({ serviceKey: key, insttCode: code, pageNo: String(page), numOfRows: '1000', type: 'json' })
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) })
    if (!response.ok) throw new Error('주변 시설 서버에 연결하지 못했습니다.')
    const payload = await response.json()
    const data = payload.response ?? payload
    const resultCode = String(data.header?.resultCode ?? '')
    if (resultCode === '03') break
    if (!['0', '00'].includes(resultCode)) throw new Error(`조회 오류 (${resultCode || '응답 오류'})`)
    if (!data.body) throw new Error('응답에 시설 정보가 없습니다.')
    const item = data.body.items?.item ?? []
    const rows = Array.isArray(item) ? item : [item]
    total = Number(data.body.totalCount ?? records.length + rows.length)
    if (!Number.isFinite(total) || total < 0 || (!rows.length && records.length < total)) throw new Error('시설 응답이 불완전합니다.')
    records.push(...rows)
    onPage(records)
    if (!rows.length) break
  }
  apiCache.set(cacheKey, records)
}

export async function runLimited(tasks, signal, concurrency = 4) {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (cursor < tasks.length && !signal.aborted) {
      const task = tasks[cursor++]
      await task()
    }
  }))
}
