// Keep presentation independent of cached facility data.
export const categoryMarkers = {
  화장실: { color: '#0074FF', file: 'toilet.png' },
  무료와이파이: { color: '#BE00FF', file: 'wifi-signal.png' },
  주차장: { color: '#4B446D', file: 'parking.png' },
  휴지통: { color: '#000000', file: 'recycle-bin-container.png' },
  공원: { color: '#3DC800', file: 'park.png' },
  금연구역: { color: '#FF0000', file: 'no-smoking.png' },
  자전거보관소: { color: '#FFBE00', file: 'bike.png' },
}

export const categoryIconUrl = type => `${import.meta.env.BASE_URL}icon/${categoryMarkers[type].file}`
const markerCache = new Map()

export function markerDataUrl(type) {
  if (markerCache.has(type)) return markerCache.get(type)
  const promise = new Promise((resolve, reject) => {
    const icon = new Image()
    icon.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // Render at 2x for crisp markers on high-density displays.
        canvas.width = 96
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        ctx.scale(2, 2)
        ctx.beginPath()
        ctx.moveTo(24, 62)
        ctx.bezierCurveTo(18, 54, 2, 36, 2, 24)
        ctx.arc(24, 24, 22, Math.PI, 0)
        ctx.bezierCurveTo(46, 36, 30, 54, 24, 62)
        ctx.closePath()
        ctx.fillStyle = categoryMarkers[type].color
        ctx.fill()
        ctx.beginPath()
        ctx.arc(24, 24, 17, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        const size = 24
        const ratio = Math.min(size / icon.naturalWidth, size / icon.naturalHeight)
        const width = icon.naturalWidth * ratio, height = icon.naturalHeight * ratio
        ctx.drawImage(icon, 24 - width / 2, 24 - height / 2, width, height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) { reject(error) }
    }
    icon.onerror = () => reject(new Error('카테고리 아이콘을 읽지 못했습니다.'))
    icon.src = categoryIconUrl(type)
  }).catch(error => { markerCache.delete(type); throw error })
  markerCache.set(type, promise)
  return promise
}
