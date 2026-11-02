import { ArrowRight, Check, ChevronDown, Heart, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useT } from '../i18n'
import { compactTime, formatTime } from '../lib/programs'
import { FocusTimer } from './FocusTimer'
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
  const text = useT()
  const tx = text.timer
  const { step, stepIndex, remainingSeconds, progress, elapsedMs, totalMs } = position
  const steps = session.program.steps
  const complete = session.status === 'completed'
  const active = session.status === 'running'
  const idle = session.status === 'idle'
  // While a workout is under way, show only: remaining time, phase bar, next step, controls, sound.
  const focus = active || session.status === 'paused'
  const next = steps[stepIndex + 1]
  const bpm = profile && step.target ? heartRateRange(profile, step.target) : null
  const works = steps.filter((item) => item.kind === 'work')
  const count = step.kind === 'work' && works.length > 1
    ? tx.interval(steps.slice(0, stepIndex + 1).filter((item) => item.kind === 'work').length, works.length)
    : `${stepIndex + 1}/${steps.length}`
  const buttonText = active ? tx.pause : session.status === 'paused' ? tx.resume : complete ? tx.again : tx.start
  return (
    <section className={`timer-card phase-${step.kind} ${complete ? 'timer-complete' : ''} ${focus ? 'is-focus' : ''}`} aria-label={tx.region}>
      <div className="timer-toolbar">
        {focus
          ? <span />
          : <button className="program-picker" onClick={onPrograms} aria-label={tx.changeProgram(session.program.name)}><strong>{session.program.name}<ChevronDown size={18} /></strong></button>}
        <button className="icon-button timer-sound" aria-label={sound ? tx.soundOff : tx.soundOn} aria-pressed={sound} onClick={onSound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </div>
      <div className="stage-panel">
        {!complete && !focus && <span className="step-count">{count}</span>}
        <h2 className={focus ? 'sr-only' : ''}>{complete ? (session.skippedStages ? tx.partialTitle : tx.doneTitle) : step.name}</h2>
        {complete
          ? <div className="completion-display"><span className="completion-check"><Check size={44} strokeWidth={1.8} /></span><strong>{session.skippedStages ? tx.partialLabel : tx.doneLabel}</strong></div>
          : focus
            ? <FocusTimer text={compactTime(formatTime(remainingSeconds))} label={tx.remaining(step.name)} />
            : <div className={`timer-number ${remainingSeconds >= 6000 ? 'long-time' : ''}`} role="timer" aria-label={tx.remaining(step.name)}>{formatTime(remainingSeconds)}</div>}
        {!complete && !focus && (step.target
          ? (!bpm && !active
            // Without a profile, the target itself is the entry point to calculating bpm. Not tappable mid-workout.
            ? <button className="stage-goal" onClick={onSettings}><Heart size={20} /><span>{tx.targetPercent(step.target.min, step.target.max)}</span><span className="goal-action">{tx.calculateBpm}</span></button>
            : <p className="stage-goal"><Heart size={20} /><span>{bpm ? tx.targetBpm(bpm.min, bpm.max) : tx.targetPercent(step.target.min, step.target.max)}</span></p>)
          : <p className="stage-goal"><span>{tx.ownPace(text.kinds[step.kind])}</span></p>)}
        {wakeWarning && !focus && <p className="timer-warning">{tx.wakeWarning}</p>}
        {!focus && <p className="stage-cue">{complete ? tx.doneCue : step.cue || tx.defaultCue}</p>}
        <div className="stage-segments" aria-hidden="true">{steps.map((item, index) => <span key={item.id} className={`kind-${item.kind} ${index < stepIndex || complete ? 'done' : ''} ${index === stepIndex && !complete ? 'current' : ''}`}><i style={{ width: index < stepIndex || complete ? '100%' : index === stepIndex ? `${position.stepProgress * 100}%` : '0%' }} /></span>)}</div>
      </div>
      {!complete && <div className="timer-next"><span>{tx.next}<strong>{next?.name ?? tx.end}</strong></span><span className="next-time">{next && formatTime(next.durationSeconds)}<ArrowRight size={18} /></span></div>}
      <div className="timer-controls">
        <button className="icon-button secondary-control" aria-label={tx.restart} onClick={onReset} disabled={idle || complete}><RotateCcw size={22} /></button>
        <button className="start-button" onClick={onToggle}>{active ? <Pause size={22} fill="currentColor" /> : complete ? <RotateCcw size={21} /> : <Play size={21} fill="currentColor" />}<span>{buttonText}</span></button>
        <button className="icon-button secondary-control" aria-label={tx.skipStep} onClick={onSkip} disabled={idle || complete}><SkipForward size={22} /></button>
      </div>
      {!focus && <><div className="overall-time"><span>{idle ? tx.total : tx.totalRemaining} <strong>{formatTime((totalMs - elapsedMs) / 1000)}</strong></span></div>
      <div className="total-progress" role="progressbar" aria-label={tx.totalProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div></>}
      <p className="sr-only" role="status">{complete ? tx.statusDone : `${step.name}. ${active ? tx.statusRunning : session.status === 'paused' ? tx.statusPaused : tx.statusIdle}. ${step.cue}`}</p>
    </section>
  )
}
