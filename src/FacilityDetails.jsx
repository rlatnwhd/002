import DirectionsButton from './DirectionsButton.jsx'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const formatInfo = value => String(value ?? '').replace(/(?<=\S)\s*\+\s*(?=\S)/g, ', ')
const distanceText = value => value === null ? '거리 확인 불가' : value < 1000 ? `${Math.round(value)}m` : `${(value / 1000).toFixed(1)}km`

export default function FacilityDetails({ place, userPosition, mobile, onClose }) {
  const titleId = useId(), card = useRef(null), closeButton = useRef(null), close = useRef(onClose)
  const closeTimer = useRef(null)
  const [closing, setClosing] = useState(false)
  useEffect(() => { close.current = onClose }, [onClose])
  const requestClose = useCallback(() => {
    if (!mobile || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { close.current(); return }
    if (closeTimer.current !== null) return
    setClosing(true)
    closeTimer.current = setTimeout(() => { closeTimer.current = null; close.current() }, 280)
  }, [mobile])
  useEffect(() => () => { clearTimeout(closeTimer.current); closeTimer.current = null }, [])
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    if (mobile) { document.body.style.overflow = 'hidden'; closeButton.current?.focus() }
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose() }
      if (mobile && event.key === 'Tab') {
        const controls = [...card.current.querySelectorAll('button:not(:disabled), a[href]')]
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      if (mobile) { document.body.style.overflow = previousOverflow; previousFocus?.focus() }
    }
  }, [mobile, requestClose])

  const content = <article ref={card} className={`detail-card facility-details ${mobile ? 'facility-details-sheet' : 'facility-details-desktop'}${closing ? ' is-closing' : ''}`} role="dialog" aria-modal={mobile || undefined} aria-labelledby={titleId}>
    {mobile && <div className="facility-sheet-handle" aria-hidden="true"/>}
    <header className="facility-details-heading"><p className="detail-type">{place.type} · {distanceText(place.meters)}</p><button ref={closeButton} className="close-detail" aria-label="시설 정보 닫기" onClick={requestClose}>×</button></header>
    <h2 id={titleId}>{place.name}</h2><p className="detail-address">⌖ {place.address}</p>
    <div className="detail-stats">{Object.entries(place.info).map(([key, value]) => <span key={key}><b>{key}</b> {formatInfo(value)}</span>)}</div>
    <DirectionsButton origin={userPosition} place={place}/>
  </article>
  return createPortal(mobile ? <div className={`facility-details-backdrop${closing ? ' is-closing' : ''}`} onClick={event => { if (event.target === event.currentTarget) requestClose() }}>{content}</div> : content, document.body)
}
