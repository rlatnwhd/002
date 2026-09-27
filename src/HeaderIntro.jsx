import { categoryIconUrl } from './categoryMarkers.js'
import './header-intro.css'

export default function HeaderIntro() {
  return <>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">공</span>공공이<span className="brand-caption">일상에 가까운 공공시설</span></div>
      <span className="header-caption"><span/>우리 동네 생활 지도</span>
    </header>
    <section className="welcome-banner" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <p className="welcome-eyebrow"><span/>내 주변 공공시설을 한눈에</p>
        <h1 id="welcome-title">어디로 <span>가볼까요?</span></h1>
        <p className="welcome-description">잠깐 쉬어갈 공원부터 꼭 필요한 생활시설까지.<br/>가까운 곳을 찾고, 우리 동네를 더 편하게 누려보세요.</p>
        <div className="welcome-footnote"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-7.2 7-13a7 7 0 1 0-14 0c0 5.8 7 13 7 13Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.6"/></svg>필요한 순간, 가까운 곳에서</div>
      </div>
      <div className="welcome-art" aria-hidden="true">
        <div className="welcome-map">
          <svg className="welcome-map-lines" viewBox="0 0 380 220" fill="none">
            <rect x="20" y="20" width="94" height="58" rx="17" fill="#d4e5d6"/>
            <rect x="251" y="134" width="105" height="65" rx="20" fill="#d5e6d8"/>
            <path d="M265-20 231 67 261 120 219 244" stroke="#c7e2e5" strokeWidth="27"/>
            <path d="M-15 172 118 123 402 30M95-20l48 140 32 128" stroke="#d7e1d7" strokeWidth="17"/>
            <path d="M-15 172 118 123 402 30M95-20l48 140 32 128" stroke="#fffdf6" strokeWidth="12"/>
            <path d="m76 153 75-29 106-40" stroke="#88aa94" strokeWidth="2" strokeDasharray="4 6"/>
          </svg>
          <div className="welcome-pin welcome-pin-park"><img src={categoryIconUrl('공원')} alt=""/></div>
          <div className="welcome-pin welcome-pin-parking"><img src={categoryIconUrl('주차장')} alt=""/></div>
          <div className="welcome-pin welcome-pin-wifi"><img src={categoryIconUrl('무료와이파이')} alt=""/></div>
          <span className="welcome-map-dot"/>
        </div>
        <div className="welcome-map-label"><span>⌖</span> 우리 동네, 더 가까이</div>
      </div>
    </section>
  </>
}
