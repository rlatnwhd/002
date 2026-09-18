import { categoryMarkers } from './categoryMarkers.js'
import { zoomIntoCluster } from './mapNavigation.js'

export function createMarkerClusterer(map, maps, markerTypes) {
  const clusterer = new maps.MarkerClusterer({
    map, gridSize: 64, averageCenter: true, minLevel: 2, minClusterSize: 2,
    disableClickZoom: true,
    styles: [{ width: '52px', height: '52px', borderRadius: '50%', background: '#263c32', color: '#fff',
      border: '3px solid #fff', boxShadow: '0 3px 12px #0004', fontSize: '17px', fontWeight: '800',
      textAlign: 'center', lineHeight: '46px', boxSizing: 'border-box', cursor: 'pointer' }],
  })
  maps.event.addListener(clusterer, 'clusterclick', cluster => zoomIntoCluster(map, cluster.getCenter()))
  maps.event.addListener(clusterer, 'clustered', clusters => {
    for (const cluster of clusters) {
      if (cluster.getSize() < 2) continue
      const element = cluster.getClusterMarker().getContent()
      if (!element?.style) continue
      const counts = new Map()
      for (const marker of cluster.getMarkers()) {
        const type = markerTypes.get(marker)
        if (type) counts.set(type, (counts.get(type) ?? 0) + 1)
      }
      let angle = 0
      const segments = [...counts].map(([type, count]) => {
        const start = angle
        angle += count / cluster.getSize() * 360
        return `${categoryMarkers[type].color} ${start}deg ${angle}deg`
      })
      // The colored outer ring preserves the category mix; the dark center keeps counts legible.
      if (segments.length) element.style.background = `radial-gradient(circle, #263c32 58%, transparent 60%), conic-gradient(${segments.join(',')})`
      element.title = `${cluster.getSize()}곳 · ${[...counts].map(([type, count]) => `${type} ${count}`).join(', ')} · 클릭하여 확대`
    }
  })
  return clusterer
}
