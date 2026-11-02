import { t } from '../i18n'
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
  if (program.id === NORWEGIAN_PROGRAM.id) throw new Error(t().errors.builtInSave)
  const index = programs.findIndex((item) => item.id === program.id)
  if (index !== -1) return programs.map((item, at) => at === index ? program : item)
  if (programs.length >= MAX_CUSTOM_PROGRAMS) throw new Error(t().errors.libraryFull(MAX_CUSTOM_PROGRAMS))
  return [...programs, program]
}
