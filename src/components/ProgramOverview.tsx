import { useEffect, useRef } from 'react'
import { Check, Clock3, Layers3, Pencil } from 'lucide-react'
import { formatTime, KIND_LABELS, type Program } from '../lib/programs'

export function ProgramOverview({ program, stepIndex, complete, busy, onEdit }: { program: Program; stepIndex: number; complete: boolean; busy: boolean; onEdit: () => void }) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const list = listRef.current
    const item = list?.children[stepIndex] as HTMLElement | undefined
    if (!list || !item) return
    // Scroll the program list, not the page: the large timer must stay in view.
    list.scrollTop = Math.max(0, item.offsetTop - list.offsetTop - list.clientHeight / 2 + item.clientHeight / 2)
  }, [stepIndex, program.id])
  return <section className="program-overview light-card" aria-labelledby="program-overview-title">
    <div className="card-heading"><div className="heading-with-icon"><span className="section-icon"><Layers3 size={18} /></span><h2 id="program-overview-title">오늘의 순서</h2></div><button className="text-button edit-program" disabled={busy} onClick={onEdit}><Pencil size={14} />편집</button></div>
    <ol className="program-blocks" ref={listRef} tabIndex={0} aria-label="프로그램 구간">
      {program.steps.map((step, index) => <li key={step.id} className={`program-block kind-${step.kind} ${index === stepIndex && !complete ? 'is-current' : ''} ${index < stepIndex || complete ? 'is-past' : ''}`} aria-current={index === stepIndex && !complete ? 'step' : undefined}>
        <span className="block-number">{index < stepIndex || complete ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span><span className="block-name"><strong>{step.name}</strong><small>{step.target ? `${step.target.min}–${step.target.max}% HRmax` : KIND_LABELS[step.kind]}</small></span><span className="block-time">{formatTime(step.durationSeconds)}</span>
      </li>)}
    </ol>
    <p className="program-footnote"><Clock3 size={13} />{busy ? '진행 중에는 프로그램을 편집할 수 없어요.' : `${program.steps.length}개 구간 · 순서대로 자동 전환돼요.`}</p>
  </section>
}
