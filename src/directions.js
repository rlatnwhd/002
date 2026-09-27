const validPosition = position => position && Number.isFinite(position.lat) && Number.isFinite(position.lng)
  && Math.abs(position.lat) <= 90 && Math.abs(position.lng) <= 180

// Official HTTPS links support desktop and mobile web without an installed app.
// https://apis.map.kakao.com/web/guide/#routeurl
export function directionsUrl(origin, destination) {
  if (!validPosition(origin) || !validPosition(destination)) return null
  const point = (name, position) => `${encodeURIComponent(name)},${position.lat},${position.lng}`
  return `https://map.kakao.com/link/by/walk/${point('내 위치', origin)}/${point(destination.name || '선택한 시설', destination)}`
}
