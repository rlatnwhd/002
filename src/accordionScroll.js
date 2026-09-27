// Wait for both the previously opened row and the new row to finish changing height.
export function scrollSelectedFacility(row) {
  const list = row?.closest('.place-items')
  if (!list) return () => {}
  let cancelled = false, frame = null, timer = null
  list.scrollTo({ top: list.scrollTop, behavior: 'instant' })

  const scroll = () => {
    if (cancelled || !row.isConnected || !row.classList.contains('is-expanded')) return
    const rowTop = list.scrollTop + row.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientTop
    const bottom = Math.max(0, list.scrollHeight - list.clientHeight)
    // Always scroll. Near the end of the list, use its final bottom instead of skipping.
    const top = Math.min(Math.max(0, rowTop - 8), bottom)
    list.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  frame = requestAnimationFrame(() => {
    // Flush styles so getAnimations includes transitions started by this selection.
    row.getBoundingClientRect()
    const panels = [...list.querySelectorAll('.facility-accordion')]
    if (panels.every(panel => typeof panel.getAnimations === 'function')) {
      const animations = panels.flatMap(panel => panel.getAnimations())
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (!cancelled) frame = requestAnimationFrame(scroll)
      })
    } else timer = setTimeout(scroll, 320)
  })
  return () => {
    cancelled = true
    if (frame !== null) cancelAnimationFrame(frame)
    clearTimeout(timer)
    list.scrollTo({ top: list.scrollTop, behavior: 'instant' })
  }
}
