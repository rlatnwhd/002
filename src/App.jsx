import { useEffect, useMemo, useRef, useState } from 'react'
import LocationPicker from './LocationPicker.jsx'
import { normalizeNoSmoking } from './noSmoking.js'
import { fileSources } from './fileFacilities.js'
import { nearest } from './nearby.js'
import { categoryIconUrl, markerDataUrl } from './categoryMarkers.js'
import { localIndex, localPlaces, institutionCodes, regionalRecords, runLimited } from './nearbyData.js'
import './App.css'
import './live.css'
import './nearby.css'

const sources=[{id:'parking',type:'주차장',icon:'P',color:'#3579d6',endpoint:'tn_pubr_prkplce_info_api'},{id:'trash',type:'휴지통',icon:'T',color:'#e68126',endpoint:'tn_pubr_public_trash_can_api'},{id:'park',type:'공원',icon:'♧',color:'#2d995d',endpoint:'tn_pubr_public_cty_park_info_api'},{id:'no-smoking',type:'금연구역',endpoint:'tn_pubr_public_prhsmk_zn_api'}]
const categories=[...sources,...fileSources]
const tabs=['전체','주차장','휴지통','공원','화장실','금연구역','무료와이파이','자전거보관소']
const pick=(x,k,d='')=>k.map(a=>x[a]).find(a=>a!==undefined&&a!==null&&a!=='')??d
const dText=x=>x===null?'거리 확인 불가':x<1000?`${Math.round(x)}m`:`${(x/1000).toFixed(1)}km`
let sdkPromise
const sdk=()=>{
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
   const ready=()=>window.kakao.maps.load(()=>resolve(window.kakao))
   if(window.kakao?.maps){ready();return}
   const script=document.createElement('script')
   script.src=`https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}`
   script.onload=ready;script.onerror=reject;document.head.append(script)
 }).catch(error=>{sdkPromise=null;throw error})
 return sdkPromise
}
function item(s,r,i){const lat=Number(pick(r,['latitude','lat','LAT'])),lng=Number(pick(r,['longitude','lot','LOT']));const name=s.id==='trash'?pick(r,['instlPlcNm'],'휴지통'):s.id==='parking'?pick(r,['prkplceNm'],'주차장'):pick(r,['parkNm'],'공원');const address=pick(r,s.id==='trash'?['lctnRoadNm','lctnLotnoAddr']:['rdnmadr','lnmadr'],'주소 미제공');const info=s.id==='trash'?{종류:pick(r,['trashCanKnd'],'미분류'),설치위치:pick(r,['actlPstn'],'미제공')}:s.id==='parking'?{구분:pick(r,['prkplceSe'],'미제공'),유형:pick(r,['prkplceType'],'미제공'),주차면수:pick(r,['prkcmprt'],'미제공'),운영요일:pick(r,['operDay'],'미제공'),평일운영:`${pick(r,['weekdayOperOpenHhmm'],'미제공')} ~ ${pick(r,['weekdayOperColseHhmm'],'미제공')}`,요금정보:pick(r,['parkingchrgeInfo'],'미제공'),기본요금:pick(r,['basicCharge'])?`${pick(r,['basicTime'],'30')}분 ${Number(pick(r,['basicCharge'])).toLocaleString()}원`:'미제공',결제방법:pick(r,['metpay'],'미제공'),관리기관:pick(r,['institutionNm'],'미제공'),전화번호:pick(r,['phoneNumber'],'미제공'),장애인주차구역:pick(r,['pwdbsPpkZoneYn'],'미제공')}:{시설구분:pick(r,['parkSe'],'공원')};return {id:`${s.id}-${i}`,type:s.type,icon:s.icon,color:s.color,name,address,lat,lng,info}}
function Popup({x,onClose}){return <article className="detail-card"><button className="close-detail" onClick={onClose}>×</button><p className="detail-type">{x.type} · {dText(x.meters)}</p><h2>{x.name}</h2><p className="detail-address">⌖ {x.address}</p><div className="detail-stats">{Object.entries(x.info).map(([k,v])=><span key={k}><b>{k}</b> {v}</span>)}</div></article>}
export default function App(){
 const el=useRef(),map=useRef(),markers=useRef([]),user=useRef()
 const [searchCenter,setSearchCenter]=useState(null),[tab,setTab]=useState('전체'),[selected,setSelected]=useState(null),[note,setNote]=useState('현재 위치를 확인 중입니다.')
 const [userPosition,setUserPosition]=useState(null)
 const [pickerOpen,setPickerOpen]=useState(false),[mapReady,setMapReady]=useState(false)
 const [pickerInitial,setPickerInitial]=useState(null)
 const manuallySet=useRef(false)
 const [data,setData]=useState({key:'',groups:{}})
 const searchKey=searchCenter?`${searchCenter.lat},${searchCenter.lng}`:''
 useEffect(()=>{
   let disposed=false
   sdk().then(k=>{
     if(disposed)return
     map.current=new k.maps.Map(el.current,{center:new k.maps.LatLng(37.5665,126.978),level:6})
     setMapReady(true)
     navigator.geolocation.getCurrentPosition(({coords})=>{
       if(disposed||manuallySet.current)return
       const p={lat:coords.latitude,lng:coords.longitude}
       setUserPosition(previous=>previous??p)
       setSearchCenter(p);setNote('')
       map.current.setCenter(new k.maps.LatLng(p.lat,p.lng))
     },()=>{if(!disposed&&!manuallySet.current)setNote('현재 위치를 사용할 수 없습니다. 지도에서 위치 수정을 눌러주세요.')},{enableHighAccuracy:false,maximumAge:60000,timeout:8000})
   }).catch(()=>{if(!disposed)setNote('지도를 불러오지 못했습니다. 새로고침해주세요.')})
   return()=>{disposed=true;user.current?.setMap(null)}
 },[])
 useEffect(()=>{
   if(!mapReady||!userPosition)return
   const maps=window.kakao.maps
   const position=new maps.LatLng(userPosition.lat,userPosition.lng)
   if(!user.current)user.current=new maps.Marker({map:map.current,position,title:'내 위치'})
   else {user.current.setPosition(position);user.current.setMap(map.current)}
 },[mapReady,userPosition])
 const openLocationPicker=()=>{
   if(!map.current)return
   const center=map.current.getCenter()
   setPickerInitial({lat:center.getLat(),lng:center.getLng()})
   setPickerOpen(true)
 }
 const confirmLocation=position=>{
   manuallySet.current=true
   setUserPosition(position)
   setSearchCenter(position)
   setSelected(null);setNote('');setPickerOpen(false)
   map.current.setCenter(new window.kakao.maps.LatLng(position.lat,position.lng))
 }
 const returnToLocation=()=>{
   if(!userPosition||!map.current)return
   map.current.setCenter(new window.kakao.maps.LatLng(userPosition.lat,userPosition.lng))
 }
 useEffect(()=>{
   if(!searchCenter)return
   const controller=new AbortController(),signal=controller.signal
   const key=`${searchCenter.lat},${searchCenter.lng}`
   const update=(id,entry)=>{
     if(signal.aborted)return
     setData(previous=>({key,groups:{...(previous.key===key?previous.groups:{}),[id]:entry}}))
   }
   setData({key,groups:{}})
   localIndex(signal).then(index=>{
     if(signal.aborted)return
     for(const source of fileSources){
       localPlaces(source,searchCenter,index,signal,userPosition).then(places=>update(source.id,{places,loading:false})).catch(()=>update(source.id,{places:[],loading:false,error:'파일을 읽지 못했습니다.'}))
     }
     const codes=institutionCodes(index,searchCenter)
     const tasks=[]
     for(const source of sources){
       if(!codes.length){update(source.id,{places:[],loading:false,error:'이 지역의 조회 정보를 찾지 못했습니다.'});continue}
       const results=new Map()
       let pending=codes.length,failed=0
       const publish=()=>update(source.id,{places:nearest([...results.values()].flat(),searchCenter,100,userPosition),loading:pending>0,error:failed?'일부 시설을 불러오지 못했습니다. 다시 검색해주세요.':''})
       for(const code of codes)tasks.push(async()=>{
         try{
           await regionalRecords(source,code,import.meta.env.VITE_DATA_GO_KR_SERVICE_KEY,signal,rows=>{
             const places=rows.map((row,i)=>source.id==='no-smoking'?normalizeNoSmoking(row,i,code):item(source,row,`${code}-${i}`))
             results.set(code,nearest(places,searchCenter,100,userPosition));publish()
           })
         }catch{if(!signal.aborted)failed+=1}
         finally{pending-=1;publish()}
       })
     }
     // Interleave categories so a large category cannot delay the others.
     const interleaved=[]
     for(let i=0;i<codes.length;i+=1)for(let j=0;j<sources.length;j+=1)interleaved.push(tasks[j*codes.length+i])
     void runLimited(interleaved,signal)
   }).catch(()=>{for(const source of categories)update(source.id,{places:[],loading:false,error:'주변 시설을 불러오지 못했습니다. 다시 검색해주세요.'})})
   return()=>controller.abort()
 },[searchCenter,userPosition])
 const shown=useMemo(()=>{
   if(!searchCenter||data.key!==`${searchCenter.lat},${searchCenter.lng}`)return[]
   return nearest(categories.filter(source=>tab==='전체'||source.type===tab).flatMap(source=>data.groups[source.id]?.places??[]),searchCenter,100,userPosition)
 },[data,tab,searchCenter,userPosition])
 useEffect(()=>{
   if(!map.current)return
   let disposed=false
   const activeMarkers=[]
   markers.current.forEach(marker=>marker.setMap(null))
   markers.current=activeMarkers
   const maps=window.kakao.maps
   const types=[...new Set(shown.map(place=>place.type))]
   for(const type of types){
     markerDataUrl(type).then(url=>{
       if(disposed)return
       const markerImage=new maps.MarkerImage(url,new maps.Size(48,64),{offset:new maps.Point(24,62)})
       for(const place of shown.filter(place=>place.type===type)){
         const marker=new maps.Marker({map:map.current,position:new maps.LatLng(place.lat,place.lng),title:place.name,image:markerImage})
         maps.event.addListener(marker,'click',()=>setSelected(place))
         activeMarkers.push(marker)
       }
     }).catch(()=>{if(!disposed)setNote('지도 아이콘을 불러오지 못했습니다. 새로고침해주세요.')})
   }
   return()=>{disposed=true;activeMarkers.forEach(marker=>marker.setMap(null))}
 },[shown])
 const activeCategories=categories.filter(source=>tab==='전체'||source.type===tab)
 const groups=data.key===searchKey?data.groups:{}
 const activeLoading=Boolean(searchCenter)&&activeCategories.some(source=>groups[source.id]?.loading!==false)
 const errors=activeCategories.filter(source=>groups[source.id]?.error)
 return <><main className="app-shell" inert={pickerOpen}>
   <header className="topbar"><a className="brand"><span className="brand-mark">공</span>공공이</a></header>
   <section className="filter-row">{tabs.map(t=><button key={t} onClick={()=>{setTab(t);setSelected(null)}} className={tab===t?'filter active':'filter'}>{t}</button>)}</section>
   <section className="content-grid"><aside className="place-list">
     <div className="list-heading"><div><p className="section-label">검색 위치 주변 · 반경 3km</p><h2>{userPosition?'내 위치에서 가까운 순':'검색 결과'} {shown.length}곳</h2></div></div>
     {note&&<p className="data-status">{note}</p>}
     {errors.map(source=><p key={source.id} className="data-status">{source.type}: {groups[source.id].error}</p>)}
     {activeLoading&&<div className="loading"><i/> 주변 시설을 불러오는 중...</div>}
     <div className="place-items">{shown.map(x=><button key={x.id} className="place-card" onClick={()=>{setSelected(x);map.current.panTo(new window.kakao.maps.LatLng(x.lat,x.lng))}}><span className="place-icon" style={{background:'#FFFFFF'}}><img src={categoryIconUrl(x.type)} alt="" width="24" height="24" style={{objectFit:'contain'}}/></span><span className="place-info"><span className="place-title">{x.name}</span><span className="place-address">{x.address}</span><span className="place-meta">{Object.values(x.info).filter(Boolean).join(' · ')}</span></span><b className="nearby-distance">{dText(x.meters)}</b></button>)}
     {!activeLoading&&searchCenter&&shown.length===0&&<p className="empty">반경 3km 안에 표시할 시설이 없습니다.</p>}</div>
   </aside><section className="map-panel"><div className="kakao-map" ref={el}/><button className="my-location-button" disabled={!mapReady} onClick={openLocationPicker}>위치 수정</button>{userPosition&&<button className="return-location-button" onClick={returnToLocation}>◎ 내 위치로 이동</button>}{selected&&<Popup x={selected} onClose={()=>setSelected(null)}/>}</section></section>
 </main>{pickerOpen&&<LocationPicker initialPosition={pickerInitial} onClose={()=>setPickerOpen(false)} onConfirm={confirmLocation}/>}</>
}
