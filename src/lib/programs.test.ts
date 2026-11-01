import { describe, expect, it } from 'vitest'
import { createIntervalSteps, formatDuration, formatTime, importProgram, MAX_STEPS, NORWEGIAN_PROGRAM, parseProgram, totalSeconds } from './programs'
import { parseLibrary, saveToLibrary } from './library'

const copy = () => structuredClone(NORWEGIAN_PROGRAM)

describe('program schema and default protocol', () => {
  it('has four 4-minute efforts and three recoveries, for exactly 40 minutes', () => {
    expect(totalSeconds(NORWEGIAN_PROGRAM)).toBe(2400)
    expect(NORWEGIAN_PROGRAM.steps.map((step) => step.durationSeconds)).toEqual([600, 240, 180, 240, 180, 240, 180, 240, 300])
    expect(NORWEGIAN_PROGRAM.steps.filter((step) => step.kind === 'work')).toHaveLength(4)
    expect(parseProgram(copy())).toEqual(NORWEGIAN_PROGRAM)
  })
  it('builds arbitrary intervals without a recovery after the final round', () => {
    const steps = createIntervalSteps({ warmup: 0, work: 30, recovery: 15, rounds: 3, cooldown: 0 })
    expect(steps.map((step) => step.durationSeconds)).toEqual([30, 15, 30, 15, 30])
    expect(steps.every((step) => step.target === undefined)).toBe(true)
  })
  it('bounds repeat expansion before doing any loops', () => {
    for (const rounds of [0, -1, 1.5, Infinity, 100000]) {
      expect(() => createIntervalSteps({ warmup: 0, work: 30, recovery: 15, rounds, cooldown: 0 })).toThrow()
    }
    expect(() => createIntervalSteps({ warmup: 600, work: 240, recovery: 180, rounds: 20, cooldown: 300 })).toThrow()
    expect(() => createIntervalSteps({ warmup: 0, work: 7200, recovery: 7200, rounds: 4, cooldown: 0 })).toThrow()
  })
  it('formats countdown boundaries without showing zero too early', () => {
    expect(formatTime(239.9)).toBe('04:00')
    expect(formatTime(0.01)).toBe('00:01')
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(-10)).toBe('00:00')
    expect(formatTime(7200)).toBe('120:00')
    expect(formatDuration(65)).toBe('1분 5초')
  })
  it('rejects missing, unsupported, or oversized programs', () => {
    for (const value of [null, {}, { ...copy(), schemaVersion: 2 }, { ...copy(), steps: [] }, { ...copy(), name: ' ' }, { ...copy(), id: '<script>' }, { ...copy(), name: 'a'.repeat(61) }, { ...copy(), steps: Array(MAX_STEPS + 1).fill(copy().steps[0]) }]) {
      expect(() => parseProgram(value)).toThrow()
    }
  })
  it.each([-1, 0, 4, 1.5, 7201, '240', null, NaN, Infinity])('rejects invalid duration %s', (durationSeconds) => {
    const value = copy()
    expect(() => parseProgram({ ...value, steps: [{ ...value.steps[0], durationSeconds }] })).toThrow()
  })
  it('enforces unique step IDs, step types, optional target ranges, and total duration', () => {
    const value = copy()
    expect(() => parseProgram({ ...value, steps: [value.steps[0], value.steps[0]] })).toThrow()
    expect(() => parseProgram({ ...value, steps: [{ ...value.steps[0], kind: ['work'] }] })).toThrow()
    expect(() => parseProgram({ ...value, steps: [{ ...value.steps[0], kind: '__proto__' }] })).toThrow()
    for (const target of [{ min: 39, max: 70 }, { min: 70, max: 101 }, { min: 85, max: 85 }, { min: 95, max: 85 }, { min: '85', max: 95 }, null]) {
      expect(() => parseProgram({ ...value, steps: [{ ...value.steps[0], target }] })).toThrow()
    }
    expect(() => parseProgram({ ...value, steps: value.steps.map((step) => ({ ...step, durationSeconds: 7200 })) })).toThrow()
  })
  it('imports a new ID, strips unsupported data, and treats all names as text', () => {
    const json = JSON.stringify({ ...copy(), name: '<img src=x onerror=alert(1)>', unknown: 'ignored' })
    const imported = importProgram(json)
    expect(imported.id).toMatch(/^custom-/)
    expect(imported.id).not.toBe(importProgram(json).id)
    expect(imported).not.toHaveProperty('unknown')
    expect(imported.name).toContain('<img')
  })
  it('rejects invalid JSON and counts the file limit in UTF-8 bytes', () => {
    expect(() => importProgram('{')).toThrow('JSON')
    expect(() => importProgram('가'.repeat(34_000))).toThrow('100KB')
  })
})

describe('local program library', () => {
  it('retains valid entries when other entries are corrupt, duplicate, or built-in', () => {
    const custom = { ...copy(), id: 'custom-valid' }
    expect(parseLibrary({ version: 1, programs: [null, copy(), custom, custom] })).toEqual([custom])
    expect(parseLibrary({ version: 2, programs: [custom] })).toEqual([])
  })
  it('updates by ID without adding duplicates or overwriting the built-in', () => {
    const custom = { ...copy(), id: 'custom-one' }
    const library = saveToLibrary([], custom)
    expect(saveToLibrary(library, { ...custom, name: '수정' })).toHaveLength(1)
    expect(saveToLibrary(library, { ...custom, name: '수정' })[0].name).toBe('수정')
    expect(() => saveToLibrary([], copy())).toThrow('기본 프로그램')
  })
  it('enforces the 20-program cap but permits editing existing entries', () => {
    const library = Array.from({ length: 20 }, (_, index) => ({ ...copy(), id: `custom-${index}` }))
    expect(() => saveToLibrary(library, { ...copy(), id: 'new' })).toThrow('20')
    expect(saveToLibrary(library, { ...library[0], name: 'updated' })).toHaveLength(20)
    expect(parseLibrary({ version: 1, programs: [...library, { ...copy(), id: 'new' }] })).toHaveLength(20)
  })
})
