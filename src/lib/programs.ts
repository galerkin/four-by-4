import { t } from '../i18n'
import { newId } from './ids'

export type StepKind = 'warmup' | 'work' | 'recovery' | 'cooldown'

export interface HeartRateTarget {
  min: number
  max: number
}

export interface ProgramStep {
  id: string
  name: string
  kind: StepKind
  durationSeconds: number
  cue: string
  target?: HeartRateTarget
}

/** A program is data, not executable code. The runner knows nothing about 4×4. */
export interface Program {
  schemaVersion: 1
  id: string
  name: string
  description: string
  steps: ProgramStep[]
}

export const STEP_KINDS: StepKind[] = ['warmup', 'work', 'recovery', 'cooldown']

export const MAX_STEPS = 40
export const MAX_PROGRAM_SECONDS = 6 * 60 * 60
export const MAX_CUSTOM_PROGRAMS = 20

export function createIntervalSteps(options: {
  warmup: number
  work: number
  recovery: number
  rounds: number
  cooldown: number
}): ProgramStep[] {
  const { warmup, work, recovery, rounds, cooldown } = options
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20
    || ![warmup, work, recovery, cooldown].every((time) => Number.isInteger(time) && time >= 0 && time <= 7200)
    || work < 5 || [warmup, recovery, cooldown].some((time) => time > 0 && time < 5)) {
    throw new Error(t().errors.recipe)
  }
  const text = t().generated
  const steps: ProgramStep[] = []
  if (warmup > 0) {
    steps.push({ id: 'warmup', kind: 'warmup', name: text.warmup, durationSeconds: warmup, cue: text.cues.warmup })
  }
  for (let round = 1; round <= rounds; round++) {
    steps.push({ id: `work-${round}`, kind: 'work', name: text.work(round), durationSeconds: work, cue: text.cues.work })
    // Recovery belongs BETWEEN rounds, never after the final work interval.
    if (round < rounds && recovery > 0) {
      steps.push({ id: `recovery-${round}`, kind: 'recovery', name: text.recovery, durationSeconds: recovery, cue: text.cues.recovery })
    }
  }
  if (cooldown > 0) {
    steps.push({ id: 'cooldown', kind: 'cooldown', name: text.cooldown, durationSeconds: cooldown, cue: text.cues.cooldown })
  }
  if (steps.length > MAX_STEPS || steps.reduce((sum, step) => sum + step.durationSeconds, 0) > MAX_PROGRAM_SECONDS) {
    throw new Error(t().errors.tooManySteps(MAX_STEPS))
  }
  return steps
}

const NORWEGIAN_ID = 'norwegian-4x4'
const NORWEGIAN_STEPS = createIntervalSteps({ warmup: 600, work: 240, recovery: 180, rounds: 4, cooldown: 300 })

/** The built-in Norwegian 4×4 program, with names and cues in the active language. */
export function norwegianProgram(): Program {
  const text = t().builtIn
  return {
    schemaVersion: 1,
    id: NORWEGIAN_ID,
    name: text.name,
    description: text.description,
    steps: NORWEGIAN_STEPS.map((step) => ({
      ...step,
      name: step.kind === 'work' ? text.work(Number(step.id.split('-')[1])) : text[step.kind],
      target: step.kind === 'work' ? { min: 85, max: 95 } : { min: 60, max: 70 },
      cue: text.cues[step.kind],
    })),
  }
}

/** The built-in program as first loaded (Korean is the default language). */
export const NORWEGIAN_PROGRAM: Program = norwegianProgram()

/**
 * Built-in programs are shown in the active language even if a session saved them in another one.
 * User programs are shown exactly as written.
 */
export function localizeProgram(program: Program): Program {
  if (program.id !== NORWEGIAN_ID) return program
  const localized = norwegianProgram()
  const byId = new Map(localized.steps.map((step) => [step.id, step]))
  return { ...program, name: localized.name, description: localized.description, steps: program.steps.map((step) => ({ ...step, name: byId.get(step.id)?.name ?? step.name, cue: byId.get(step.id)?.cue ?? step.cue })) }
}

export function totalSeconds(program: Program): number {
  return program.steps.reduce((sum, step) => sum + step.durationSeconds, 0)
}

export function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(rounded / 60).toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  return t().duration(Math.floor(seconds / 60), seconds % 60)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedText(value: unknown, max: number, required = true): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
}

export function parseProgram(value: unknown): Program {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error(t().errors.schema)
  if (!validId(value.id) || !boundedText(value.name, 60) || !boundedText(value.description, 180, false)) {
    throw new Error(t().errors.programFields)
  }
  if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > MAX_STEPS) {
    throw new Error(t().errors.stepCount(MAX_STEPS))
  }
  const ids = new Set<string>()
  const errors = t().errors
  const steps = value.steps.map((step: unknown, index): ProgramStep => {
    const label = errors.stepLabel(index + 1)
    if (!isRecord(step) || !validId(step.id) || ids.has(step.id)) throw new Error(errors.stepId(label))
    ids.add(step.id)
    if (!boundedText(step.name, 50) || !boundedText(step.cue, 200, false)) throw new Error(errors.stepText(label))
    if (typeof step.kind !== 'string' || !STEP_KINDS.includes(step.kind as StepKind)) throw new Error(errors.stepKind(label))
    if (!Number.isInteger(step.durationSeconds) || Number(step.durationSeconds) < 5 || Number(step.durationSeconds) > 7200) {
      throw new Error(errors.stepDuration(label))
    }
    let target: HeartRateTarget | undefined
    if (step.target !== undefined) {
      if (!isRecord(step.target) || !Number.isInteger(step.target.min) || !Number.isInteger(step.target.max)
        || Number(step.target.min) < 40 || Number(step.target.max) > 100 || Number(step.target.min) >= Number(step.target.max)) {
        throw new Error(errors.stepTarget(label))
      }
      target = { min: Number(step.target.min), max: Number(step.target.max) }
    }
    return { id: step.id, name: step.name.trim(), kind: step.kind as StepKind, durationSeconds: Number(step.durationSeconds), cue: step.cue.trim(), ...(target ? { target } : {}) }
  })
  const program: Program = { schemaVersion: 1, id: value.id, name: value.name.trim(), description: value.description.trim(), steps }
  if (totalSeconds(program) > MAX_PROGRAM_SECONDS) throw new Error(t().errors.programLength)
  return program
}

export function importProgram(json: string): Program {
  if (new TextEncoder().encode(json).byteLength > 100_000) throw new Error(t().errors.fileSize)
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new Error(t().errors.json) }
  const program = parseProgram(value)
  // Imported files cannot overwrite a built-in program or a different local program.
  return { ...program, id: newId('custom-') }
}

/** Drops the leading zero of the minutes ("02:31" → "2:31") so the play-mode digits can be larger. */
export const compactTime = (value: string) => value.replace(/^0(?=\d:)/, '')
