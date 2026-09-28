import assert from 'node:assert/strict'
import { locationPermission } from '../src/locationPermission.js'
function setup(state, fallback=false) {
  const status=new EventTarget(); status.state=state
  const calls=[], states=[], positions=[]
  const navigator={geolocation:{getCurrentPosition:(success,error)=>calls.push({success,error})}}
  if(!fallback) navigator.permissions={query:async descriptor=>{assert.equal(descriptor.name,'geolocation');return status}}
  const controller=locationPermission({navigator,onState:s=>states.push(s),onPosition:p=>positions.push(p)})
  return {controller,status,calls,states,positions,navigator}
}
const coords={latitude:35.1,longitude:129.1}
for(const state of ['prompt','denied']) {
  const t=setup(state);await t.controller.start();assert.equal(t.calls.length,0)
  t.controller.confirm()
  if(state==='prompt') {assert.equal(t.calls.length,1);t.calls[0].success({coords});assert.deepEqual(t.positions,[{lat:35.1,lng:129.1}])}
  else {assert.equal(t.calls.length,0);assert.equal(t.states.at(-1),'settings')}
  t.controller.dispose()
}
const granted=setup('granted');await granted.controller.start();assert.equal(granted.calls.length,1)
granted.status.dispatchEvent(new Event('change'));assert.equal(granted.calls.length,1)
granted.controller.useManual();granted.calls[0].success({coords});assert.equal(granted.positions.length,0)
const changed=setup('denied');await changed.controller.start();changed.status.state='granted';changed.status.dispatchEvent(new Event('change'));assert.equal(changed.calls.length,1)
changed.controller.dispose();changed.calls[0].success({coords});assert.equal(changed.positions.length,0)
for(const rejects of [false,true]) {
 const t=setup('prompt',true)
 if(rejects)t.navigator.permissions={query:async()=>{throw Error('unsupported')}}
 await t.controller.start();assert.equal(t.calls.length,1)
 t.calls[0].error({code:3});assert.equal(t.states.at(-1),'error')
 t.controller.confirm();assert.equal(t.calls.length,2)
 t.calls[1].error({code:1});t.controller.confirm();assert.equal(t.states.at(-1),'settings')
 t.controller.dispose()
}
console.log('Location permission: permission gates, change event, fallback, retry, manual override and cleanup passed')
