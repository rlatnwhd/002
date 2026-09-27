import assert from 'node:assert/strict'
import { FOCUS_ZOOM_LEVEL, focusMap } from '../src/mapNavigation.js'

const target = { lat: 35.1, lng: 129.1 }
let level = 6, center
const map = { getLevel: () => level, setCenter: point => { center = point }, setLevel: next => { level = next } }
focusMap(map, target)
assert.equal(center, target)
assert.equal(level, FOCUS_ZOOM_LEVEL)
focusMap(map, target)
focusMap(map, target)
assert.equal(level, FOCUS_ZOOM_LEVEL)
level = 1
focusMap(map, target)
assert.equal(level, FOCUS_ZOOM_LEVEL)
console.log('PASS: fixed focus zoom, repeated clicks, reset from closer zoom')
