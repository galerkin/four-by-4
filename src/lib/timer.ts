import { isRecord, parseProgram, totalSeconds, type Program } from './programs'

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface Session {
  version: 1
  program: Program
  id: string | null
  status: SessionStatus
  /** Position on the program's timeline. Skipping advances this, not activeMs. */
  elapsedMs: number
  /** Actual running time, excluding pauses and skipped time. */
  activeMs: number
  anchorAt: number | null
  startedAt: number | null
  finishedAt: number | null
  skippedStages: number
}

export interface WorkoutRecord {
  id: string
  programName: string
  programId: string
  startedAt: number
  finishedAt: number
  activeSeconds: number
  plannedSeconds: number
  skippedStages: number
}

export function createSession(program: Program): Session {
  return { version: 1, program, id: null, status: 'idle', elapsedMs: 0, activeMs: 0, anchorAt: null, startedAt: null, finishedAt: null, skippedStages: 0 }
}

export function sessionPosition(session: Session, now: number) {
  const totalMs = totalSeconds(session.program) * 1000
  const delta = session.status === 'running' && session.anchorAt !== null ? Math.max(0, now - session.anchorAt) : 0
  const elapsedMs = Math.min(totalMs, session.elapsedMs + delta)
  const activeMs = session.activeMs + Math.min(delta, totalMs - session.elapsedMs)
  let stepStartMs = 0
  let stepIndex = session.program.steps.length - 1
  for (let index = 0; index < session.program.steps.length; index++) {
    const end = stepStartMs + session.program.steps[index].durationSeconds * 1000
    if (elapsedMs < end || index === session.program.steps.length - 1) {
      stepIndex = index
      break
    }
    stepStartMs = end
  }
  const step = session.program.steps[stepIndex]
  const stepElapsedMs = Math.min(step.durationSeconds * 1000, elapsedMs - stepStartMs)
  return {
    totalMs, elapsedMs, activeMs, step, stepIndex, stepStartMs, stepElapsedMs,
    remainingSeconds: Math.max(0, (step.durationSeconds * 1000 - stepElapsedMs) / 1000),
    progress: elapsedMs / totalMs,
    stepProgress: stepElapsedMs / (step.durationSeconds * 1000),
    isComplete: elapsedMs >= totalMs,
  }
}

export function settleSession(session: Session, now: number): Session {
  if (session.status !== 'running') return session
  const position = sessionPosition(session, now)
  if (!position.isComplete) return session
  return {
    ...session, status: 'completed', elapsedMs: position.totalMs, activeMs: position.activeMs,
    anchorAt: null,
    finishedAt: session.anchorAt! + (position.totalMs - session.elapsedMs),
  }
}

export function startSession(session: Session, now: number, id: string): Session {
  if (session.status !== 'idle') return session
  return { ...session, status: 'running', id, startedAt: now, anchorAt: now }
}

export function pauseSession(session: Session, now: number): Session {
  const settled = settleSession(session, now)
  if (settled.status !== 'running') return settled
  const position = sessionPosition(settled, now)
  return { ...settled, status: 'paused', elapsedMs: position.elapsedMs, activeMs: position.activeMs, anchorAt: null }
}

export function resumeSession(session: Session, now: number): Session {
  if (session.status !== 'paused') return session
  return { ...session, status: 'running', anchorAt: now }
}

export function skipStep(session: Session, now: number): Session {
  const settled = settleSession(session, now)
  if (settled.status !== 'running' && settled.status !== 'paused') return settled
  const position = sessionPosition(settled, now)
  const elapsedMs = position.stepStartMs + position.step.durationSeconds * 1000
  const completed = elapsedMs >= position.totalMs
  return {
    ...settled, elapsedMs, activeMs: position.activeMs, skippedStages: settled.skippedStages + 1,
    status: completed ? 'completed' : settled.status,
    anchorAt: !completed && settled.status === 'running' ? now : null,
    finishedAt: completed ? now : null,
  }
}

export function toRecord(session: Session): WorkoutRecord | null {
  if (session.status !== 'completed' || !session.id || session.startedAt === null || session.finishedAt === null) return null
  return {
    id: session.id, programName: session.program.name, programId: session.program.id,
    startedAt: session.startedAt, finishedAt: session.finishedAt,
    activeSeconds: Math.floor(session.activeMs / 1000),
    plannedSeconds: totalSeconds(session.program), skippedStages: session.skippedStages,
  }
}

export function addRecord(history: WorkoutRecord[], session: Session): WorkoutRecord[] {
  const record = toRecord(session)
  if (!record || history.some((item) => item.id === record.id)) return history
  return [record, ...history].slice(0, 100)
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function timestamp(value: unknown): value is number {
  return nonNegative(value) && value <= 8.64e15
}

/** Treat browser storage as untrusted, including old or manually edited versions. */
export function parseSession(value: unknown): Session | null {
  try {
    if (!isRecord(value) || value.version !== 1) return null
    const program = parseProgram(value.program)
    const totalMs = totalSeconds(program) * 1000
    if (typeof value.status !== 'string' || !['idle', 'running', 'paused', 'completed'].includes(value.status)) return null
    if (!nonNegative(value.elapsedMs) || value.elapsedMs > totalMs || !nonNegative(value.activeMs) || value.activeMs > value.elapsedMs) return null
    if (!Number.isInteger(value.skippedStages) || Number(value.skippedStages) < 0 || Number(value.skippedStages) > program.steps.length) return null
    if (value.status === 'idle') {
      if (value.elapsedMs !== 0 || value.activeMs !== 0 || value.skippedStages !== 0 || value.id !== null || value.anchorAt !== null || value.startedAt !== null || value.finishedAt !== null) return null
      return createSession(program)
    }
    if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 100 || !timestamp(value.startedAt)) return null
    if (value.status === 'running' ? !timestamp(value.anchorAt) || value.anchorAt < value.startedAt : value.anchorAt !== null) return null
    if (value.status === 'completed'
      ? !timestamp(value.finishedAt) || value.finishedAt < value.startedAt || value.elapsedMs !== totalMs
      : value.finishedAt !== null || value.elapsedMs >= totalMs) return null
    return {
      version: 1, program, id: value.id, status: value.status as SessionStatus,
      elapsedMs: value.elapsedMs, activeMs: value.activeMs, anchorAt: value.anchorAt as number | null,
      startedAt: value.startedAt, finishedAt: value.finishedAt as number | null, skippedStages: Number(value.skippedStages),
    }
  } catch { return null }
}

export function parseHistory(value: unknown): WorkoutRecord[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>()
  return value.filter((record): record is WorkoutRecord => {
    if (!isRecord(record) || typeof record.id !== 'string' || record.id.length === 0 || ids.has(record.id) || record.id.length > 100) return false
    if (typeof record.programName !== 'string' || record.programName.length > 60 || typeof record.programId !== 'string' || record.programId.length > 80) return false
    if (!nonNegative(record.startedAt) || !nonNegative(record.finishedAt) || record.finishedAt < record.startedAt || record.finishedAt > 8.64e15) return false
    if (!nonNegative(record.activeSeconds) || !nonNegative(record.plannedSeconds) || record.activeSeconds > record.plannedSeconds || record.plannedSeconds > 21600) return false
    if (!Number.isInteger(record.skippedStages) || Number(record.skippedStages) < 0 || Number(record.skippedStages) > 40) return false
    ids.add(record.id)
    return true
  }).slice(0, 100)
}
