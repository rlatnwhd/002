import assert from 'node:assert/strict'
import { searchPlaces } from '../src/placeSearch.js'

let addressStatus = 'OK', placeStatus = 'OK', keywordCalls = 0
const maps = { services: {
  Status: { OK: 'OK', ZERO_RESULT: 'ZERO' },
  Geocoder: class { addressSearch(text, callback) {
    assert.equal(text, '검색어')
    callback([{ address_name: '주소', road_address: { address_name: '도로명주소' }, x: '127.2', y: '37.5' }], addressStatus)
  } },
  Places: class { keywordSearch(text, callback) {
    keywordCalls += 1
    callback([{ place_name: '시설', road_address_name: '', address_name: '지번주소', x: '129.1', y: '35.2' }], placeStatus)
  } },
} }
assert.deepEqual(await searchPlaces('   ', maps), [])
assert.deepEqual(await searchPlaces(' 검색어 ', maps), [{ name: '주소', address: '도로명주소', lng: 127.2, lat: 37.5 }])
assert.equal(keywordCalls, 0)
addressStatus = 'ZERO'
assert.deepEqual(await searchPlaces('검색어', maps), [{ name: '시설', address: '지번주소', lng: 129.1, lat: 35.2 }])
placeStatus = 'ZERO'
assert.deepEqual(await searchPlaces('검색어', maps), [])
placeStatus = 'ERROR'
await assert.rejects(searchPlaces('검색어', maps))
console.log('PASS: address search, place-name fallback, coordinates, empty results, API errors')
