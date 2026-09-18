const value = (v) => String(v ?? '').trim() || '미제공'

export function normalizeNoSmoking(row, index, regionKey) {
  return {
    id: `no-smoking-${regionKey}-${index}`, type: '금연구역', icon: '금', color: '#d34b51',
    name: value(row.prhsmkNm), address: row.rdnmadr || row.lnmadr || '주소 미제공',
    lat: Number(row.latitude), lng: Number(row.longitude),
    info: {
      구분: value(row.prhsmkSe), 금연범위: value(row.prhsmkScopeDesc),
      지정근거: value(row.prhsmkAppnBasis),
      위반과태료: String(row.ffnlg ?? '').trim() && Number.isFinite(Number(row.ffnlg)) ? `${Number(row.ffnlg).toLocaleString('ko-KR')}원` : '미제공',
      신고전화: value(row.phoneNumber), 관리기관: value(row.institutionNm),
    },
  }
}

