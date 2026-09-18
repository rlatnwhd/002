// Kakao uses smaller numbers for closer zooms. Use the same neighborhood scale on every focus.
export const FOCUS_ZOOM_LEVEL = 3

export function focusMap(map, position) {
  map.setCenter(position)
  map.setLevel(FOCUS_ZOOM_LEVEL, { animate: true })
}

export function zoomIntoCluster(map, position) {
  const nextLevel = Math.max(1, map.getLevel() - 1)
  map.setCenter(position)
  map.setLevel(nextLevel, { animate: true })
}
