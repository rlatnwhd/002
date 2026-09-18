// Reuse the existing Kakao address and place-name services in the location picker.
export function searchPlaces(query, maps = window.kakao.maps) {
  const text = query.trim()
  if (!text) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    new maps.services.Geocoder().addressSearch(text, (addresses, status) => {
      if (status === maps.services.Status.OK && addresses.length) {
        resolve(addresses.map(address => ({ name: address.address_name, address: address.road_address?.address_name || address.address_name, lat: +address.y, lng: +address.x })))
        return
      }
      new maps.services.Places().keywordSearch(text, (places, placeStatus) => {
        if (placeStatus === maps.services.Status.OK) resolve(places.slice(0, 6).map(place => ({ name: place.place_name, address: place.road_address_name || place.address_name, lat: +place.y, lng: +place.x })))
        else if (placeStatus === maps.services.Status.ZERO_RESULT) resolve([])
        else reject(new Error('검색하지 못했습니다. 다시 시도해주세요.'))
      })
    })
  })
}
