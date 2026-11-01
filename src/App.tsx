import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, Check, Clock3, History, Layers3, Leaf, Monitor, Settings2, ShieldCheck, Smartphone, X } from 'lucide-react'
import { BenefitCard } from './components/BenefitCard'
import { GuideDialog, InstallDialog } from './components/GuideDialog'
import { HeartRateCard } from './components/HeartRateCard'
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
import { formatDuration, NORWEGIAN_PROGRAM, totalSeconds, type Program } from './lib/programs'
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
  const showBenefits = !(session.status === 'running' && position.step.kind === 'work')

  return <>
    <a className="skip-link" href="#workout">운동 타이머로 바로가기</a>
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="four by four 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>four by four<span className="wordmark-caption">A LITTLE STRONGER, EVERY DAY</span></span></a>
        <nav aria-label="메인 메뉴"><span className="active-nav"><span />운동하기</span><button onClick={openLibrary}><Layers3 size={17} /><span>프로그램</span></button><button onClick={() => setDialog({ type: 'history' })}><History size={17} /><span>내 기록</span></button></nav>
        <button className="header-settings" onClick={() => setDialog({ type: 'settings' })} aria-label="개인 설정"><Settings2 size={19} /><span>설정</span></button>
      </header>
      <main id="workout">
        <section className="intro-section" aria-labelledby="page-title"><div><p className="eyebrow"><span />LESS THINKING. MORE MOVING.</p><h1 id="page-title">움직임에만 집중하세요.</h1><p className="intro-description">순서와 시간은 맡겨두고, 오늘도 내 페이스로.</p></div><div className="daily-note"><span className="daily-leaf"><Leaf size={22} strokeWidth={1.6} /></span><span>나를 위한 작은 약속<strong>오늘의 {formatDuration(totalSeconds(session.program))}</strong></span></div></section>
        {!storageAvailable && <div className="app-notice warning" role="alert">브라우저에 저장할 수 없어요. 타이머는 작동하지만 새로고침하면 기록·설정이 사라질 수 있어요. 중요한 프로그램은 파일로 내보내 주세요.</div>}
        {workout.restored && <div className="app-notice restore-notice"><div><p>이전 타이머를 복원했어요. 진행 중이던 타이머는 화면을 닫아 둔 시간도 반영해요.</p>{preferences.sound && session.status === 'running' && <small>새로고침 후 알림음은 버튼을 한 번 눌러 다시 활성화해 주세요.</small>}</div><div className="restore-actions">{preferences.sound && session.status === 'running' && <button className="secondary-button" onClick={() => { unlockAudio(); dispatch({ type: 'dismissRestored', now: Date.now() }) }}>알림음 다시 활성화</button>}<button className="icon-button" aria-label="복원 안내 닫기" onClick={() => dispatch({ type: 'dismissRestored', now: Date.now() })}><X size={17} /></button></div></div>}
        {!online && <div className="app-notice"><span>오프라인이에요. 이미 열린 타이머는 인터넷 없이 계속 사용할 수 있어요.</span></div>}
        <div className="dashboard">
          <TimerCard session={session} position={position} profile={preferences.profile} sound={preferences.sound} wakeActive={wakeActive} onPrograms={openLibrary} onSound={() => { if (!preferences.sound) unlockAudio(); setPreferences((value) => ({ ...value, sound: !value.sound })) }} onToggle={() => { if (preferences.sound) unlockAudio(); dispatch({ type: 'toggle', now: Date.now(), id: newId('session-') }) }} onReset={() => confirm('reset')} onSkip={() => confirm('skip')} />
          <ProgramOverview program={session.program} stepIndex={position.stepIndex} complete={completed} busy={busy} onEdit={() => setDialog({ type: 'editor', program: session.program })} />
          <HeartRateCard step={position.step} profile={preferences.profile} onSettings={() => setDialog({ type: 'settings' })} />
          {showBenefits ? <BenefitCard stepIndex={position.stepIndex} norwegian={norwegian} onGuide={() => setDialog({ type: 'guide' })} /> : <aside className="focus-note"><div className="petal-art" aria-hidden="true"><i /><i /><i /><i /></div><span className="tiny-label">ONE STEP AT A TIME</span><h2>지금은, 나의 움직임에만.</h2><p>시간은 앱이 챙길게요.<br />몸의 느낌을 살피며 내 페이스를 이어가세요.</p><span className="focus-note-foot">회복 구간이 되면 짧은 코칭을 다시 보여드릴게요.</span></aside>}
          <aside className="everywhere-card"><div className="device-icons"><Monitor size={23} strokeWidth={1.5} /><span>+</span><Smartphone size={21} strokeWidth={1.5} /></div><h2>어디서든, 나의 페이스.</h2><p>책상 앞에서도, 운동하는 곳에서도.<br />iPhone 홈 화면에 두고 더 가깝게 사용하세요.</p><button className="text-button" onClick={() => setDialog({ type: 'install' })}>홈 화면에 추가하는 방법<ArrowUpRight size={16} /></button><span className="local-data-note"><ShieldCheck size={13} />로그인 없이 · 기록은 이 기기에만</span></aside>
        </div>
        <div className="safety-banner"><ShieldCheck size={20} /><p><strong>내 몸의 신호가 먼저예요.</strong> 가슴 통증·어지럼·비정상적인 호흡곤란이 생기면 즉시 멈추세요. 질환이나 복용 약물이 있다면 고강도 운동 전에 의료진과 상의하세요.</p><button className="text-button" onClick={() => setDialog({ type: 'guide' })}><BookOpen size={15} />운동 가이드</button></div>
      </main>
      <footer className="site-footer"><span>MADE FOR YOUR NEXT MOVE.</span><span><Clock3 size={13} />한 번에 한 구간씩, 꾸준히.</span></footer>
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
