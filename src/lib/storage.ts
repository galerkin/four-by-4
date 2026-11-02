import { useSyncExternalStore } from 'react'
import { isRecord, type HeartRateTarget } from './programs'
import { parseLanguage, type Language } from '../i18n'

const PREFIX = 'four-by-four:v1:'
let storageAvailable = true
const listeners = new Set<() => void>()

function unavailable() {
  if (!storageAvailable) return
  storageAvailable = false
  listeners.forEach((listener) => listener())
}

export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  } catch {
    unavailable()
    return null
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    unavailable()
    return false
  }
}

export function useStorageAvailable() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    () => storageAvailable,
    () => true,
  )
}

export type HeartProfile = { method: 'age' | 'manual'; value: number }
export interface Preferences {
  profile: HeartProfile | null
  sound: boolean
  keepAwake: boolean
  /** How the saturated phase color shows step progress: a left→right sweep or a circle growing from the timer. */
  fill: FillStyle
  /** Interface language. Korean by default. */
  language: Language
}
export type FillStyle = 'sweep' | 'circle'
export const parseFillStyle = (value: unknown): FillStyle => (value === 'circle' ? 'circle' : 'sweep')

export function parseProfile(value: unknown): HeartProfile | null {
  if (!isRecord(value) || !Number.isInteger(value.value)) return null
  if (value.method === 'age' && Number(value.value) >= 18 && Number(value.value) <= 100) return { method: 'age', value: Number(value.value) }
  if (value.method === 'manual' && Number(value.value) >= 80 && Number(value.value) <= 240) return { method: 'manual', value: Number(value.value) }
  return null
}

export function readPreferences(): Preferences {
  const data = readStored('preferences')
  if (!isRecord(data)) return { profile: null, sound: true, keepAwake: true, fill: 'sweep', language: 'ko' }
  return { profile: parseProfile(data.profile), sound: typeof data.sound === 'boolean' ? data.sound : true, keepAwake: typeof data.keepAwake === 'boolean' ? data.keepAwake : true, fill: parseFillStyle(data.fill), language: parseLanguage(data.language) }
}

export function maximumHeartRate(profile: HeartProfile): number {
  return profile.method === 'manual' ? profile.value : Math.round(208 - 0.7 * profile.value)
}

export function heartRateRange(profile: HeartProfile, target: HeartRateTarget) {
  const max = maximumHeartRate(profile)
  return { min: Math.round(max * target.min / 100), max: Math.round(max * target.max / 100) }
}
