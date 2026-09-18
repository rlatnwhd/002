import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileSources, parseFacilities, decodeCsv } from '../src/fileFacilities.js'
import { nearest, nearbyTiles, distance } from '../src/nearby.js'
import { regionalRecords, runLimited, institutionCodes } from '../src/nearbyData.js'

const root = new URL('../data/', import.meta.url)
const index = JSON.parse(await readFile(new URL('nearby/index.json', root)))
const centers = [{ lat: 35.15255, lng: 128.99145 }, { lat: 37.5665, lng: 126.978 }, { lat: 36.5, lng: 127.25 }]
let originalBytes = 0
const bytesByCenter = centers.map(() => Buffer.byteLength(JSON.stringify(index)))
for (const source of fileSources) {
  const file = new URL(source.file, root)
  originalBytes += (await stat(file)).size
  const all = parseFacilities(decodeCsv(await readFile(file)), source).places
  assert.ok(all.every(place => !Object.keys(place.info).some(key => key.includes('기준일'))))
  for (const [i, center] of centers.entries()) {
    const tiles = nearbyTiles(center).filter(key => index.tiles[key]?.sources.includes(source.id))
    const loaded = []
    for (const key of tiles) {
      const bytes = await readFile(new URL(`nearby/${index.version}/${source.id}/${key}.json`, root))
      bytesByCenter[i] += bytes.length
      loaded.push(...JSON.parse(bytes))
    }
    assert.deepEqual(nearest(loaded, center).map(place => place.id), nearest(all, center).map(place => place.id))
    assert.ok(nearest(loaded, center).every(place => distance(center, place) <= 3000))
  }
}
centers.forEach((center, i) => console.log(`${center.lat},${center.lng}: local files ${(bytesByCenter[i] / 1024).toFixed(0)} KiB vs original ${(originalBytes / 1024).toFixed(0)} KiB; institution codes ${institutionCodes(index, center).length}`))

const originalFetch = globalThis.fetch
const signal = new AbortController().signal
let calls = 0
globalThis.fetch = async url => {
  assert.equal(url.searchParams.get('insttCode'), '3390000')
  assert.equal(url.searchParams.get('serviceKey'), 'key+value=')
  calls += 1
  return { ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 2, items: { item: { id: calls } } } }) }
}
const pages = []
await regionalRecords({ endpoint: 'test' }, '3390000', 'key%2Bvalue%3D', signal, rows => pages.push(rows.length))
assert.deepEqual(pages, [1, 2])
await regionalRecords({ endpoint: 'test' }, '3390000', 'key', signal, rows => assert.equal(rows.length, 2))
assert.equal(calls, 2)
await assert.rejects(regionalRecords({ endpoint: 'test' }, '', 'key', signal, () => {}))
const aborted = new AbortController(); aborted.abort()
await assert.rejects(regionalRecords({ endpoint: 'uncached' }, '3390000', 'key', aborted.signal, () => {}))
assert.equal(calls, 2)
let active = 0, maximum = 0
await runLimited(Array.from({ length: 10 }, () => async () => { active += 1; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 1)); active -= 1 }), signal, 3)
assert.equal(maximum, 3)
globalThis.fetch = originalFetch
console.log('PASS: tile boundaries, exact nearest results, no dates, regional-only API, pagination, cache, cancellation, concurrency limit')
