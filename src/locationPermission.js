// A manual location and disposed controllers ignore late browser callbacks.
export function locationPermission({ navigator: nav, onState, onPosition }) {
  let status, stopped = false, manual = false, pending = false, state = 'checking', version = 0
  const emit = value => { state = value; if (!stopped && !manual) onState(value) }
  const request = () => {
    if (stopped || manual || pending) return
    if (!nav.geolocation) { emit('unsupported'); return }
    pending = true
    const ticket = ++version
    emit('locating')
    const failed = error => {
      if (stopped || manual || ticket !== version) return
      pending = false
      emit(error.code === 1 ? 'denied' : 'error')
    }
    try {
      nav.geolocation.getCurrentPosition(({ coords }) => {
        if (stopped || manual || ticket !== version) return
        pending = false
        emit('ready')
        onPosition({ lat: coords.latitude, lng: coords.longitude })
      }, failed, { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 })
    } catch { failed({ code: 2 }) }
  }
  const changed = () => {
    if (stopped || manual) return
    if (status.state === 'granted') { if (state !== 'ready') request() }
    else { version++; pending = false; emit(status.state) }
  }
  return {
    async start() {
      try {
        if (!nav.permissions?.query) { request(); return }
        status = await nav.permissions.query({ name: 'geolocation' })
        if (stopped || manual) return
        status.addEventListener('change', changed)
        changed()
      } catch { request() }
    },
    confirm() {
      if (state === 'denied' || status?.state === 'denied') emit('settings')
      else request()
    },
    useManual() { manual = true; version++; pending = false; onState('ready') },
    dispose() { stopped = true; version++; status?.removeEventListener('change', changed) },
  }
}
