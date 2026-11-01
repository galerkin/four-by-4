import { describe, expect, it } from 'vitest'
import { NORWEGIAN_PROGRAM, type Program } from './programs'
import { addRecord, createSession, parseHistory, parseSession, pauseSession, resumeSession, sessionPosition, settleSession, skipStep, startSession, toRecord } from './timer'

const startAt = 100_000
const running = () => startSession(createSession(NORWEGIAN_PROGRAM), startAt, 'test-session')

describe('wall-clock workout engine', () => {
  it.each([[0, 0, 600], [599, 0, 1], [600, 1, 240], [840, 2, 180], [1020, 3, 240], [1260, 4, 180], [1440, 5, 240], [1680, 6, 180], [1860, 7, 240], [2100, 8, 300], [2400, 8, 0]])('resolves second %s to step %s with %s seconds left', (seconds, stepIndex, remainingSeconds) => {
    const position = sessionPosition(running(), startAt + seconds * 1000)
    expect(position.stepIndex).toBe(stepIndex)
    expect(position.remainingSeconds).toBe(remainingSeconds)
  })
  it('does not advance idle or paused sessions', () => {
    expect(sessionPosition(createSession(NORWEGIAN_PROGRAM), startAt * 100).elapsedMs).toBe(0)
    const paused = pauseSession(running(), startAt + 15_000)
    expect(sessionPosition(paused, startAt + 99_000).elapsedMs).toBe(15_000)
    expect(paused.anchorAt).toBeNull()
  })
  it('resumes without counting the pause', () => {
    const paused = pauseSession(running(), startAt + 10_000)
    const resumed = resumeSession(paused, startAt + 110_000)
    expect(sessionPosition(resumed, startAt + 115_000).elapsedMs).toBe(15_000)
    expect(sessionPosition(resumed, startAt + 115_000).activeMs).toBe(15_000)
  })
  it('catches up after a long background suspension, completes at the real boundary', () => {
    const session = settleSession(running(), startAt + 7_200_000)
    expect(session.status).toBe('completed')
    expect(session.finishedAt).toBe(startAt + 2_400_000)
    expect(session.activeMs).toBe(2_400_000)
    expect(sessionPosition(session, startAt + 9_000_000).progress).toBe(1)
    expect(settleSession(session, startAt + 9_000_000)).toBe(session)
  })
  it('makes pause at the completion boundary a completion, not a paused zero timer', () => {
    expect(pauseSession(running(), startAt + 2_400_000).status).toBe('completed')
  })
  it('skips timeline time but never adds it to actual running time', () => {
    const skipped = skipStep(running(), startAt + 10_000)
    expect(skipped.status).toBe('running')
    expect(skipped.elapsedMs).toBe(600_000)
    expect(skipped.activeMs).toBe(10_000)
    expect(skipped.skippedStages).toBe(1)
    expect(sessionPosition(skipped, startAt + 15_000).remainingSeconds).toBe(235)
    expect(sessionPosition(skipped, startAt + 15_000).activeMs).toBe(15_000)
  })
  it('keeps a paused skip paused', () => {
    const skipped = skipStep(pauseSession(running(), startAt + 10_000), startAt + 20_000)
    expect(skipped.status).toBe('paused')
    expect(skipped.anchorAt).toBeNull()
    expect(skipped.activeMs).toBe(10_000)
  })
  it('records all skipped stages as partial, even when the final step is skipped', () => {
    let session = running()
    for (let index = 1; index <= 9; index++) session = skipStep(session, startAt + index * 1000)
    expect(session.status).toBe('completed')
    expect(session.skippedStages).toBe(9)
    expect(toRecord(session)?.activeSeconds).toBe(9)
    expect(toRecord(session)?.plannedSeconds).toBe(2400)
    expect(session.finishedAt).toBe(startAt + 9000)
  })
  it('does not skip idle/completed sessions or restart a running session', () => {
    const idle = createSession(NORWEGIAN_PROGRAM)
    expect(skipStep(idle, startAt)).toBe(idle)
    const current = running()
    expect(startSession(current, startAt + 10, 'other')).toBe(current)
    const done = settleSession(current, startAt + 2_400_000)
    expect(skipStep(done, startAt + 2_500_000)).toBe(done)
  })
  it('uses any valid program, without fixed 4×4 constants', () => {
    const program: Program = { schemaVersion: 1, id: 'custom', name: '테스트', description: '', steps: [{ id: 'one', name: '준비', kind: 'warmup', durationSeconds: 5, cue: '' }, { id: 'two', name: '운동', kind: 'work', durationSeconds: 10, cue: '' }] }
    const current = startSession(createSession(program), startAt, 'custom-session')
    expect(sessionPosition(current, startAt + 5000).step.id).toBe('two')
    expect(settleSession(current, startAt + 15000).status).toBe('completed')
  })
  it('clamps negative clock deltas rather than running backward', () => {
    expect(sessionPosition(running(), startAt - 10_000).elapsedMs).toBe(0)
  })
})

describe('persistence and records', () => {
  it('restores running, paused, idle and completed snapshots', () => {
    for (const session of [createSession(NORWEGIAN_PROGRAM), running(), pauseSession(running(), startAt + 5000), settleSession(running(), startAt + 2_400_000)]) {
      expect(parseSession(JSON.parse(JSON.stringify(session)))).toEqual(session)
    }
    const restored = parseSession(JSON.parse(JSON.stringify(running())))!
    expect(sessionPosition(restored, startAt + 900_000).stepIndex).toBe(2)
  })
  it('rejects invalid state invariants and malformed timestamps', () => {
    const current = running()
    for (const bad of [null, { ...current, version: 2 }, { ...current, program: {} }, { ...current, status: ['running'] }, { ...current, anchorAt: null }, { ...current, elapsedMs: -1 }, { ...current, activeMs: 1 }, { ...current, startedAt: Infinity }, { ...current, startedAt: 1e20 }, { ...current, skippedStages: 99 }, { ...current, status: 'completed', finishedAt: startAt }, { ...createSession(NORWEGIAN_PROGRAM), elapsedMs: 1 }]) {
      expect(parseSession(bad)).toBeNull()
    }
  })
  it('deduplicates completed records and never records an unfinished workout', () => {
    const done = settleSession(running(), startAt + 2_400_000)
    expect(toRecord(running())).toBeNull()
    expect(addRecord([], running())).toEqual([])
    const first = addRecord([], done)
    expect(addRecord(first, done)).toBe(first)
    expect(first[0].skippedStages).toBe(0)
  })
  it('limits history and filters duplicate/corrupt entries', () => {
    const done = settleSession(running(), startAt + 2_400_000)
    const record = toRecord(done)!
    expect(parseHistory([record, record, null, { ...record, id: 'bad', finishedAt: Infinity }, { ...record, id: 'bad', activeSeconds: 99999 }])).toEqual([record])
    const many = Array.from({ length: 110 }, (_, index) => ({ ...record, id: `id-${index}` }))
    expect(parseHistory(many)).toHaveLength(100)
    expect(addRecord(many, done)).toHaveLength(100)
  })
})
