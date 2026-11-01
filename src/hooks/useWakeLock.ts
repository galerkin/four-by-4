import { useEffect, useState } from 'react'

export function useWakeLock(enabled: boolean) {
  const [activeLock, setActiveLock] = useState<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let disposed = false
    let lock: WakeLockSentinel | null = null
    let pending = false
    async function request() {
      if (disposed || pending || (lock && !lock.released) || document.visibilityState !== 'visible') return
      pending = true
      try {
        const acquired = await navigator.wakeLock.request('screen')
        if (disposed) { await acquired.release(); return }
        lock = acquired
        setActiveLock(acquired)
        acquired.addEventListener('release', () => { if (!disposed) setActiveLock(null) })
      } catch { if (!disposed) setActiveLock(null) }
      finally { pending = false }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void request() }
    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release().catch(() => {})
    }
  }, [enabled])
  return enabled && activeLock !== null && !activeLock.released
}
