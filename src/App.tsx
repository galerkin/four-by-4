import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, History, Languages, Layers3, Settings2, Smartphone, X } from 'lucide-react'
import { BenefitCard } from './components/BenefitCard'
import { GuideDialog, InstallDialog } from './components/GuideDialog'
import { HistoryDialog } from './components/HistoryDialog'
import { LibraryDialog } from './components/LibraryDialog'
import { Modal } from './components/Modal'
import { ProgramEditor } from './components/ProgramEditor'
import { ProgramOverview } from './components/ProgramOverview'
import { SettingsDialog } from './components/SettingsDialog'
import { TimerCard } from './components/TimerCard'
import { usePwa } from './hooks/usePwa'
import { useWakeLock } from './hooks/useWakeLock'
import { useWorkout } from './hooks/useWorkout'
import { playCue, unlockAudio } from './lib/audio'
import { newId } from './lib/ids'
import { parseLibrary, saveToLibrary } from './lib/library'
import { DICTIONARIES, I18nContext, setLanguage } from './i18n'
import { localizeProgram, NORWEGIAN_PROGRAM, type Program } from './lib/programs'
import { readPreferences, readStored, useStorageAvailable, writeStored } from './lib/storage'

type DialogState =
  | { type: 'settings' | 'guide' | 'install' | 'history' | 'library' }
  | { type: 'editor'; program: Program | null }
  | { type: 'confirm'; action: 'reset' | 'skip'; wasRunning: boolean }
  | null

