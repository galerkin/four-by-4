import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Heart, Plus, Repeat2, Trash2 } from 'lucide-react'
import { newId } from '../lib/ids'
import { createIntervalSteps, formatDuration, KIND_LABELS, MAX_STEPS, NORWEGIAN_PROGRAM, parseProgram, type Program, type ProgramStep, type StepKind } from '../lib/programs'
import { Modal } from './Modal'

interface DraftStep {
  id: string
  name: string
  kind: StepKind
  minutes: string
  seconds: string
  cue: string
  hasTarget: boolean
  targetMin: string
  targetMax: string
}
function draftStep(step: ProgramStep): DraftStep {
  return { id: step.id, name: step.name, kind: step.kind, minutes: String(Math.floor(step.durationSeconds / 60)), seconds: String(step.durationSeconds % 60), cue: step.cue, hasTarget: Boolean(step.target), targetMin: String(step.target?.min ?? 60), targetMax: String(step.target?.max ?? 70) }
}
function newStep(): DraftStep {
  return draftStep({ id: newId('step-'), name: '운동', kind: 'work', durationSeconds: 240, cue: '' })
}

export function ProgramEditor({ program, onSave, onClose }: { program: Program | null; onSave: (program: Program) => void; onClose: () => void }) {
  const copy = program?.id === NORWEGIAN_PROGRAM.id
  const [id] = useState(() => !program || copy ? newId('custom-') : program.id)
  const [name, setName] = useState(program ? copy ? `${program.name} (내 프로그램)` : program.name : '나의 프로그램')
  const [description, setDescription] = useState(program?.description ?? '')
  const [steps, setSteps] = useState<DraftStep[]>(() => program ? program.steps.map(draftStep) : [newStep()])
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [recipe, setRecipe] = useState({ warmup: '10', work: '4', recovery: '3', rounds: '4', cooldown: '5' })
  const duration = steps.reduce((sum, step) => sum + Number(step.minutes) * 60 + Number(step.seconds), 0)
  const changeStep = (index: number, patch: Partial<DraftStep>) => { setDirty(true); setError(''); setSteps((items) => items.map((item, at) => at === index ? { ...item, ...patch } : item)) }
  const moveStep = (index: number, direction: number) => {
    setDirty(true)
    setSteps((items) => { const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next })
  }
  const requestClose = () => dirty ? setConfirmClose(true) : onClose()
  return <Modal title={copy ? '나에게 맞게, 복사해서 수정' : program ? '프로그램 다듬기' : '나만의 프로그램 만들기'} subtitle="색상 블록으로 순서를 정하면, 시간은 앱이 챙길게요." onClose={requestClose} wide>
    <form className="program-editor" noValidate onSubmit={(event) => {
      event.preventDefault(); setError('')
      try {
        for (const [index, step] of steps.entries()) {
          const minutes = Number(step.minutes)
          const seconds = Number(step.seconds)
          if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
            throw new Error(`${index + 1}번째 구간은 분(0~120)과 초(0~59)를 정수로 입력해 주세요.`)
          }
        }
        const result = parseProgram({ schemaVersion: 1, id, name, description, steps: steps.map((step) => ({ id: step.id, name: step.name, kind: step.kind, durationSeconds: Number(step.minutes) * 60 + Number(step.seconds), cue: step.cue, ...(step.hasTarget ? { target: { min: Number(step.targetMin), max: Number(step.targetMax) } } : {}) })) })
        onSave(result)
      } catch (cause) { setError(cause instanceof Error ? cause.message : '프로그램 구성을 확인해 주세요.') }
    }}>
      <label className="field-label" htmlFor="program-name">프로그램 이름</label><input id="program-name" required maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setDirty(true) }} />
      <label className="field-label" htmlFor="program-description">짧은 설명 <span>(선택)</span></label><input id="program-description" maxLength={180} value={description} placeholder="어떤 움직임을 위한 프로그램인가요?" onChange={(event) => { setDescription(event.target.value); setDirty(true) }} />
      <details className="repeat-builder"><summary><Repeat2 size={16} />시간·반복 빠르게 구성하기</summary><p className="field-help">준비 → 운동·회복 반복 → 정리로 새롭게 구성해요. 마지막 운동 뒤에는 회복을 넣지 않아요. 심박수 목표는 별도로 설정해 주세요.</p><div className="recipe-grid">{([['warmup', '준비', '분'], ['work', '운동', '분'], ['recovery', '회복', '분'], ['rounds', '반복', '회'], ['cooldown', '정리', '분']] as const).map(([key, label, unit]) => <label key={key}>{label}<span><input aria-label={`빠른 구성 ${label}`} type="number" inputMode="numeric" min={key === 'rounds' || key === 'work' ? 1 : 0} max={key === 'rounds' ? 20 : 120} step="1" value={recipe[key]} onChange={(event) => setRecipe((value) => ({ ...value, [key]: event.target.value }))} />{unit}</span></label>)}</div><button className="secondary-button" type="button" onClick={() => setConfirmReplace(true)}>이 반복 구성 적용</button>
        {confirmReplace && <div className="inline-confirm"><p>현재 구간을 이 구성으로 바꿀까요? 기존 구간별 수정은 사라져요.</p><div><button className="secondary-button" type="button" onClick={() => setConfirmReplace(false)}>취소</button><button className="primary-button" type="button" onClick={() => {
          try {
            const fields = Object.fromEntries(Object.entries(recipe).map(([key, value]) => [key, Number(value)]))
            if (!Object.values(fields).every(Number.isInteger)) throw new Error('빠른 구성의 시간과 반복 횟수는 정수로 입력해 주세요.')
            const generated = createIntervalSteps({ warmup: fields.warmup * 60, work: fields.work * 60, recovery: fields.recovery * 60, rounds: fields.rounds, cooldown: fields.cooldown * 60 })
            setSteps(generated.map(draftStep)); setDirty(true); setError(''); setConfirmReplace(false)
          } catch (cause) { setError(cause instanceof Error ? cause.message : '시간과 반복 횟수를 확인해 주세요.') }
        }}>구성 바꾸기</button></div></div>}
      </details>
      <div className="editor-section-heading"><h3>프로그램 구간</h3><span>{steps.length}/{MAX_STEPS}개 · 총 {Number.isFinite(duration) ? formatDuration(duration) : '시간 확인 필요'}</span></div>
      <div className="editor-blocks">{steps.map((step, index) => <section key={step.id} className={`editor-block kind-${step.kind}`} aria-label={`${index + 1}번째 구간 편집`}>
        <div className="editor-block-heading"><span><i />구간 {String(index + 1).padStart(2, '0')}</span><div><button className="icon-button" type="button" aria-label={`${index + 1}번째 구간 위로`} disabled={index === 0} onClick={() => moveStep(index, -1)}><ArrowUp size={16} /></button><button className="icon-button" type="button" aria-label={`${index + 1}번째 구간 아래로`} disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}><ArrowDown size={16} /></button><button className="icon-button" type="button" aria-label={`${index + 1}번째 구간 복제`} disabled={steps.length >= MAX_STEPS} onClick={() => { setDirty(true); setSteps((items) => [...items.slice(0, index + 1), { ...step, id: newId('step-') }, ...items.slice(index + 1)]) }}><Copy size={15} /></button><button className="icon-button" type="button" aria-label={`${index + 1}번째 구간 삭제`} disabled={steps.length === 1} onClick={() => { setDirty(true); setSteps((items) => items.filter((_, at) => at !== index)) }}><Trash2 size={15} /></button></div></div>
        <div className="editor-fields"><label>이름<input required maxLength={50} aria-label={`${index + 1}번째 구간 이름`} value={step.name} onChange={(event) => changeStep(index, { name: event.target.value })} /></label><label>유형<select aria-label={`${index + 1}번째 구간 유형`} value={step.kind} onChange={(event) => changeStep(index, { kind: event.target.value as StepKind })}>{Object.entries(KIND_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label><label>시간<span className="duration-input"><input type="number" inputMode="numeric" min="0" max="120" step="1" aria-label={`${index + 1}번째 구간 분`} value={step.minutes} onChange={(event) => changeStep(index, { minutes: event.target.value })} /><span>분</span><input type="number" inputMode="numeric" min="0" max="59" step="1" aria-label={`${index + 1}번째 구간 초`} value={step.seconds} onChange={(event) => changeStep(index, { seconds: event.target.value })} /><span>초</span></span></label></div>
        <details className="step-details"><summary>안내 문구 · 목표 심박수 {step.hasTarget ? `(${step.targetMin}–${step.targetMax}%)` : '(선택)'}</summary><label className="field-label">구간 안내<input maxLength={200} aria-label={`${index + 1}번째 구간 안내`} value={step.cue} placeholder="운동 중 기억할 한 가지를 적어보세요." onChange={(event) => changeStep(index, { cue: event.target.value })} /></label><label className="check-label"><input type="checkbox" checked={step.hasTarget} onChange={(event) => changeStep(index, { hasTarget: event.target.checked })} /><Heart size={15} />최대 심박수 기준 목표 설정</label>{step.hasTarget && <div className="target-inputs"><label>최소<input type="number" inputMode="numeric" min="40" max="99" step="1" required aria-label={`${index + 1}번째 구간 최소 심박수 비율`} value={step.targetMin} onChange={(event) => changeStep(index, { targetMin: event.target.value })} /></label><span>~</span><label>최대<input type="number" inputMode="numeric" min="41" max="100" step="1" required aria-label={`${index + 1}번째 구간 최대 심박수 비율`} value={step.targetMax} onChange={(event) => changeStep(index, { targetMax: event.target.value })} /></label><span>% HRmax</span></div>}</details>
      </section>)}</div>
      <button className="add-step-button" type="button" disabled={steps.length >= MAX_STEPS} onClick={() => { setDirty(true); setSteps((items) => [...items, newStep()]) }}><Plus size={17} />구간 추가</button>
      <p className="field-help">각 구간 5초~120분 · 최대 {MAX_STEPS}개 구간, 총 6시간. 기록에는 저장된 프로그램의 실제 진행 시간만 남아요.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {confirmClose && <div className="inline-confirm" role="alert"><p>저장하지 않은 변경이 있어요. 편집을 그만둘까요?</p><div><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>계속 편집</button><button className="danger-button" type="button" onClick={onClose}>변경 버리기</button></div></div>}
      <div className="editor-footer"><span>총 <strong>{Number.isFinite(duration) ? formatDuration(duration) : '—'}</strong></span><button className="primary-button" type="submit"><Check size={17} />프로그램 저장</button></div>
    </form>
  </Modal>
}
