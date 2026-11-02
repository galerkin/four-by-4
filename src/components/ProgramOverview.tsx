import { Check, Pencil } from 'lucide-react'
import { useT } from '../i18n'
import { formatTime, type Program } from '../lib/programs'

export function ProgramOverview({ program, stepIndex, complete, busy, onEdit }: { program: Program; stepIndex: number; complete: boolean; busy: boolean; onEdit: () => void }) {
  const text = useT().overview
  return <section className="program-overview light-card" aria-labelledby="program-overview-title">
    <div className="card-heading"><h2 id="program-overview-title">{text.title}</h2>{!busy && <button className="text-button edit-program" onClick={onEdit}><Pencil size={16} />{text.edit}</button>}</div>
    <ol className="program-blocks" aria-label={text.steps}>
      {program.steps.map((step, index) => <li key={step.id} className={`program-block kind-${step.kind} ${index === stepIndex && !complete ? 'is-current' : ''} ${index < stepIndex || complete ? 'is-past' : ''}`} aria-current={index === stepIndex && !complete ? 'step' : undefined}>
        {(index < stepIndex || complete) && <Check size={16} aria-label={text.done} />}<strong className="block-name">{step.name}</strong><span className="block-time">{formatTime(step.durationSeconds)}</span>
      </li>)}
    </ol>
  </section>
}
