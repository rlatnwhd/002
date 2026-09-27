import { directionsUrl } from './directions.js'

export default function DirectionsButton({ origin, place }) {
  const href = directionsUrl(origin, place)
  return <div className="facility-directions">
    {href ? <a className="facility-directions-button" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${place.name} 카카오맵으로 길찾기 (새 창)`}>카카오맵으로 길찾기 <span aria-hidden="true">↗</span></a>
      : <><button className="facility-directions-button" disabled>카카오맵으로 길찾기</button><p>출발지와 시설의 위치를 확인한 뒤 길찾기를 이용할 수 있습니다.</p></>}
  </div>
}
