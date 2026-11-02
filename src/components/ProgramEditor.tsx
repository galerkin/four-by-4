import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Heart, Plus, Repeat2, Trash2 } from 'lucide-react'
import { newId } from '../lib/ids'
import { t as messages, useT } from '../i18n'
import { createIntervalSteps, formatDuration, MAX_STEPS, NORWEGIAN_PROGRAM, parseProgram, STEP_KINDS, type Program, type ProgramStep, type StepKind } from '../lib/programs'
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
  return draftStep({ id: newId('step-'), name: messages().editor.newStepName, kind: 'work', durationSeconds: 240, cue: '' })
}

export function ProgramEditor({ program, onSave, onClose }: { program: Program | null; onSave: (program: Program) => void; onClose: () => void }) {
  const all = useT()
  const text = all.editor
  const copy = program?.id === NORWEGIAN_PROGRAM.id
  const [id] = useState(() => !program || copy ? newId('custom-') : program.id)
  const [name, setName] = useState(program ? copy ? text.copyName(program.name) : program.name : text.defaultName)
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
  return <Modal title={copy ? text.copyTitle : program ? text.editTitle : text.createTitle} subtitle={text.subtitle} onClose={requestClose} wide>
    <form className="program-editor" noValidate onSubmit={(event) => {
      event.preventDefault(); setError('')
      try {
        for (const [index, step] of steps.entries()) {
          const minutes = Number(step.minutes)
          const seconds = Number(step.seconds)
          if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
            throw new Error(text.timeError(index + 1))
          }
        }
        const result = parseProgram({ schemaVersion: 1, id, name, description, steps: steps.map((step) => ({ id: step.id, name: step.name, kind: step.kind, durationSeconds: Number(step.minutes) * 60 + Number(step.seconds), cue: step.cue, ...(step.hasTarget ? { target: { min: Number(step.targetMin), max: Number(step.targetMax) } } : {}) })) })
        onSave(result)
      } catch (cause) { setError(cause instanceof Error ? cause.message : text.checkProgram) }
    }}>
      <label className="field-label" htmlFor="program-name">{text.name}</label><input id="program-name" required maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setDirty(true) }} />
      <label className="field-label" htmlFor="program-description">{text.description} <span>{text.optional}</span></label><input id="program-description" maxLength={180} value={description} placeholder={text.descriptionPlaceholder} onChange={(event) => { setDescription(event.target.value); setDirty(true) }} />
      <details className="repeat-builder"><summary><Repeat2 size={16} />{text.quickBuild}</summary><p className="field-help">{text.quickHelp}</p><div className="recipe-grid">{([['warmup', text.recipe.warmup, text.minutesUnit], ['work', text.recipe.work, text.minutesUnit], ['recovery', text.recipe.recovery, text.minutesUnit], ['rounds', text.recipe.rounds, text.roundsUnit], ['cooldown', text.recipe.cooldown, text.minutesUnit]] as const).map(([key, label, unit]) => <label key={key}>{label}<span><input aria-label={text.quickLabel(label)} type="number" inputMode="numeric" min={key === 'rounds' || key === 'work' ? 1 : 0} max={key === 'rounds' ? 20 : 120} step="1" value={recipe[key]} onChange={(event) => setRecipe((value) => ({ ...value, [key]: event.target.value }))} />{unit}</span></label>)}</div><button className="secondary-button" type="button" onClick={() => setConfirmReplace(true)}>{text.applyRecipe}</button>
        {confirmReplace && <div className="inline-confirm"><p>{text.replaceConfirm}</p><div><button className="secondary-button" type="button" onClick={() => setConfirmReplace(false)}>{text.cancel}</button><button className="primary-button" type="button" onClick={() => {
          try {
            const fields = Object.fromEntries(Object.entries(recipe).map(([key, value]) => [key, Number(value)]))
            if (!Object.values(fields).every(Number.isInteger)) throw new Error(text.recipeIntegers)
            const generated = createIntervalSteps({ warmup: fields.warmup * 60, work: fields.work * 60, recovery: fields.recovery * 60, rounds: fields.rounds, cooldown: fields.cooldown * 60 })
            setSteps(generated.map(draftStep)); setDirty(true); setError(''); setConfirmReplace(false)
          } catch (cause) { setError(cause instanceof Error ? cause.message : text.recipeCheck) }
        }}>{text.replace}</button></div></div>}
      </details>
      <div className="editor-section-heading"><h3>{text.steps}</h3><span>{text.stepSummary(steps.length, MAX_STEPS, Number.isFinite(duration) ? formatDuration(duration) : text.checkTime)}</span></div>
      <div className="editor-blocks">{steps.map((step, index) => <section key={step.id} className={`editor-block kind-${step.kind}`} aria-label={text.stepEdit(index + 1)}>
        <div className="editor-block-heading"><span><i />{text.stepNumber(String(index + 1).padStart(2, '0'))}</span><div><button className="icon-button" type="button" aria-label={text.up(index + 1)} disabled={index === 0} onClick={() => moveStep(index, -1)}><ArrowUp size={16} /></button><button className="icon-button" type="button" aria-label={text.down(index + 1)} disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}><ArrowDown size={16} /></button><button className="icon-button" type="button" aria-label={text.duplicate(index + 1)} disabled={steps.length >= MAX_STEPS} onClick={() => { setDirty(true); setSteps((items) => [...items.slice(0, index + 1), { ...step, id: newId('step-') }, ...items.slice(index + 1)]) }}><Copy size={15} /></button><button className="icon-button" type="button" aria-label={text.remove(index + 1)} disabled={steps.length === 1} onClick={() => { setDirty(true); setSteps((items) => items.filter((_, at) => at !== index)) }}><Trash2 size={15} /></button></div></div>
        <div className="editor-fields"><label>{text.stepName}<input required maxLength={50} aria-label={text.stepNameLabel(index + 1)} value={step.name} onChange={(event) => changeStep(index, { name: event.target.value })} /></label><label>{text.kind}<select aria-label={text.kindLabel(index + 1)} value={step.kind} onChange={(event) => changeStep(index, { kind: event.target.value as StepKind })}>{STEP_KINDS.map((kind) => <option key={kind} value={kind}>{all.kinds[kind]}</option>)}</select></label><label>{text.time}<span className="duration-input"><input type="number" inputMode="numeric" min="0" max="120" step="1" aria-label={text.minutesLabel(index + 1)} value={step.minutes} onChange={(event) => changeStep(index, { minutes: event.target.value })} /><span>{text.minutesUnit}</span><input type="number" inputMode="numeric" min="0" max="59" step="1" aria-label={text.secondsLabel(index + 1)} value={step.seconds} onChange={(event) => changeStep(index, { seconds: event.target.value })} /><span>{text.secondsUnit}</span></span></label></div>
        <details className="step-details"><summary>{text.details} {step.hasTarget ? `(${step.targetMin}–${step.targetMax}%)` : text.optional}</summary><label className="field-label">{text.cue}<input maxLength={200} aria-label={text.cueLabel(index + 1)} value={step.cue} placeholder={text.cuePlaceholder} onChange={(event) => changeStep(index, { cue: event.target.value })} /></label><label className="check-label"><input type="checkbox" checked={step.hasTarget} onChange={(event) => changeStep(index, { hasTarget: event.target.checked })} /><Heart size={15} />{text.target}</label>{step.hasTarget && <div className="target-inputs"><label>{text.min}<input type="number" inputMode="numeric" min="40" max="99" step="1" required aria-label={text.minLabel(index + 1)} value={step.targetMin} onChange={(event) => changeStep(index, { targetMin: event.target.value })} /></label><span>~</span><label>{text.max}<input type="number" inputMode="numeric" min="41" max="100" step="1" required aria-label={text.maxLabel(index + 1)} value={step.targetMax} onChange={(event) => changeStep(index, { targetMax: event.target.value })} /></label><span>% HRmax</span></div>}</details>
      </section>)}</div>
      <button className="add-step-button" type="button" disabled={steps.length >= MAX_STEPS} onClick={() => { setDirty(true); setSteps((items) => [...items, newStep()]) }}><Plus size={17} />{text.addStep}</button>
      <p className="field-help">{text.limits(MAX_STEPS)}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {confirmClose && <div className="inline-confirm" role="alert"><p>{text.unsaved}</p><div><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>{text.keepEditing}</button><button className="danger-button" type="button" onClick={onClose}>{text.discard}</button></div></div>}
      <div className="editor-footer"><span>{text.total} <strong>{Number.isFinite(duration) ? formatDuration(duration) : '—'}</strong></span><button className="primary-button" type="submit"><Check size={17} />{text.save}</button></div>
    </form>
  </Modal>
}
