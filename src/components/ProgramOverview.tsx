import { Check, Pencil } from 'lucide-react'
import { formatTime, type Program } from '../lib/programs'

export function ProgramOverview({ program, stepIndex, complete, busy, onEdit }: { program: Program; stepIndex: number; complete: boolean; busy: boolean; onEdit: () => void }) {
  return <section className="program-overview light-card" aria-labelledby="program-overview-title">
    <div className="card-heading"><h2 id="program-overview-title">오늘의 순서</h2>{!busy && <button className="text-button edit-program" onClick={onEdit}><Pencil size={16} />편집</button>}</div>
    <ol className="program-blocks" aria-label="프로그램 구간">
      {program.steps.map((step, index) => <li key={step.id} className={`program-block kind-${step.kind} ${index === stepIndex && !complete ? 'is-current' : ''} ${index < stepIndex || complete ? 'is-past' : ''}`} aria-current={index === stepIndex && !complete ? 'step' : undefined}>
        {(index < stepIndex || complete) && <Check size={16} aria-label="완료" />}<strong className="block-name">{step.name}</strong><span className="block-time">{formatTime(step.durationSeconds)}</span>
      </li>)}
    </ol>
  </section>
}
