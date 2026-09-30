import './data-sources-footer.css'

// Official dataset catalogue and linked CSV providers checked 2026-09-27.
const sources = [
  { label: '쓰레기통', id: '15129450', provider: '지방자치단체' },
  { label: '화장실', id: '15012892', provider: '행정안전부 (지방자치단체 기초자료 등록)' },
  { label: '주차장', id: '15012896', provider: '지방자치단체' },
  { label: '공원', id: '15012890', provider: '지방자치단체' },
  { label: '금연구역', id: '15013192', provider: '지방자치단체' },
  { label: '무료와이파이', id: '15013116', provider: '행정안전부 (지방자치단체 기초자료 등록)' },
  { label: '자전거보관소', id: '15017318', provider: '행정안전부 (지방자치단체 기초자료 등록)' },
]

function SourceLink({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="source-new-tab" aria-label="새 창에서 열기">↗</span></a>
}

export default function DataSourcesFooter() {
  return <footer className="data-sources-footer" aria-labelledby="data-sources-title">
    <h2 id="data-sources-title">데이터 출처 및 저작권</h2>
    <ul className="data-sources-grid">
      <li><h3>흡연구역 데이터</h3><p>공개된 공식 데이터를 최대한 통합한 전국 단위 데이터셋</p></li>
      {sources.map(source => <li key={source.id}>
        <h3>{source.label} 데이터</h3>
        <SourceLink href={`https://www.data.go.kr/data/${source.id}/standard.do`}>{source.provider} · 원본 보기</SourceLink>
      </li>)}
      <li>
        <h3>지도 및 주소·장소 검색</h3>
        <SourceLink href="https://apis.map.kakao.com/web/">카카오 · 지도 원본</SourceLink>{' · '}
        <SourceLink href="https://developers.kakao.com/docs/ko/local/dev-guide">주소·장소 정보</SourceLink>
        <p><SourceLink href="https://developers.kakao.com/terms/ko/site-terms">이용약관</SourceLink>{' · '}<SourceLink href="https://developers.kakao.com/terms/ko/site-policies">운영정책</SourceLink></p>
      </li>
    </ul>
    <div className="data-sources-notice">
      <p>공공데이터는 <SourceLink href="https://www.kogl.or.kr/info/licenseType1.do">공공누리 제1유형의 출처 표시 방식</SourceLink>에 따라 제공기관과 원문을 안내합니다. 각 원자료의 이용허락조건은 해당 출처에서 확인할 수 있습니다.</p>
      <p>본 서비스는 공공데이터 및 오픈 API를 활용한 비상업적 학습 목적의 2차 저작물입니다.</p>
    </div>
  </footer>
}
