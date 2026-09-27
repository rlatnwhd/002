import { categoryMarkers } from './categoryMarkers.js'
import { zoomIntoCluster } from './mapNavigation.js'

const BADGE_SPACING = 58

// Offsets affect badge artwork only, never geographic coordinates.
export function separateClusterBadges(points) {
  const placed = []
  return points.map(point => {
    let candidate
    for (let ring = 0; !candidate; ring += 1) {
      const slots = ring === 0 ? 1 : ring * 8
      for (let slot = 0; slot < slots; slot += 1) {
        const angle = slot / slots * Math.PI * 2
        const dx = Math.round(Math.cos(angle) * ring * BADGE_SPACING)
        const dy = Math.round(Math.sin(angle) * ring * BADGE_SPACING)
        if (placed.every(other => Math.hypot(point.x + dx - other.x, point.y + dy - other.y) >= BADGE_SPACING)) {
          candidate = { ...point, dx, dy }
          break
        }
      }
    }
    placed.push({ x: point.x + candidate.dx, y: point.y + candidate.dy })
    return candidate
  })
}

export function createMarkerClusterer(map, maps, markerTypes) {
  const byType = new Map(), visible = new Map()
  let frame = null
  const layout = () => {
    frame = null
    const projection = map.getProjection(), badges = []
    // Stable category order keeps repeated redraws consistent.
    for (const type of Object.keys(categoryMarkers)) {
      for (const cluster of visible.get(type) ?? []) {
        if (cluster.getSize() < 2) continue
        const element = cluster.getClusterMarker().getContent()
        if (!element?.style) continue
        const point = projection.containerPointFromCoords(cluster.getCenter())
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
        badges.push({ x: point.x, y: point.y, element })
      }
    }
    for (const { element, dx, dy } of separateClusterBadges(badges)) element.style.transform = `translate(${dx}px, ${dy}px)`
  }
  const scheduleLayout = () => {
    if (frame === null) frame = requestAnimationFrame(layout)
  }
  maps.event.addListener(map, 'idle', scheduleLayout)
  const getClusterer = type => {
    if (byType.has(type)) return byType.get(type)
    const clusterer = new maps.MarkerClusterer({
      map, gridSize: 64, averageCenter: true, minLevel: 2, minClusterSize: 2, disableClickZoom: true,
      styles: [{ width: '52px', height: '52px', borderRadius: '50%', background: categoryMarkers[type].color,
        color: ['공원', '자전거보관소'].includes(type) ? '#172014' : '#fff',
        border: '3px solid #fff', boxShadow: '0 3px 12px #0004', fontSize: '17px', fontWeight: '800',
        textAlign: 'center', lineHeight: '46px', boxSizing: 'border-box', cursor: 'pointer' }],
    })
    maps.event.addListener(clusterer, 'clusterclick', cluster => zoomIntoCluster(map, cluster.getCenter()))
    maps.event.addListener(clusterer, 'clustered', clusters => {
      visible.set(type, clusters)
      for (const cluster of clusters) {
        if (cluster.getSize() < 2) continue
        const element = cluster.getClusterMarker().getContent()
        if (!element?.style) continue
        element.title = `${type} ${cluster.getSize()}곳 · 클릭하여 확대`
        element.style.transform = ''
      }
      scheduleLayout()
    })
    byType.set(type, clusterer)
    return clusterer
  }
  const clear = () => {
    byType.forEach(clusterer => clusterer.clear())
    visible.clear()
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }
  return {
    addMarker(marker, noDraw = false) {
      const type = markerTypes.get(marker)
      if (categoryMarkers[type]) getClusterer(type).addMarker(marker, noDraw)
    },
    removeMarker(marker, noDraw = false) {
      byType.get(markerTypes.get(marker))?.removeMarker(marker, noDraw)
    },
    redraw() { byType.forEach(clusterer => clusterer.redraw()) },
    clear,
    destroy() { clear(); maps.event.removeListener(map, 'idle', scheduleLayout) },
  }
}
