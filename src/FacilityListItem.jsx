import DirectionsButton from './DirectionsButton.jsx'
import { useEffect, useId, useRef } from 'react'
import { categoryIconUrl } from './categoryMarkers.js'
import { scrollSelectedFacility } from './accordionScroll.js'

const formatInfo = value => String(value ?? '').replace(/(?<=\S)\s*\+\s*(?=\S)/g, ', ')
const distanceText = value => value === null ? '거리 확인 불가' : value < 1000 ? `${Math.round(value)}m` : `${(value / 1000).toFixed(1)}km`

export default function FacilityListItem({ place, userPosition, expanded, accordionEnabled, scrollRequest, onSelect, onClose }) {
  const row = useRef(null), detailsId = useId()
  useEffect(() => {
    if (!expanded) return
    return scrollSelectedFacility(row.current)
  }, [expanded, scrollRequest])

  return <article ref={row} className={`facility-list-item${expanded ? ' is-expanded' : ''}`}>
    <button className={`place-card${expanded ? ' selected' : ''}`} aria-expanded={accordionEnabled ? expanded : undefined} aria-controls={accordionEnabled ? detailsId : undefined} aria-haspopup={accordionEnabled ? undefined : 'dialog'} onClick={expanded ? onClose : onSelect}>
      <span className="place-icon" style={{ background: '#FFFFFF' }}><img src={categoryIconUrl(place.type)} alt="" width="24" height="24" style={{ objectFit: 'contain' }}/></span>
      <span className="place-info"><span className="place-title">{place.name}</span><span className="place-address">{place.address}</span><span className="place-meta">{place.type} {accordionEnabled && <span aria-hidden="true" className="facility-expand-arrow">⌄</span>}</span></span>
      <b className="nearby-distance">{distanceText(place.meters)}</b>
    </button>
    {accordionEnabled && <div id={detailsId} className="facility-accordion" aria-hidden={!expanded} inert={!expanded}>
      <div className="facility-accordion-clip"><div className="facility-accordion-content">
        <dl>{Object.entries(place.info).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{formatInfo(value)}</dd></div>)}</dl>
        <DirectionsButton origin={userPosition} place={place}/>
      </div></div>
    </div>}
  </article>
}
