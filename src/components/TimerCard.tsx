import { ArrowRight, Check, ChevronDown, Heart, Pause, Play, RotateCcw, SkipForward, Sun, Volume2, VolumeX } from 'lucide-react'
import { formatDuration, formatTime, KIND_LABELS } from '../lib/programs'
import { heartRateRange, type HeartProfile } from '../lib/storage'
import { type Session, type sessionPosition } from '../lib/timer'

interface Props {
  session: Session
  position: ReturnType<typeof sessionPosition>
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
  onPrograms: () => void
  sound: boolean
  onSound: () => void
  wakeActive: boolean
  profile: HeartProfile | null
}
const phaseNames = { warmup: 'WARM UP', work: 'WORK', recovery: 'RECOVER', cooldown: 'COOL DOWN' }

export function TimerCard({ session, position, onToggle, onReset, onSkip, onPrograms, sound, onSound, wakeActive, profile }: Props) {
  const { step, stepIndex, remainingSeconds, progress, elapsedMs, totalMs } = position
  const complete = session.status === 'completed'
  const active = session.status === 'running'
  const next = session.program.steps[stepIndex + 1]
  const bpm = profile && step.target ? heartRateRange(profile, step.target) : null
  const buttonText = active ? '일시정지' : session.status === 'paused' ? '이어서 운동' : complete ? '다시 준비하기' : '운동 시작'
  return (
    <section className={`timer-card phase-${step.kind} ${complete ? 'timer-complete' : ''}`} aria-label="운동 타이머">
      <div className="timer-toolbar">
        <button className="program-picker" onClick={onPrograms}><span>오늘의 프로그램</span><strong>{session.program.name}<ChevronDown size={17} /></strong></button>
        <button className="icon-button timer-sound" aria-label={sound ? '알림음 끄기' : '알림음 켜기'} aria-pressed={sound} onClick={onSound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </div>
      <div className="stage-panel">
        <div className="stage-topline"><span className="stage-label"><span className={`status-dot ${active ? 'is-running' : ''}`} />{complete ? 'ALL DONE' : phaseNames[step.kind]}</span><span className="step-count">구간 {String(stepIndex + 1).padStart(2, '0')} <span>/ {String(session.program.steps.length).padStart(2, '0')}</span></span></div>
        <h2>{complete ? (session.skippedStages ? '여기까지, 수고했어요.' : '오늘도, 잘했어요.') : step.name}</h2>
        {complete
          ? <div className="completion-display"><span className="completion-check"><Check size={48} strokeWidth={1.7} /></span><span><strong>{formatDuration(Math.floor(position.activeMs / 1000))}</strong><small>실제 진행 시간 · {session.skippedStages ? '일부 구간 진행' : '전체 구간 완료'}</small></span></div>
          : <div className={`timer-number ${remainingSeconds >= 6000 ? 'long-time' : ''}`} role="timer" aria-label={`${step.name} 남은 시간`}>{formatTime(remainingSeconds)}</div>}
        <div className="stage-goal">
          {complete ? <span>오늘의 움직임을 기록에 남겼어요.</span> : <><Heart size={16} /><span>{step.target ? bpm ? `목표 ${bpm.min}–${bpm.max} bpm` : `목표 ${step.target.min}–${step.target.max}% HRmax` : `${KIND_LABELS[step.kind]} · 내 페이스대로`}</span>{session.status === 'paused' && <span className="paused-badge">일시정지</span>}</>}
        </div>
        {!complete && <p className="stage-caption">{step.target ? `${bpm ? `최대 심박수의 ${step.target.min}–${step.target.max}% · ` : '최대 심박수 기준 · '}실시간 측정 아님` : '몸 상태에 맞게 강도를 조절하세요.'}</p>}
        <p className="stage-cue">{complete ? '물을 마시고, 몸이 편안해질 때까지 쉬어가세요.' : step.cue || '내 몸의 신호에 귀 기울이며 움직여요.'}</p>
        <div className="stage-segments" aria-hidden="true">{session.program.steps.map((item, index) => <span key={item.id} className={`${index < stepIndex || complete ? 'done' : ''} ${index === stepIndex && !complete ? 'current' : ''}`}><i style={{ width: index < stepIndex || complete ? '100%' : index === stepIndex ? `${position.stepProgress * 100}%` : '0%' }} /></span>)}</div>
      </div>
      <div className="timer-next"><span className="next-label">{complete ? '잘했어요' : '다음 구간'}<strong>{complete ? '오늘의 운동 마무리' : next?.name ?? '프로그램 종료'}</strong></span><span className="next-time">{!complete && next && formatTime(next.durationSeconds)}<ArrowRight size={18} /></span></div>
      <div className="timer-controls">
        <button className="icon-button secondary-control" aria-label="처음부터 다시" onClick={onReset} disabled={session.status === 'idle' || complete}><RotateCcw size={21} /></button>
        <button className="start-button" onClick={onToggle}>{active ? <Pause size={21} fill="currentColor" /> : complete ? <RotateCcw size={20} /> : <Play size={20} fill="currentColor" />}<span>{buttonText}</span></button>
        <button className="icon-button secondary-control" aria-label="다음 구간으로" onClick={onSkip} disabled={session.status === 'idle' || complete}><SkipForward size={21} /></button>
      </div>
      <div className="overall-time"><span>전체 경과 <strong>{formatTime(Math.floor(elapsedMs / 1000))}</strong></span><span>남은 시간 <strong>{formatTime((totalMs - elapsedMs) / 1000)}</strong></span></div>
      <div className="total-progress" role="progressbar" aria-label="전체 프로그램 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="timer-bottom"><span><Sun size={14} />{wakeActive ? '화면 켜짐 유지 중' : '운동 중에는 이 화면을 열어두세요'}</span><span>총 {formatDuration(totalMs / 1000)}</span></div>
      <p className="sr-only" role="status">{complete ? '운동 프로그램이 끝났습니다.' : `${step.name}. ${active ? '진행 중' : session.status === 'paused' ? '일시정지' : '시작 전'}. ${step.cue}`}</p>
    </section>
  )
}
