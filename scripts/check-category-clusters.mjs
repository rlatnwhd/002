import assert from 'node:assert/strict'
import { createMarkerClusterer, separateClusterBadges } from '../src/markerClusters.js'
import { categoryMarkers } from '../src/categoryMarkers.js'

const points = Array.from({ length: 7 }, () => ({ x: 200, y: 200 }))
const offsets = separateClusterBadges(points)
for (let i = 0; i < offsets.length; i += 1) {
  for (let j = i + 1; j < offsets.length; j += 1) {
    assert.ok(Math.hypot(offsets[i].dx - offsets[j].dx, offsets[i].dy - offsets[j].dy) >= 58)
  }
}
assert.deepEqual(separateClusterBadges(points), offsets)
assert.ok(separateClusterBadges([{ x: 0, y: 0 }, { x: 200, y: 0 }]).every(point => point.dx === 0 && point.dy === 0))

let scheduled, level = 5, center
globalThis.requestAnimationFrame = fn => { scheduled = fn; return 1 }
globalThis.cancelAnimationFrame = () => { scheduled = null }
const handlers = new Map(), instances = []
const maps = {
  MarkerClusterer: class {
    constructor(options) { this.options = options; this.markers = []; instances.push(this) }
    addMarker(marker) { this.markers.push(marker) }
    clear() { this.markers = [] }
    redraw() {}
  },
  event: {
    addListener(target, event, callback) { if (!handlers.has(target)) handlers.set(target, {}); handlers.get(target)[event] = callback },
    removeListener(target, event) { delete handlers.get(target)[event] },
  },
}
const map = { getProjection: () => ({ containerPointFromCoords: () => ({ x: 200, y: 200 }) }), getLevel: () => level, setLevel: next => { level = next }, setCenter: point => { center = point } }
const types = new WeakMap(), manager = createMarkerClusterer(map, maps, types)
const elements = []
for (const [type, style] of Object.entries(categoryMarkers)) {
  const markers = [{}, {}]
  for (const marker of markers) { types.set(marker, type); manager.addMarker(marker, true) }
  const instance = instances.at(-1)
  assert.deepEqual(instance.markers, markers)
  assert.equal(instance.options.styles[0].background, style.color)
  const element = { style: {} }, actualCenter = { type }
  elements.push(element)
  const cluster = { getSize: () => markers.length, getCenter: () => actualCenter, getClusterMarker: () => ({ getContent: () => element }) }
  handlers.get(instance).clustered([cluster])
  assert.ok(element.title.startsWith(`${type} 2곳`))
  level = 5
  handlers.get(instance).clusterclick(cluster)
  assert.equal(center, actualCenter)
  assert.equal(level, 4)
}
assert.equal(instances.length, 7)
scheduled()
assert.equal(new Set(elements.map(element => element.style.transform)).size, 7)
manager.clear()
assert.ok(instances.every(instance => instance.markers.length === 0))
manager.destroy()
assert.equal(handlers.get(map).idle, undefined)
console.log('PASS: category isolation, seven colors, separate counts, collision offsets, real-center zoom, clearing and listener cleanup')
