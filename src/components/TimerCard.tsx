import { ArrowRight, Check, ChevronDown, Heart, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { formatTime, KIND_LABELS } from '../lib/programs'
import { heartRateRange, type HeartProfile } from '../lib/storage'
import { type Session, type sessionPosition } from '../lib/timer'

interface Props {
  session: Session
  position: ReturnType<typeof sessionPosition>
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
  onPrograms: () => void
  onSettings: () => void
  sound: boolean
  onSound: () => void
  wakeWarning: boolean
  profile: HeartProfile | null
}

export function TimerCard({ session, position, onToggle, onReset, onSkip, onPrograms, onSettings, sound, onSound, wakeWarning, profile }: Props) {
  const { step, stepIndex, remainingSeconds, progress, elapsedMs, totalMs } = position
  const steps = session.program.steps
  const complete = session.status === 'completed'
  const active = session.status === 'running'
  const idle = session.status === 'idle'
  const next = steps[stepIndex + 1]
  const bpm = profile && step.target ? heartRateRange(profile, step.target) : null
  const works = steps.filter((item) => item.kind === 'work')
  const count = step.kind === 'work' && works.length > 1
    ? `인터벌 ${steps.slice(0, stepIndex + 1).filter((item) => item.kind === 'work').length}/${works.length}`
    : `${stepIndex + 1}/${steps.length}`
  const buttonText = active ? '일시정지' : session.status === 'paused' ? '이어서 운동' : complete ? '다시 준비하기' : '운동 시작'
  return (
    <section className={`timer-card phase-${step.kind} ${complete ? 'timer-complete' : ''}`} aria-label="운동 타이머">
      <div className="timer-toolbar">
        {active
          ? <span className="program-name">{session.program.name}</span>
          : <button className="program-picker" onClick={onPrograms} aria-label={`프로그램 변경: ${session.program.name}`}><strong>{session.program.name}<ChevronDown size={18} /></strong></button>}
        <button className="icon-button timer-sound" aria-label={sound ? '알림음 끄기' : '알림음 켜기'} aria-pressed={sound} onClick={onSound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </div>
      <div className="stage-panel">
        {!complete && <span className="step-count">{count}{session.status === 'paused' && <span className="paused-badge">일시정지</span>}</span>}
        <h2>{complete ? (session.skippedStages ? '여기까지, 수고했어요.' : '오늘도, 잘했어요.') : step.name}</h2>
        {complete
          ? <div className="completion-display"><span className="completion-check"><Check size={44} strokeWidth={1.8} /></span><strong>{session.skippedStages ? '일부 구간 진행' : '전체 구간 완료'}</strong></div>
          : <div className={`timer-number ${remainingSeconds >= 6000 ? 'long-time' : ''}`} role="timer" aria-label={`${step.name} 남은 시간`}>{formatTime(remainingSeconds)}</div>}
        {!complete && (step.target
          ? (!bpm && !active
            // Without a profile, the target itself is the entry point to calculating bpm. Not tappable mid-workout.
            ? <button className="stage-goal" onClick={onSettings}><Heart size={20} /><span>목표 최대심박 {step.target.min}–{step.target.max}%</span><span className="goal-action">bpm 계산</span></button>
            : <p className="stage-goal"><Heart size={20} /><span>{bpm ? `목표 ${bpm.min}–${bpm.max} bpm · 추정` : `목표 최대심박 ${step.target.min}–${step.target.max}%`}</span></p>)
          : <p className="stage-goal"><span>{KIND_LABELS[step.kind]} · 내 페이스대로</span></p>)}
        {wakeWarning && <p className="timer-warning">화면이 꺼질 수 있어요. 화면을 켜 두세요.</p>}
        <p className="stage-cue">{complete ? '물을 마시고 편안해질 때까지 쉬어가세요.' : step.cue || '내 몸의 신호에 귀 기울여요.'}</p>
        <div className="stage-segments" aria-hidden="true">{steps.map((item, index) => <span key={item.id} className={`kind-${item.kind} ${index < stepIndex || complete ? 'done' : ''} ${index === stepIndex && !complete ? 'current' : ''}`}><i style={{ width: index < stepIndex || complete ? '100%' : index === stepIndex ? `${position.stepProgress * 100}%` : '0%' }} /></span>)}</div>
      </div>
      {!complete && <div className="timer-next"><span>다음 · <strong>{next?.name ?? '종료'}</strong></span><span className="next-time">{next && formatTime(next.durationSeconds)}<ArrowRight size={18} /></span></div>}
      <div className="timer-controls">
        <button className="icon-button secondary-control" aria-label="처음부터 다시" onClick={onReset} disabled={idle || complete}><RotateCcw size={22} /></button>
        <button className="start-button" onClick={onToggle}>{active ? <Pause size={22} fill="currentColor" /> : complete ? <RotateCcw size={21} /> : <Play size={21} fill="currentColor" />}<span>{buttonText}</span></button>
        <button className="icon-button secondary-control" aria-label="다음 구간으로" onClick={onSkip} disabled={idle || complete}><SkipForward size={22} /></button>
      </div>
      <div className="overall-time"><span>{idle ? '총' : '전체 남은'} <strong>{formatTime((totalMs - elapsedMs) / 1000)}</strong></span></div>
      <div className="total-progress" role="progressbar" aria-label="전체 프로그램 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
      <p className="sr-only" role="status">{complete ? '운동 프로그램이 끝났습니다.' : `${step.name}. ${active ? '진행 중' : session.status === 'paused' ? '일시정지' : '시작 전'}. ${step.cue}`}</p>
    </section>
  )
}
