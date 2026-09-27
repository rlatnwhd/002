export const SELECTION_DURATION = 250
export const SELECTED_SCALE = 1.22

// Animate through the public MarkerImage API; keep the pin tip anchored to its coordinate.
export function createMarkerSelection(marker, imageUrl, maps, { onSelect, onRelease }) {
  let selected = false, scale = 1, frame = null, disposed = false
  const draw = value => {
    scale = value
    marker.setImage(new maps.MarkerImage(imageUrl, new maps.Size(48 * value, 64 * value), { offset: new maps.Point(24 * value, 62 * value) }))
  }
  return {
    setSelected(next) {
      if (disposed || selected === next) return
      selected = next
      if (frame !== null) cancelAnimationFrame(frame)
      if (next) onSelect()
      const startScale = scale, target = next ? SELECTED_SCALE : 1, start = performance.now()
      const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const tick = now => {
        if (disposed) return
        const progress = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - start) / SELECTION_DURATION))
        const eased = progress * progress * (3 - 2 * progress)
        draw(startScale + (target - startScale) * eased)
        if (progress < 1) frame = requestAnimationFrame(tick)
        else { frame = null; if (!selected) onRelease() }
      }
      frame = requestAnimationFrame(tick)
    },
    dispose() { disposed = true; if (frame !== null) cancelAnimationFrame(frame) },
  }
}
