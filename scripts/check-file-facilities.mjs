import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { csvRows, decodeCsv, fileSources, parseFacilities } from '../src/fileFacilities.js'

assert.deepEqual([...csvRows('\ufeffname,detail\r\n"A,B","line 1\nline ""2"""\r\n')], [
  ['name', 'detail'], ['A,B', 'line 1\nline "2"'],
])
assert.throws(() => [...csvRows('name\n"unclosed')])
assert.equal(decodeCsv(new TextEncoder().encode('한글 UTF-8')), '한글 UTF-8')
assert.equal(decodeCsv(Uint8Array.from([0xc7, 0xd1, 0xb1, 0xdb])), '한글')
assert.throws(() => parseFacilities('<html>missing file</html>', fileSources[0]))
const fixture = '자전거보관소명,WGS84위도,WGS84경도,보관대수,차양막설치여부\n정상,35.1,129.1,0,N\n누락,,129.1,3,Y\n오류,abc,129.1,3,Y\n범위오류,0,0,3,Y'
const sample = parseFacilities(fixture, fileSources.find(source=>source.id==='bicycle'))
assert.equal(sample.places.length, 1)
assert.equal(sample.omitted, 3)
assert.equal(sample.places[0].info.보관가능대수, '0대')
assert.equal(sample.places[0].info.차양막, '없음')

for (const source of fileSources) {
  const bytes = await readFile(new URL(`../data/${source.file}`, import.meta.url))
  const decoded = decodeCsv(bytes)
  assert.ok(!decoded.includes('\ufffd'), `${source.file}: 깨진 문자`)
  const result = parseFacilities(decoded, source)
  assert.ok(result.places.length > 0)
  assert.equal(result.total, result.places.length + result.omitted)
  assert.equal(new Set(result.places.map(place => place.id)).size, result.places.length)
  assert.ok(result.places.every(place => place.type === source.type && Number.isFinite(place.lat) && Number.isFinite(place.lng)))
  if (source.id === 'wifi') {
    assert.equal(result.places[0].name, '종로3가')
    assert.equal(result.places[0].info.SSID, 'SEOUL, SEOUL_Secure')
  } else if (source.id === 'bicycle') {
    assert.equal(result.places[0].name, '재동초등학교 후문')
    assert.equal(result.places[0].info.보관가능대수, '5대')
    assert.ok(result.places[0].address.includes(', 서울재동초등학교'))
  }
  console.log(`${source.type}: 총 ${result.total}, 지도 표시 ${result.places.length}, 좌표 제외 ${result.omitted}`)
}
console.log('PASS: CSV quoting, multiline, encoding, required headers, coordinates, field mapping, unique IDs')
