import { isRecord, MAX_CUSTOM_PROGRAMS, NORWEGIAN_PROGRAM, parseProgram, type Program } from './programs'

export function parseLibrary(value: unknown): Program[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.programs)) return []
  const programs: Program[] = []
  const ids = new Set([NORWEGIAN_PROGRAM.id])
  for (const candidate of value.programs.slice(0, 100)) {
    try {
      const program = parseProgram(candidate)
      if (ids.has(program.id)) continue
      ids.add(program.id)
      programs.push(program)
      if (programs.length === MAX_CUSTOM_PROGRAMS) break
    } catch { /* A single corrupt program must not discard the rest of the library. */ }
  }
  return programs
}

export function saveToLibrary(programs: Program[], candidate: Program): Program[] {
  const program = parseProgram(candidate)
  if (program.id === NORWEGIAN_PROGRAM.id) throw new Error('기본 프로그램은 복사해서 저장해 주세요.')
  const index = programs.findIndex((item) => item.id === program.id)
  if (index !== -1) return programs.map((item, at) => at === index ? program : item)
  if (programs.length >= MAX_CUSTOM_PROGRAMS) throw new Error(`내 프로그램은 최대 ${MAX_CUSTOM_PROGRAMS}개까지 보관할 수 있어요.`)
  return [...programs, program]
}
