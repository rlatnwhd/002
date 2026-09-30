import { locationPermission } from './locationPermission.js'
import './location-permission.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { focusMap } from './mapNavigation.js'
import { createMarkerClusterer } from './markerClusters.js'
import FacilityListItem from './FacilityListItem.jsx'
import FacilityDetails from './FacilityDetails.jsx'
import { createMarkerSelection } from './markerSelection.js'
import LocationPicker from './LocationPicker.jsx'
import { normalizeNoSmoking } from './noSmoking.js'
import { fileSources } from './fileFacilities.js'
import { nearest } from './nearby.js'
import { categoryIconUrl, markerDataUrl } from './categoryMarkers.js'
import { localIndex, localPlaces, institutionCodes, regionalRecords, runLimited } from './nearbyData.js'
import './App.css'
import './live.css'
import './nearby.css'
import HeaderIntro from './HeaderIntro.jsx'
import DataSourcesFooter from './DataSourcesFooter.jsx'
import './responsive.css'
import './facility-details.css'

const sources=[{id:'parking',type:'주차장',icon:'P',color:'#3579d6',endpoint:'tn_pubr_prkplce_info_api'},{id:'trash',type:'휴지통',icon:'T',color:'#e68126',endpoint:'tn_pubr_public_trash_can_api'},{id:'park',type:'공원',icon:'♧',color:'#2d995d',endpoint:'tn_pubr_public_cty_park_info_api'},{id:'no-smoking',type:'금연구역',endpoint:'tn_pubr_public_prhsmk_zn_api'}]
const categories=[...sources,...fileSources]
const tabs=['전체','주차장','휴지통','공원','화장실','금연구역','흡연구역','무료와이파이','자전거보관소']
const pick=(x,k,d='')=>k.map(a=>x[a]).find(a=>a!==undefined&&a!==null&&a!=='')??d
let sdkPromise
const sdk=()=>{
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
   const ready=()=>window.kakao.maps.load(()=>resolve(window.kakao))
   if(window.kakao?.maps){ready();return}
   const script=document.createElement('script')
   script.src=`https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}`
   script.onload=ready;script.onerror=reject;document.head.append(script)
 }).catch(error=>{sdkPromise=null;throw error})
 return sdkPromise
}
function item(s,r,i){const lat=Number(pick(r,['latitude','lat','LAT'])),lng=Number(pick(r,['longitude','lot','LOT']));const name=s.id==='trash'?pick(r,['instlPlcNm'],'휴지통'):s.id==='parking'?pick(r,['prkplceNm'],'주차장'):pick(r,['parkNm'],'공원');const address=pick(r,s.id==='trash'?['lctnRoadNm','lctnLotnoAddr']:['rdnmadr','lnmadr'],'주소 미제공');const info=s.id==='trash'?{종류:pick(r,['trashCanKnd'],'미분류'),설치위치:pick(r,['actlPstn'],'미제공')}:s.id==='parking'?{구분:pick(r,['prkplceSe'],'미제공'),유형:pick(r,['prkplceType'],'미제공'),주차면수:pick(r,['prkcmprt'],'미제공'),운영요일:pick(r,['operDay'],'미제공'),평일운영:`${pick(r,['weekdayOperOpenHhmm'],'미제공')} ~ ${pick(r,['weekdayOperColseHhmm'],'미제공')}`,요금정보:pick(r,['parkingchrgeInfo'],'미제공'),기본요금:pick(r,['basicCharge'])?`${pick(r,['basicTime'],'30')}분 ${Number(pick(r,['basicCharge'])).toLocaleString()}원`:'미제공',결제방법:pick(r,['metpay'],'미제공'),관리기관:pick(r,['institutionNm'],'미제공'),전화번호:pick(r,['phoneNumber'],'미제공'),장애인주차구역:pick(r,['pwdbsPpkZoneYn'],'미제공')}:{시설구분:pick(r,['parkSe'],'공원')};return {id:`${s.id}-${i}`,type:s.type,icon:s.icon,color:s.color,name,address,lat,lng,info}}
export default function App(){
 const el=useRef(),map=useRef(),markers=useRef([]),user=useRef(),clusterer=useRef(null),markerTypes=useRef(new WeakMap())
 const [searchCenter,setSearchCenter]=useState(null),[tab,setTab]=useState('전체'),[selected,setSelected]=useState(null),[note,setNote]=useState('현재 위치를 확인 중입니다.')
 const [userPosition,setUserPosition]=useState(null)
 const [pickerOpen,setPickerOpen]=useState(false),[mapReady,setMapReady]=useState(false)
 const [pickerInitial,setPickerInitial]=useState(null)
 const manuallySet=useRef(false)
 const permissionController=useRef(null)
 const [locationState,setLocationState]=useState('checking')
 const markerSelections=useRef(new Map()),selectedId=useRef(null)
 const [mobileDetails,setMobileDetails]=useState(()=>window.matchMedia('(max-width: 768px)').matches)
 useEffect(()=>{
   const media=window.matchMedia('(max-width: 768px)')
   const update=()=>setMobileDetails(media.matches)
   media.addEventListener('change',update)
   return()=>media.removeEventListener('change',update)
 },[])
 const [data,setData]=useState({key:'',groups:{}})
 const searchKey=searchCenter?`${searchCenter.lat},${searchCenter.lng}`:''
 useEffect(()=>{
   let disposed=false
   sdk().then(k=>{
     if(disposed)return
     map.current=new k.maps.Map(el.current,{center:new k.maps.LatLng(37.5665,126.978),level:6})
     clusterer.current=createMarkerClusterer(map.current,k.maps,markerTypes.current)
     setMapReady(true)

   }).catch(()=>{if(!disposed)setNote('지도를 불러오지 못했습니다. 새로고침해주세요.')})
   return()=>{disposed=true;clusterer.current?.destroy();user.current?.setMap(null)}
 },[])
 useEffect(()=>{
   const controller=locationPermission({navigator,onState:state=>{
     setLocationState(state)
     setNote(state==='locating'?'현재 위치를 확인 중입니다.':'')
   },onPosition:position=>{
     if(manuallySet.current)return
     setUserPosition(position);setSearchCenter(position);setNote('')
   }})
   permissionController.current=controller
   void controller.start()
   return()=>controller.dispose()
 },[])
 useEffect(()=>{
   if(!mapReady||!userPosition)return
   const maps=window.kakao.maps
   const position=new maps.LatLng(userPosition.lat,userPosition.lng)
   map.current.setCenter(position)
   if(!user.current)user.current=new maps.Marker({map:map.current,position,title:'내 위치'})
   else {user.current.setPosition(position);user.current.setMap(map.current)}
 },[mapReady,userPosition])
 const openLocationPicker=()=>{
   if(!map.current)return
   const center=map.current.getCenter()
   setPickerInitial({lat:center.getLat(),lng:center.getLng()})
   setSelected(null)
   setPickerOpen(true)
 }
 const confirmLocation=position=>{
   manuallySet.current=true
   permissionController.current?.useManual()
   setUserPosition(position)
   setSearchCenter(position)
   setSelected(null);setNote('');setPickerOpen(false)
   map.current.setCenter(new window.kakao.maps.LatLng(position.lat,position.lng))
 }
 const returnToLocation=()=>{
   if(!userPosition||!map.current)return
   setSelected(null)
   focusMap(map.current,new window.kakao.maps.LatLng(userPosition.lat,userPosition.lng))
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
   selectedId.current=selected?.id??null
   markerSelections.current.forEach((controller,id)=>controller.setSelected(id===selectedId.current))
 },[selected?.id])
 useEffect(()=>{
   if(!map.current)return
   let disposed=false
   const activeMarkers=[]
   const controllers=new Map()
   markerSelections.current=controllers
   clusterer.current?.clear()
   markers.current.forEach(marker=>marker.setMap(null))
   markers.current=activeMarkers
   const maps=window.kakao.maps
   const types=[...new Set(shown.map(place=>place.type))]
   for(const type of types){
     markerDataUrl(type).then(url=>{
       if(disposed)return
       const markerImage=new maps.MarkerImage(url,new maps.Size(48,64),{offset:new maps.Point(24,62)})
       for(const place of shown.filter(place=>place.type===type)){
         const marker=new maps.Marker({position:new maps.LatLng(place.lat,place.lng),title:place.name,image:markerImage})
         markerTypes.current.set(marker,place.type)
         clusterer.current.addMarker(marker,true)
         const controller=createMarkerSelection(marker,url,maps,{
           onSelect:()=>{clusterer.current.removeMarker(marker);marker.setMap(map.current);marker.setZIndex(10)},
           onRelease:()=>{marker.setZIndex(0);clusterer.current.addMarker(marker)},
         })
         controllers.set(place.id,controller)
         controller.setSelected(place.id===selectedId.current)
         maps.event.addListener(marker,'click',()=>setSelected({...place}))
         activeMarkers.push(marker)
       }
       clusterer.current.redraw()
     }).catch(()=>{if(!disposed)setNote('지도 아이콘을 불러오지 못했습니다. 새로고침해주세요.')})
   }
   return()=>{
     disposed=true
     controllers.forEach(controller=>controller.dispose())
     controllers.clear()
     clusterer.current?.clear()
     activeMarkers.forEach(marker=>marker.setMap(null))
   }
 },[shown,mapReady])
 const activeCategories=categories.filter(source=>tab==='전체'||source.type===tab)
 const groups=data.key===searchKey?data.groups:{}
 const activeLoading=Boolean(searchCenter)&&activeCategories.some(source=>groups[source.id]?.loading!==false)
 const errors=activeCategories.filter(source=>groups[source.id]?.error)
 return <><main className="app-shell" inert={pickerOpen||Boolean(selected&&mobileDetails)}>
   <HeaderIntro/>
   {['prompt','denied','settings','error','unsupported'].includes(locationState)&&<aside className="location-permission-banner" aria-label="위치 서비스 안내">
     <p role="status">{locationState==='settings'?'브라우저 주소창 왼쪽 자물쇠(설정) 아이콘 → 위치 → 허용으로 변경 후 새로고침해주세요':locationState==='error'?'현재 위치를 확인하지 못했어요. 기기의 위치 서비스를 확인하거나 위치 수정으로 직접 지정해주세요.':locationState==='unsupported'?'이 브라우저에서는 현재 위치를 사용할 수 없어요. 위치 수정으로 직접 지정해주세요.':'내 위치를 알려면 위치 서비스를 활성화시켜야 해요.'}</p>
     {!['settings','unsupported'].includes(locationState)&&<button onClick={()=>permissionController.current?.confirm()}>{locationState==='error'?'다시 시도':'확인'}</button>}
     <button className="location-manual-action" disabled={!mapReady} onClick={openLocationPicker}>위치 수정</button>
   </aside>}
   <section className="filter-row">{tabs.map(t=><button key={t} onClick={()=>{setTab(t);setSelected(null)}} className={tab===t?'filter active':'filter'} aria-pressed={tab===t}>{t==='전체'?<span className="filter-grid-icon" aria-hidden="true"><i/><i/><i/><i/></span>:<img src={categoryIconUrl(t)} alt=""/>}{t}</button>)}</section>
   <section className="content-grid"><aside className="place-list">
     <div className="list-heading"><div><p className="section-label">검색 위치 주변 · 반경 3km</p><h2>{userPosition?'내 위치에서 가까운 순':'검색 결과'} {shown.length}곳</h2></div></div>
     {note&&<p className="data-status">{note}</p>}
     {errors.map(source=><p key={source.id} className="data-status">{source.type}: {groups[source.id].error}</p>)}
     {activeLoading&&<div className="loading"><i/> 주변 시설을 불러오는 중...</div>}
     <div className="place-items">{shown.map(x=><FacilityListItem key={x.id} place={x} userPosition={userPosition} accordionEnabled={!mobileDetails} expanded={!mobileDetails&&selected?.id===x.id} scrollRequest={selected?.id===x.id?selected:null} onSelect={()=>{setSelected(x);focusMap(map.current,new window.kakao.maps.LatLng(x.lat,x.lng))}} onClose={()=>setSelected(null)}/>)}
     {!activeLoading&&searchCenter&&shown.length===0&&<p className="empty">반경 3km 안에 표시할 시설이 없습니다.</p>}</div>
   </aside><section className="map-panel"><div className="kakao-map" ref={el}/><div className="map-actions"><button className="my-location-button" disabled={!mapReady} onClick={openLocationPicker}>위치 수정</button>{userPosition&&<button className="return-location-button" onClick={returnToLocation}>◎ 내 위치로 이동</button>}</div></section></section>
 <DataSourcesFooter/>
 </main>{selected&&mobileDetails&&<FacilityDetails key={selected.id} place={selected} userPosition={userPosition} mobile={mobileDetails} onClose={()=>setSelected(null)}/>} {pickerOpen&&<LocationPicker initialPosition={pickerInitial} onClose={()=>setPickerOpen(false)} onConfirm={confirmLocation}/>}</>
}
