import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, History, Layers3, Settings2, Smartphone, X } from 'lucide-react'
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
import { NORWEGIAN_PROGRAM, type Program } from './lib/programs'
import { readPreferences, readStored, useStorageAvailable, writeStored } from './lib/storage'

type DialogState =
  | { type: 'settings' | 'guide' | 'install' | 'history' | 'library' }
  | { type: 'editor'; program: Program | null }
  | { type: 'confirm'; action: 'reset' | 'skip'; wasRunning: boolean }
  | null

export default function App() {
  const workout = useWorkout()
  const { session, position, dispatch } = workout
  const [preferences, setPreferences] = useState(readPreferences)
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
    setToast('프로그램을 저장했어요. 준비되면 시작하세요.')
  }
  const norwegian = session.program.id === NORWEGIAN_PROGRAM.id

  return <>
    <a className="skip-link" href="#workout">운동 타이머로 바로가기</a>
    <div className={`app-shell ${busy ? 'is-working' : ''}`}>
      <header className="site-header" inert={busy}>
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="four by four 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>four by four</span></a>
        <nav aria-label="메인 메뉴"><button onClick={openLibrary} aria-label="프로그램"><Layers3 size={18} /><span>프로그램</span></button><button onClick={() => setDialog({ type: 'history' })} aria-label="기록"><History size={18} /><span>기록</span></button></nav>
        <button className="header-settings" onClick={() => setDialog({ type: 'settings' })} aria-label="개인 설정"><Settings2 size={20} /></button>
      </header>
      <main id="workout">
        <h1 className="sr-only">four by four 운동 타이머</h1>
        {!storageAvailable && <div className="app-notice warning" role="alert">브라우저에 저장할 수 없어요. 새로고침하면 기록·설정이 사라질 수 있어요.</div>}
        {workout.restored && <div className="app-notice restore-notice"><p>이전 타이머를 이어서 보여드려요.</p><div className="restore-actions">{preferences.sound && session.status === 'running' && <button className="secondary-button" onClick={() => { unlockAudio(); dispatch({ type: 'dismissRestored', now: Date.now() }) }}>알림음 다시 활성화</button>}<button className="icon-button" aria-label="복원 안내 닫기" onClick={() => dispatch({ type: 'dismissRestored', now: Date.now() })}><X size={18} /></button></div></div>}
        {!online && <div className="app-notice"><span>오프라인 · 타이머는 계속 작동해요.</span></div>}
        <div className="dashboard">
          <TimerCard session={session} position={position} profile={preferences.profile} sound={preferences.sound} wakeWarning={wakeWarning} onPrograms={openLibrary} onSettings={() => setDialog({ type: 'settings' })} onSound={() => { if (!preferences.sound) unlockAudio(); setPreferences((value) => ({ ...value, sound: !value.sound })) }} onToggle={() => { if (preferences.sound) unlockAudio(); dispatch({ type: 'toggle', now: Date.now(), id: newId('session-') }) }} onReset={() => confirm('reset')} onSkip={() => confirm('skip')} />
          <ProgramOverview program={session.program} stepIndex={position.stepIndex} complete={completed} busy={busy} onEdit={() => setDialog({ type: 'editor', program: session.program })} />
          <BenefitCard stepIndex={position.stepIndex} norwegian={norwegian} onGuide={() => setDialog({ type: 'guide' })} />
        </div>
        <nav className="page-links" aria-label="도움말"><button className="text-button" onClick={() => setDialog({ type: 'guide' })}><BookOpen size={17} />운동·안전 가이드</button><button className="text-button" onClick={() => setDialog({ type: 'install' })}><Smartphone size={17} />홈 화면에 추가</button></nav>
        <p className="page-safety">가슴 통증·어지럼이 있으면 즉시 중지 · <button className="inline-link" onClick={() => setDialog({ type: 'guide' })}>안전 안내</button></p>
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" onClick={() => setToast('')} aria-label="알림 닫기"><X size={16} /></button></div>}
    {pwa.updateReady && <div className="update-notice" role="status"><p>새 버전이 있어요. 운동과 편집을 마친 뒤 업데이트해 주세요.</p><div><button className="primary-button" disabled={busy || dialog !== null} onClick={pwa.update}>업데이트</button><button className="text-button" onClick={pwa.dismiss}>나중에</button></div></div>}
    {dialog?.type === 'settings' && <SettingsDialog preferences={preferences} onClose={closeDialog} onSave={(value) => { if (value.sound) unlockAudio(); setPreferences(value); setDialog(null); setToast('내 페이스에 맞게 설정했어요.') }} />}
    {dialog?.type === 'guide' && <GuideDialog onClose={closeDialog} />}
    {dialog?.type === 'install' && <InstallDialog onClose={closeDialog} />}
    {dialog?.type === 'history' && <HistoryDialog history={workout.history} onClear={() => dispatch({ type: 'clearHistory', now: Date.now() })} onClose={closeDialog} />}
    {dialog?.type === 'library' && <LibraryDialog programs={programs} selectedId={session.program.id} busy={busy} onClose={closeDialog} onSelect={(program) => { dispatch({ type: 'select', program, now: Date.now() }); setDialog(null) }} onEdit={(program) => setDialog({ type: 'editor', program })} onImport={(program) => setPrograms(saveToLibrary(programs, program))} onDelete={(id) => { setPrograms((items) => items.filter((item) => item.id !== id)); if (session.program.id === id) dispatch({ type: 'select', program: NORWEGIAN_PROGRAM, now: Date.now() }) }} />}
    {dialog?.type === 'editor' && <ProgramEditor program={dialog.program} onSave={saveProgram} onClose={closeDialog} />}
    {dialog?.type === 'confirm' && <Modal title={dialog.action === 'reset' ? '처음부터 다시 시작할까요?' : '현재 구간을 건너뛸까요?'} subtitle="타이머를 잠시 멈췄어요." onClose={closeDialog}><p className="confirmation-copy">{dialog.action === 'reset' ? '이번 진행은 기록하지 않고 초기화해요. 저장된 프로그램과 이전 운동 기록은 그대로 유지돼요.' : `‘${position.step.name}’의 남은 시간을 건너뛰어요. 건너뛴 시간은 실제 진행 시간에 포함하지 않고, 기록은 ‘일부 진행’으로 남아요.`}</p><div className="confirmation-actions"><button className="secondary-button" onClick={closeDialog}>{dialog.wasRunning ? '계속 운동하기' : '취소'}</button><button className="primary-button" onClick={() => { if (dialog.action === 'reset') dispatch({ type: 'reset', now: Date.now() }); else dispatch({ type: 'skip', now: Date.now(), resume: dialog.wasRunning }); setDialog(null) }}>{dialog.action === 'reset' ? '초기화' : '구간 건너뛰기'}</button></div></Modal>}
  </>
}
