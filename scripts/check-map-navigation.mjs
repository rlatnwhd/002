import assert from 'node:assert/strict'
import { FOCUS_ZOOM_LEVEL, focusMap } from '../src/mapNavigation.js'
import { createMarkerClusterer } from '../src/markerClusters.js'

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
const handlers = {}
const maps = { MarkerClusterer: class { constructor(options) { this.options = options } }, event: { addListener: (_, event, handler) => { handlers[event] = handler } } }
const a = {}, b = {}, c = {}
const types = new WeakMap([[a, '화장실'], [b, '화장실'], [c, '공원']])
const clusterer = createMarkerClusterer(map, maps, types)
assert.equal(clusterer.options.disableClickZoom, true)
assert.equal(clusterer.options.minLevel, 2)
const element = { style: {} }
const cluster = { getCenter: () => target, getSize: () => 3, getMarkers: () => [a, b, c], getClusterMarker: () => ({ getContent: () => element }) }
handlers.clustered([cluster])
assert.ok(element.style.background.includes('#0074FF 0deg 240deg'))
assert.ok(element.style.background.includes('#3DC800 240deg 360deg'))
assert.ok(element.title.includes('화장실 2'))
level = 4
handlers.clusterclick(cluster)
assert.equal(level, 3)
assert.equal(center, target)
level = 1
handlers.clusterclick(cluster)
assert.equal(level, 1)
console.log('PASS: fixed focus zoom, repeated clicks, reset from closer zoom, independent cluster zoom, category counts and colors')
