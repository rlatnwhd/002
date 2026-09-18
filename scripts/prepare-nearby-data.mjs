import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileSources, decodeCsv, parseFacilities } from '../src/fileFacilities.js'
import { tileKey } from '../src/nearby.js'

export async function prepareNearbyData() {
  const root = new URL('../data/', import.meta.url)
  const inputs = await Promise.all(fileSources.map(async source => {
    const file = new URL(source.file, root)
    const meta = await stat(file)
    return { source, file, stamp: `${meta.size}:${meta.mtimeMs}` }
  }))
  const parser = await readFile(new URL('../src/fileFacilities.js', import.meta.url))
  const version = createHash('sha256').update(parser).update(JSON.stringify(inputs.map(input => input.stamp))).update('nearby-v1').digest('hex').slice(0, 16)
  const indexFile = new URL('nearby/index.json', root)
  try { if (JSON.parse(await readFile(indexFile, 'utf8')).version === version) return } catch { /* First generation. */ }
  const manifest = { version, tiles: {}, totals: {} }
  for (const { source, file } of inputs) {
    const result = parseFacilities(decodeCsv(await readFile(file)), source)
    manifest.totals[source.id] = { total: result.total, omitted: result.omitted }
    const groups = new Map()
    for (const place of result.places) {
      const key = tileKey(place.lat, place.lng)
      const entry = manifest.tiles[key] ??= { sources: [], codes: [] }
      if (!entry.sources.includes(source.id)) entry.sources.push(source.id)
      if (/^\d{7}$/.test(place.institutionCode) && !entry.codes.includes(place.institutionCode)) entry.codes.push(place.institutionCode)
      const { institutionCode: _code, ...display } = place
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(display)
    }
    const directory = new URL(`nearby/${version}/${source.id}/`, root)
    await mkdir(directory, { recursive: true })
    for (const [key, places] of groups) await writeFile(new URL(`${key}.json`, directory), JSON.stringify(places))
    console.log(`[nearby] ${source.type}: ${result.places.length} places / ${groups.size} tiles`)
  }
  await writeFile(indexFile, JSON.stringify(manifest))
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) await prepareNearbyData()
