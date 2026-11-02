import { afterEach, describe, expect, it } from 'vitest'
import { formatDuration, localizeProgram, NORWEGIAN_PROGRAM, norwegianProgram, parseProgram } from '../lib/programs'
import { en } from './en'
import { DICTIONARIES, getLanguage, parseLanguage, setLanguage } from './index'
import { ko } from './ko'

function shape(value: unknown): unknown {
  if (typeof value === 'function') return `fn/${value.length}`
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]))
  return typeof value
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

afterEach(() => setLanguage('ko'))

describe('i18n', () => {
  it('keeps Korean and English dictionaries in the same shape', () => {
    expect(shape(en)).toEqual(shape(ko))
  })

  it('has no Korean left in the English dictionary except the language switch', () => {
    const korean = strings(en).filter((text) => /[가-힣]/.test(text))
    expect(korean).toEqual(['한국어', '한국어로 보기', '언어 · Language'])
  })

  it('defaults to Korean and only accepts known languages', () => {
    expect(getLanguage()).toBe('ko')
    expect(parseLanguage('en')).toBe('en')
    expect(parseLanguage('fr')).toBe('ko')
    expect(parseLanguage(undefined)).toBe('ko')
    expect(DICTIONARIES.ko).toBe(ko)
  })

  it('formats durations, the built-in program and validation errors in English', () => {
    setLanguage('en')
    expect(formatDuration(2400)).toBe('40 min')
    expect(formatDuration(90)).toBe('1 min 30 sec')
    expect(formatDuration(0)).toBe('0 sec')
    const program = norwegianProgram()
    expect(program.name).toBe('Norwegian 4×4')
    expect(program.steps.map((step) => step.name)).toEqual(['Warm-up', 'Hard 1', 'Active recovery', 'Hard 2', 'Active recovery', 'Hard 3', 'Active recovery', 'Hard 4', 'Cool-down'])
    expect(() => parseProgram({ schemaVersion: 2 })).toThrow('Unsupported program format')
  })

  it('shows a saved built-in session in the current language without touching its timing', () => {
    setLanguage('en')
    const localized = localizeProgram(NORWEGIAN_PROGRAM)
    expect(localized.steps[1].name).toBe('Hard 1')
    expect(localized.steps.map((step) => step.durationSeconds)).toEqual(NORWEGIAN_PROGRAM.steps.map((step) => step.durationSeconds))
    const custom = { ...NORWEGIAN_PROGRAM, id: 'custom-x', name: '내 운동' }
    expect(localizeProgram(custom)).toBe(custom)
  })
})
