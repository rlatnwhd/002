export const RADIUS_METERS = 3000
export const TILE_SIZE = 0.05
export const tileKey = (lat, lng) => `${Math.floor(lat / TILE_SIZE)}_${Math.floor(lng / TILE_SIZE)}`

export function distance(a, b) {
  const p = Math.PI / 180
  const x = Math.sin((b.lat - a.lat) * p / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin((b.lng - a.lng) * p / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, x)))
}

export function nearbyTiles(origin) {
  const dy = RADIUS_METERS / 110000
  const dx = dy / Math.cos((Math.abs(origin.lat) + dy) * Math.PI / 180)
  const keys = []
  for (let y = Math.floor((origin.lat - dy) / TILE_SIZE); y <= Math.floor((origin.lat + dy) / TILE_SIZE); y += 1) {
    for (let x = Math.floor((origin.lng - dx) / TILE_SIZE); x <= Math.floor((origin.lng + dx) / TILE_SIZE); x += 1) keys.push(`${y}_${x}`)
  }
  return keys
}

export function nearest(places, searchCenter, limit = 100, userPosition = searchCenter) {
  return places.filter(place => distance(searchCenter, place) <= RADIUS_METERS)
    .map(place => ({ ...place, meters: userPosition ? distance(userPosition, place) : null }))
    .sort((a, b) => userPosition ? a.meters - b.meters : distance(searchCenter, a) - distance(searchCenter, b))
    .slice(0, limit)
}
