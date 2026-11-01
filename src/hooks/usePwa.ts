import { useEffect, useRef, useState } from 'react'

export function usePwa() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const updateRequested = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let disposed = false
    let registration: ServiceWorkerRegistration | undefined
    const onControllerChange = () => { if (updateRequested.current) window.location.reload() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {})
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisibility)
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then((result) => {
      if (disposed) return
      registration = result
      if (result.waiting) setWaiting(result.waiting)
      result.addEventListener('updatefound', () => {
        const worker = result.installing
        worker?.addEventListener('statechange', () => {
          if (!disposed && worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker)
        })
      })
    }).catch(() => { /* Online use still works when storage or service workers are blocked. */ })
    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return {
    updateReady: Boolean(waiting) && !dismissed,
    dismiss: () => setDismissed(true),
    update: () => { updateRequested.current = true; waiting?.postMessage('ACTIVATE_UPDATE') },
  }
}
