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

export const KIND_LABELS: Record<StepKind, string> = {
  warmup: '준비',
  work: '운동',
  recovery: '회복',
  cooldown: '정리',
}

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
    throw new Error('반복은 1~20회, 운동은 5초 이상, 각 구간은 120분 이내로 설정해 주세요.')
  }
  const steps: ProgramStep[] = []
  if (warmup > 0) {
    steps.push({ id: 'warmup', kind: 'warmup', name: '워밍업', durationSeconds: warmup, cue: '가볍게 움직이며 몸을 준비하세요.' })
  }
  for (let round = 1; round <= rounds; round++) {
    steps.push({ id: `work-${round}`, kind: 'work', name: `운동 ${round}`, durationSeconds: work, cue: '몸 상태에 맞는 속도로 움직이세요.' })
    // Recovery belongs BETWEEN rounds, never after the final work interval.
    if (round < rounds && recovery > 0) {
      steps.push({ id: `recovery-${round}`, kind: 'recovery', name: '활동성 회복', durationSeconds: recovery, cue: '천천히 움직이며 호흡을 고르세요.' })
    }
  }
  if (cooldown > 0) {
    steps.push({ id: 'cooldown', kind: 'cooldown', name: '쿨다운', durationSeconds: cooldown, cue: '서서히 속도를 낮추며 마무리하세요.' })
  }
  if (steps.length > MAX_STEPS || steps.reduce((sum, step) => sum + step.durationSeconds, 0) > MAX_PROGRAM_SECONDS) {
    throw new Error(`전체 ${MAX_STEPS}구간, 6시간 이내로 구성해 주세요.`)
  }
  return steps
}

export const NORWEGIAN_PROGRAM: Program = {
  schemaVersion: 1,
  id: 'norwegian-4x4',
  name: '노르웨지안 4×4',
  description: '4분의 몰입과 3분의 회복. 심폐 체력을 위한 네 번의 인터벌.',
  steps: createIntervalSteps({ warmup: 600, work: 240, recovery: 180, rounds: 4, cooldown: 300 }).map((step) => ({
    ...step,
    name: step.kind === 'work' ? step.name.replace('운동', '고강도') : step.name,
    target: step.kind === 'work' ? { min: 85, max: 95 } : { min: 60, max: 70 },
    cue: step.kind === 'work'
      ? '처음 1–2분은 서서히 강도를 올려요. 전력 질주는 아니에요.'
      : step.kind === 'recovery'
        ? '멈추기보다 천천히 걸어요. 회복도 운동의 일부예요.'
        : step.kind === 'cooldown'
          ? '천천히 걸으며 마무리해요. 호흡이 편안해질 때까지.'
          : '편하게 대화할 수 있는 속도로 몸을 깨워요.',
  })),
}

export function totalSeconds(program: Program): number {
  return program.steps.reduce((sum, step) => sum + step.durationSeconds, 0)
}

export function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(rounded / 60).toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return [minutes ? `${minutes}분` : '', rest ? `${rest}초` : ''].filter(Boolean).join(' ') || '0초'
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
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error('지원하지 않는 프로그램 형식이에요. schemaVersion: 1 파일을 선택해 주세요.')
  if (!validId(value.id) || !boundedText(value.name, 60) || !boundedText(value.description, 180, false)) {
    throw new Error('프로그램 이름(60자 이하), 설명(180자 이하), ID를 확인해 주세요.')
  }
  if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > MAX_STEPS) {
    throw new Error(`프로그램은 1~${MAX_STEPS}개의 구간으로 구성해 주세요.`)
  }
  const ids = new Set<string>()
  const steps = value.steps.map((step: unknown, index): ProgramStep => {
    const label = `${index + 1}번째 구간`
    if (!isRecord(step) || !validId(step.id) || ids.has(step.id)) throw new Error(`${label}의 고유 ID를 확인해 주세요.`)
    ids.add(step.id)
    if (!boundedText(step.name, 50) || !boundedText(step.cue, 200, false)) throw new Error(`${label}의 이름 또는 안내 문구가 너무 길거나 비어 있어요.`)
    if (typeof step.kind !== 'string' || !Object.hasOwn(KIND_LABELS, step.kind)) throw new Error(`${label}의 유형은 warmup, work, recovery, cooldown 중 하나여야 해요.`)
    if (!Number.isInteger(step.durationSeconds) || Number(step.durationSeconds) < 5 || Number(step.durationSeconds) > 7200) {
      throw new Error(`${label}의 시간은 5초~120분 사이의 정수(초)로 입력해 주세요.`)
    }
    let target: HeartRateTarget | undefined
    if (step.target !== undefined) {
      if (!isRecord(step.target) || !Number.isInteger(step.target.min) || !Number.isInteger(step.target.max)
        || Number(step.target.min) < 40 || Number(step.target.max) > 100 || Number(step.target.min) >= Number(step.target.max)) {
        throw new Error(`${label}의 심박수 목표는 40~100% 범위에서 최솟값 < 최댓값으로 입력해 주세요.`)
      }
      target = { min: Number(step.target.min), max: Number(step.target.max) }
    }
    return { id: step.id, name: step.name.trim(), kind: step.kind as StepKind, durationSeconds: Number(step.durationSeconds), cue: step.cue.trim(), ...(target ? { target } : {}) }
  })
  const program: Program = { schemaVersion: 1, id: value.id, name: value.name.trim(), description: value.description.trim(), steps }
  if (totalSeconds(program) > MAX_PROGRAM_SECONDS) throw new Error('프로그램 전체 길이는 6시간 이내로 설정해 주세요.')
  return program
}

export function importProgram(json: string): Program {
  if (new TextEncoder().encode(json).byteLength > 100_000) throw new Error('프로그램 파일은 100KB 이하만 가져올 수 있어요.')
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new Error('올바른 JSON 파일이 아니에요.') }
  const program = parseProgram(value)
  // Imported files cannot overwrite a built-in program or a different local program.
  return { ...program, id: newId('custom-') }
}
