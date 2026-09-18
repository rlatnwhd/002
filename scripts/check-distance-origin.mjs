import assert from 'node:assert/strict'
import { nearest, distance } from '../src/nearby.js'

const user = { lat: 37.5, lng: 127 }
const center = { lat: 37.6, lng: 127 }
const places = [
  { id: 'map-center', ...center },
  { id: 'toward-user', lat: 37.59, lng: 127 },
  { id: 'outside-search', ...user },
]
const result = nearest(places, center, 100, user)
assert.deepEqual(result.map(place => place.id), ['toward-user', 'map-center'])
assert.ok(result.every(place => place.meters > 3000))
assert.equal(result[1].meters, distance(user, center))
const moved = nearest(places, { lat: 37.61, lng: 127 }, 100, user)
assert.equal(moved.find(place => place.id === 'map-center').meters, result[1].meters)
assert.equal(nearest(places, center, 1, user)[0].id, 'toward-user')
assert.ok(nearest(places, center, 100, null).every(place => place.meters === null))
assert.equal(nearest(places, user, 100, user)[0].meters, 0)
console.log('PASS: search radius uses map center; distances and sorting use initial user location; moving map preserves distances; missing location never substitutes map distance')