export default function App() {
  const workout = useWorkout()
  const [preferences, setPreferences] = useState(readPreferences)
  // Plain library code (durations, validation messages, generated names) reads the active language
  // synchronously, so it is set before anything below renders. Korean is the default.
  setLanguage(preferences.language)
  const text = DICTIONARIES[preferences.language]
  const { dispatch } = workout
  // The built-in program is shown in the current language, whatever language it was saved in.
  const viewProgram = localizeProgram(workout.session.program)
  const session = viewProgram === workout.session.program ? workout.session : { ...workout.session, program: viewProgram }
  const position = { ...workout.position, step: viewProgram.steps[workout.position.stepIndex] ?? workout.position.step }
  const [programs, setPrograms] = useState(() => parseLibrary(readStored('programs')))
  const [dialog, setDialog] = useState<DialogState>(null)
  const [toast, setToast] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  const busy = session.status === 'running' || session.status === 'paused'
  const wakeActive = useWakeLock(preferences.keepAwake && session.status === 'running')
  const storageAvailable = useStorageAvailable()
  const pwa = usePwa()
  const lastCue = useRef<string | null>(null)
  // Wake Lock is requested asynchronously; only warn if it is still unavailable after a moment.
  const wakeWanted = preferences.keepAwake && session.status === 'running'
  // Keep the workout screen clean: a keep-screen-on problem is only mentioned before the next start —
  // when the browser has no Wake Lock, or it failed during this visit.
  const [wakeFailed, setWakeFailed] = useState(false)
  const wakeActiveRef = useRef(wakeActive)
  useEffect(() => { wakeActiveRef.current = wakeActive }, [wakeActive])
  useEffect(() => {
    if (!wakeWanted) return
    const timeout = window.setTimeout(() => { if (!wakeActiveRef.current) setWakeFailed(true) }, 2000)
    return () => window.clearTimeout(timeout)
  }, [wakeWanted])
  const wakeWarning = preferences.keepAwake && session.status === 'idle' && (wakeFailed || !('wakeLock' in navigator))
  // Play mode is a single full screen: bring it into view when a workout starts.
  useEffect(() => { if (busy) window.scrollTo({ top: 0 }) }, [busy])
  const openLibrary = () => setDialog({ type: 'library' })

  useEffect(() => { writeStored('preferences', preferences) }, [preferences])
  useEffect(() => {
    document.documentElement.lang = preferences.language
    document.title = text.meta.title
  }, [preferences.language, text])
  useEffect(() => { writeStored('programs', { version: 1, programs }) }, [programs])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  const completed = session.status === 'completed'
  const phase = completed ? 'done' : position.step.kind
  useEffect(() => {
    // The whole viewport takes the current phase color, including the iOS status bar.
    document.documentElement.dataset.phase = phase
    const colors = { warmup: '#fff1a6', work: '#a8f0c4', recovery: '#ffb1b8', cooldown: '#ffb1b8', done: '#e9ebee' }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[phase])
  }, [phase])
  // Step progress fills the whole screen with the saturated phase color: a left→right sweep
  // (default) or a circle growing from the countdown. `?bg=sweep|circle` overrides for previews.
  const fillOverride = new URLSearchParams(window.location.search).get('bg')
  const fillStyle = fillOverride === 'sweep' || fillOverride === 'circle' ? fillOverride : preferences.fill
  const stepFill = Math.min(1, Math.max(0, completed ? 1 : session.status === 'idle' ? 0 : position.stepProgress))
  useEffect(() => {
    const root = document.documentElement
    root.dataset.bg = fillStyle
    root.style.setProperty('--step-progress', String(stepFill))
    if (fillStyle !== 'circle') return
    const place = () => {
      const timer = document.querySelector('[role="timer"]')?.getBoundingClientRect()
      const x = timer ? timer.left + timer.width / 2 : window.innerWidth / 2
      const y = timer ? timer.top + timer.height / 2 : window.innerHeight / 2
      const reach = Math.max(...[[0, 0], [window.innerWidth, 0], [0, window.innerHeight], [window.innerWidth, window.innerHeight]].map(([cx, cy]) => Math.hypot(cx - x, cy - y)))
      root.style.setProperty('--fill-x', `${Math.round(x)}px`)
      root.style.setProperty('--fill-y', `${Math.round(y)}px`)
      root.style.setProperty('--fill-reach', `${Math.ceil(reach)}px`)
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place) }
  }, [fillStyle, stepFill])
  useEffect(() => {
    const key = session.id ? `${session.id}:${position.stepIndex}:${completed}` : null
    if (key && lastCue.current && key !== lastCue.current && preferences.sound) playCue(completed)
    lastCue.current = key
  }, [session.id, position.stepIndex, completed, preferences.sound])

  function confirm(action: 'reset' | 'skip') {
    const wasRunning = session.status === 'running'
    if (wasRunning) dispatch({ type: 'pause', now: Date.now() })
    setDialog({ type: 'confirm', action, wasRunning })
  }
  function closeDialog() {
    if (dialog?.type === 'confirm' && dialog.wasRunning) dispatch({ type: 'resume', now: Date.now() })
    setDialog(null)
  }
  function saveProgram(program: Program) {
    const next = saveToLibrary(programs, program)
    setPrograms(next)
    dispatch({ type: 'select', program, now: Date.now() })
    setDialog(null)
    setToast(text.app.programSaved)
  }
  const norwegian = session.program.id === NORWEGIAN_PROGRAM.id

  return <I18nContext.Provider value={text}>
    <a className="skip-link" href="#workout">{text.app.skipLink}</a>
    <div className={`app-shell ${busy ? 'is-working' : ''}`}>
      <header className="site-header" inert={busy}>
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label={text.app.home}><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>four by four</span></a>
        <nav aria-label={text.app.mainMenu}><button onClick={openLibrary} aria-label={text.app.programs}><Layers3 size={18} /><span>{text.app.programs}</span></button><button onClick={() => setDialog({ type: 'history' })} aria-label={text.app.history}><History size={18} /><span>{text.app.history}</span></button></nav>
        <button className="header-settings" onClick={() => setDialog({ type: 'settings' })} aria-label={text.app.settings}><Settings2 size={20} /></button>
      </header>
      <main id="workout">
        <h1 className="sr-only">{text.app.heading}</h1>
        {!storageAvailable && <div className="app-notice warning" role="alert">{text.app.storageWarning}</div>}
        {workout.restored && <div className="app-notice restore-notice"><p>{text.app.restored}</p><div className="restore-actions">{preferences.sound && session.status === 'running' && <button className="secondary-button" onClick={() => { unlockAudio(); dispatch({ type: 'dismissRestored', now: Date.now() }) }}>{text.app.reenableSound}</button>}<button className="icon-button" aria-label={text.app.dismissRestored} onClick={() => dispatch({ type: 'dismissRestored', now: Date.now() })}><X size={18} /></button></div></div>}
        {!online && <div className="app-notice"><span>{text.app.offline}</span></div>}
        <div className="dashboard">
          <TimerCard session={session} position={position} profile={preferences.profile} sound={preferences.sound} wakeWarning={wakeWarning} onPrograms={openLibrary} onSettings={() => setDialog({ type: 'settings' })} onSound={() => { if (!preferences.sound) unlockAudio(); setPreferences((value) => ({ ...value, sound: !value.sound })) }} onToggle={() => { if (preferences.sound) unlockAudio(); dispatch({ type: 'toggle', now: Date.now(), id: newId('session-') }) }} onReset={() => confirm('reset')} onSkip={() => confirm('skip')} />
          <ProgramOverview program={session.program} stepIndex={position.stepIndex} complete={completed} busy={busy} onEdit={() => setDialog({ type: 'editor', program: session.program })} />
          <BenefitCard stepIndex={position.stepIndex} norwegian={norwegian} onGuide={() => setDialog({ type: 'guide' })} />
        </div>
        <nav className="page-links" aria-label={text.app.help}><button className="text-button" onClick={() => setDialog({ type: 'guide' })}><BookOpen size={17} />{text.app.guide}</button><button className="text-button" onClick={() => setDialog({ type: 'install' })}><Smartphone size={17} />{text.app.install}</button><button className="text-button" lang={preferences.language === 'ko' ? 'en' : 'ko'} aria-label={text.app.switchLanguageLabel} onClick={() => setPreferences((value) => ({ ...value, language: value.language === 'ko' ? 'en' : 'ko' }))}><Languages size={17} />{text.app.switchLanguage}</button></nav>
        <p className="page-safety">{text.app.safety}<button className="inline-link" onClick={() => setDialog({ type: 'guide' })}>{text.app.safetyLink}</button></p>
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" onClick={() => setToast('')} aria-label={text.app.closeToast}><X size={16} /></button></div>}
    {pwa.updateReady && <div className="update-notice" role="status"><p>{text.app.updateReady}</p><div><button className="primary-button" disabled={busy || dialog !== null} onClick={pwa.update}>{text.app.update}</button><button className="text-button" onClick={pwa.dismiss}>{text.app.later}</button></div></div>}
    {dialog?.type === 'settings' && <SettingsDialog preferences={preferences} onClose={closeDialog} onSave={(value) => { if (value.sound) unlockAudio(); setPreferences(value); setDialog(null); setToast(DICTIONARIES[value.language].app.settingsSaved) }} />}
    {dialog?.type === 'guide' && <GuideDialog onClose={closeDialog} />}
    {dialog?.type === 'install' && <InstallDialog onClose={closeDialog} />}
    {dialog?.type === 'history' && <HistoryDialog history={workout.history} onClear={() => dispatch({ type: 'clearHistory', now: Date.now() })} onClose={closeDialog} />}
    {dialog?.type === 'library' && <LibraryDialog programs={programs} selectedId={session.program.id} busy={busy} onClose={closeDialog} onSelect={(program) => { dispatch({ type: 'select', program, now: Date.now() }); setDialog(null) }} onEdit={(program) => setDialog({ type: 'editor', program })} onImport={(program) => setPrograms(saveToLibrary(programs, program))} onDelete={(id) => { setPrograms((items) => items.filter((item) => item.id !== id)); if (session.program.id === id) dispatch({ type: 'select', program: localizeProgram(NORWEGIAN_PROGRAM), now: Date.now() }) }} />}
    {dialog?.type === 'editor' && <ProgramEditor program={dialog.program} onSave={saveProgram} onClose={closeDialog} />}
    {dialog?.type === 'confirm' && <Modal title={dialog.action === 'reset' ? text.confirm.resetTitle : text.confirm.skipTitle} subtitle={text.confirm.paused} onClose={closeDialog}><p className="confirmation-copy">{dialog.action === 'reset' ? text.confirm.resetBody : text.confirm.skipBody(position.step.name)}</p><div className="confirmation-actions"><button className="secondary-button" onClick={closeDialog}>{dialog.wasRunning ? text.confirm.keepGoing : text.confirm.cancel}</button><button className="primary-button" onClick={() => { if (dialog.action === 'reset') dispatch({ type: 'reset', now: Date.now() }); else dispatch({ type: 'skip', now: Date.now(), resume: dialog.wasRunning }); setDialog(null) }}>{dialog.action === 'reset' ? text.confirm.reset : text.confirm.skip}</button></div></Modal>}
  </I18nContext.Provider>
}
