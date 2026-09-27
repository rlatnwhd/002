import assert from 'node:assert/strict'
import { scrollSelectedFacility } from '../src/accordionScroll.js'

let nextId = 0
const frames = new Map()
globalThis.requestAnimationFrame = fn => { frames.set(++nextId, fn); return nextId }
globalThis.cancelAnimationFrame = id => frames.delete(id)
globalThis.window = { matchMedia: () => ({ matches: false }) }
const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) }
let finishOld, finishNew, top = 600
const oldAnimation = new Promise(resolve => { finishOld = resolve })
const newAnimation = new Promise(resolve => { finishNew = resolve })
const calls = []
const list = {
  scrollTop: 100, clientTop: 0, scrollHeight: 1400, clientHeight: 400,
  scrollTo: options => calls.push(options),
  getBoundingClientRect: () => ({ top: 100 }),
  querySelectorAll: () => [{ getAnimations: () => [{ finished: oldAnimation }] }, { getAnimations: () => [{ finished: newAnimation }] }],
}
const row = { closest: () => list, isConnected: true, classList: { contains: () => true }, getBoundingClientRect: () => ({ top }) }
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); flush() }
let cleanup = scrollSelectedFacility(row)
flush()
finishNew()
await settle()
assert.equal(calls.length, 1) // Wait for the previous row's collapse too.
top = 350
finishOld()
await settle()
assert.equal(calls.at(-1).top, 342) // Uses new geometry, not the old 600px position.
cleanup()
top = 1300
cleanup = scrollSelectedFacility(row)
flush(); await settle()
assert.equal(calls.at(-1).top, 1000) // End of list, rather than skipping the scroll.
cleanup()
cleanup = scrollSelectedFacility(row)
flush(); cleanup()
const countAfterCancel = calls.length
await settle()
assert.equal(calls.length, countAfterCancel)
console.log('PASS: waits for expand and collapse, measures new selection after layout, scrolls to bottom, cancels stale scrolls')
