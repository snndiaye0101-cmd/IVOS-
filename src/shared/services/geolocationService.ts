// Ce service gère la géolocalisation (tracking GPS, zones, alertes entrée/sortie).
// src/shared/services/geolocationService.ts
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n’est pas supportée'))
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    }
  })
}

export function watchPosition(onUpdate: (pos: GeolocationPosition) => void, onError?: (err: GeolocationPositionError) => void) {
  if (!navigator.geolocation) return null
  return navigator.geolocation.watchPosition(onUpdate, onError)
}

export function clearWatch(watchId: number) {
  if (navigator.geolocation && watchId) navigator.geolocation.clearWatch(watchId)
}
