import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { searchPlaces } from './placeSearch.js'
import './location-picker.css'

export default function LocationPicker({ initialPosition, onClose, onConfirm }) {
  const container = useRef(null), pickerMap = useRef(null), dialog = useRef(null), input = useRef(null)
  const initial = useRef(initialPosition), request = useRef(0), close = useRef(onClose)
  const searchTimer = useRef(null)
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [message, setMessage] = useState('')
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false)
  useEffect(() => { close.current = onClose }, [onClose])

  useEffect(() => {
    const maps = window.kakao.maps
    const center = new maps.LatLng(initial.current.lat, initial.current.lng)
    pickerMap.current = new maps.Map(container.current, { center, level: 4 })
    setReady(true)
    const resize = new ResizeObserver(() => {
      const position = pickerMap.current.getCenter()
      pickerMap.current.relayout()
      pickerMap.current.setCenter(position)
    })
    resize.observe(container.current)
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    input.current.focus()
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input, [tabindex="0"]')]
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      request.current += 1
      resize.disconnect()
      pickerMap.current = null
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [])

  const runSearch = async (text, moveToFirst = false) => {
    const id = ++request.current
    setBusy(true); setMessage('')
    try {
      const found = await searchPlaces(text)
      if (id !== request.current) return
      setResults(found)
      if (!found.length) setMessage('검색 결과가 없습니다. 다른 주소나 장소명을 입력해주세요.')
      if (moveToFirst && found.length) {
        pickerMap.current.setCenter(new window.kakao.maps.LatLng(found[0].lat, found[0].lng))
        setResults([])
      }
    } catch (error) { if (id === request.current) setMessage(error.message) }
    finally { if (id === request.current) setBusy(false) }
  }

  useEffect(() => {
    if (query.trim().length < 2) return
    searchTimer.current = setTimeout(() => { void runSearch(query) }, 250)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  const choose = place => {
    clearTimeout(searchTimer.current)
    request.current += 1
    setBusy(false); setResults([]); setMessage('')
    pickerMap.current.setCenter(new window.kakao.maps.LatLng(place.lat, place.lng))
    input.current.blur()
  }
  const confirm = () => {
    if (!pickerMap.current) return
    const center = pickerMap.current.getCenter()
    onConfirm({ lat: center.getLat(), lng: center.getLng() })
  }

  return createPortal(<div className="location-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="location-dialog" role="dialog" aria-modal="true" aria-labelledby="location-title" ref={dialog}>
      <header className="location-dialog-heading"><div><h2 id="location-title">위치 수정</h2><p>지도를 움직여 핀 아래에 원하는 위치를 맞춰주세요.</p></div><button type="button" className="location-close" onClick={onClose} aria-label="위치 수정 닫기">×</button></header>
      <form className="location-search" onSubmit={event => { event.preventDefault(); clearTimeout(searchTimer.current); if (query.trim()) void runSearch(query, true) }}>
        <div className="location-search-field"><input ref={input} value={query} onChange={event => { request.current += 1; setQuery(event.target.value); setResults([]); setMessage(''); setBusy(false) }} placeholder="도로명주소 또는 장소명 검색" aria-label="주소 또는 장소명" autoComplete="off"/>
          {results.length > 0 && <ul className="location-suggestions">{results.map((place, i) => <li key={`${place.lat}-${place.lng}-${i}`}><button type="button" onClick={() => choose(place)}><b>{place.name}</b><small>{place.address}</small></button></li>)}</ul>}
        </div><button type="submit" disabled={!ready || !query.trim()}>검색</button>
      </form>
      <p className="location-search-status" role="status">{busy ? '검색 중…' : message}</p>
      <div className="location-picker-map-wrap"><div className="location-picker-map" ref={container}/><svg className="location-center-pin" width="44" height="58" viewBox="0 0 44 58" aria-hidden="true"><path fill="#19724f" stroke="white" strokeWidth="2" d="M22 56S2 34 2 22a20 20 0 0 1 40 0c0 12-20 34-20 34Z"/><circle cx="22" cy="22" r="8" fill="white"/></svg></div>
      <footer className="location-dialog-footer"><button type="button" className="location-confirm" disabled={!ready} onClick={confirm}>해당 위치에서 검색</button></footer>
    </section>
  </div>, document.body)
}
