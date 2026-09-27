import assert from 'node:assert/strict'
import { createMarkerSelection, SELECTION_DURATION, SELECTED_SCALE } from '../src/markerSelection.js'

let serial = 0, selected = 0, released = 0, image
const frames = new Map()
globalThis.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial }
globalThis.cancelAnimationFrame = id => frames.delete(id)
const flush = now => { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(now)) }
const maps = {
  Size: class { constructor(width, height) { this.width = width; this.height = height } },
  Point: class { constructor(x, y) { this.x = x; this.y = y } },
  MarkerImage: class { constructor(url, size, options) { Object.assign(this, { url, size, options }) } },
}
const controller = createMarkerSelection({ setImage: value => { image = value } }, 'pin.png', maps, { onSelect: () => { selected += 1 }, onRelease: () => { released += 1 } })
controller.setSelected(true)
assert.equal(selected, 1)
flush(performance.now() + SELECTION_DURATION / 2)
assert.ok(image.size.width > 48 && image.size.width < 48 * SELECTED_SCALE)
assert.ok(Math.abs(image.options.offset.y / image.size.height - 62 / 64) < 1e-10)
flush(performance.now() + SELECTION_DURATION + 1)
assert.equal(image.size.width, 48 * SELECTED_SCALE)
controller.setSelected(false)
assert.equal(released, 0)
flush(performance.now() + SELECTION_DURATION + 1)
assert.equal(image.size.width, 48)
assert.equal(released, 1)
controller.setSelected(true)
controller.setSelected(false)
controller.setSelected(true)
flush(performance.now() + SELECTION_DURATION + 1)
assert.equal(image.size.width, 48 * SELECTED_SCALE)
assert.equal(released, 1)
controller.setSelected(false)
controller.dispose()
assert.equal(frames.size, 0)
assert.equal(released, 1)
console.log('PASS: smooth grow/shrink, fixed pin anchor, delayed cluster return, rapid reselection, animation cleanup')
