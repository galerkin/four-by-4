import { useEffect, useReducer } from 'react'
import { isRecord, NORWEGIAN_PROGRAM, type Program } from '../lib/programs'
import { readStored, writeStored } from '../lib/storage'
import { addRecord, createSession, parseHistory, parseSession, pauseSession, resumeSession, sessionPosition, settleSession, skipStep, startSession, type Session, type WorkoutRecord } from '../lib/timer'

interface State {
  session: Session
  history: WorkoutRecord[]
  now: number
  restored: boolean
}

type Action =
  | { type: 'tick' | 'pause' | 'resume' | 'reset'; now: number }
  | { type: 'toggle'; now: number; id: string }
  | { type: 'skip'; now: number; resume: boolean }
  | { type: 'select'; now: number; program: Program }
  | { type: 'clearHistory' | 'dismissRestored'; now: number }

function initialState(): State {
  const now = Date.now()
  const saved = readStored('workout')
  if (isRecord(saved) && saved.version === 1) {
    const parsed = parseSession(saved.session)
    const history = parseHistory(saved.history)
    if (parsed) {
      const session = settleSession(parsed, now)
      // Only append a newly completed background session, not a previously cleared record.
      return { session, history: session !== parsed ? addRecord(history, session) : history, now, restored: parsed.status === 'running' || parsed.status === 'paused' }
    }
    return { session: createSession(NORWEGIAN_PROGRAM), history, now, restored: false }
  }
  return { session: createSession(NORWEGIAN_PROGRAM), history: [], now, restored: false }
}

function reducer(state: State, action: Action): State {
  let session = state.session
  switch (action.type) {
    case 'tick': session = settleSession(session, action.now); break
    case 'toggle':
      if (session.status === 'idle') session = startSession(session, action.now, action.id)
      else if (session.status === 'running') session = pauseSession(session, action.now)
      else if (session.status === 'paused') session = resumeSession(session, action.now)
      else session = createSession(session.program)
      break
    case 'pause': session = pauseSession(session, action.now); break
    case 'resume': session = resumeSession(session, action.now); break
    case 'reset': session = createSession(session.program); break
    case 'skip':
      session = skipStep(session, action.now)
      if (action.resume) session = resumeSession(session, action.now)
      break
    case 'select':
      if (session.status === 'idle' || session.status === 'completed') session = createSession(action.program)
      break
    case 'clearHistory': return { ...state, history: [], now: action.now }
    case 'dismissRestored': return { ...state, restored: false }
  }
  return { ...state, now: action.now, session, history: session !== state.session ? addRecord(state.history, session) : state.history }
}

export function useWorkout() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    writeStored('workout', { version: 1, session: state.session, history: state.history })
  }, [state.session, state.history])

  useEffect(() => {
    if (state.session.status !== 'running') return
    const tick = () => dispatch({ type: 'tick', now: Date.now() })
    const interval = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [state.session.status])

  return { ...state, position: sessionPosition(state.session, state.now), dispatch }
}
