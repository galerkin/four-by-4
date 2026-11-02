import { afterEach, describe, expect, it, vi } from 'vitest'
import { maximumHeartRate, heartRateRange, parseProfile, readPreferences, readStored, writeStored } from './storage'
import { newId } from './ids'

afterEach(() => vi.unstubAllGlobals())

describe('heart-rate guidance', () => {
  it('does not invent an age or heart-rate measurement', () => {
    expect(parseProfile(null)).toBeNull()
    expect(parseProfile({ method: 'age', value: '40' })).toBeNull()
    for (const value of [17, 101, 40.5, Infinity, NaN]) expect(parseProfile({ method: 'age', value })).toBeNull()
    for (const value of [79, 241]) expect(parseProfile({ method: 'manual', value })).toBeNull()
  })
  it('calculates adult Tanaka estimates and targets as a percentage, not bpm', () => {
    const profile = { method: 'age' as const, value: 40 }
    expect(maximumHeartRate(profile)).toBe(180)
    expect(heartRateRange(profile, { min: 85, max: 95 })).toEqual({ min: 153, max: 171 })
    expect(heartRateRange(profile, { min: 60, max: 70 })).toEqual({ min: 108, max: 126 })
    expect(maximumHeartRate({ method: 'manual', value: 195 })).toBe(195)
  })
})

describe('defensive browser persistence', () => {
  it('handles malformed JSON and unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{' })
    expect(readStored('anything')).toBeNull()
    expect(readPreferences()).toEqual({ profile: null, sound: true, keepAwake: true, fill: 'sweep', language: 'ko' })
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') } })
    expect(readStored('anything')).toBeNull()
    expect(writeStored('anything', {})).toBe(false)
  })
  it('normalizes malformed preferences without trusting imported data', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ profile: { method: 'age', value: 12 }, sound: 'yes', keepAwake: false, fill: 'spiral', language: 'fr' }) })
    expect(readPreferences()).toEqual({ profile: null, sound: true, keepAwake: false, fill: 'sweep', language: 'ko' })
  })
  it('generates IDs over non-secure LAN HTTP without randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: (array: Uint8Array) => array.fill(7) })
    expect(newId('custom-')).toMatch(/^custom-[a-f0-9]{32}$/)
  })
})
