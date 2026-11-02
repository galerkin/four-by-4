import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'

export function BenefitCard({ stepIndex, norwegian, onGuide }: { stepIndex: number; norwegian: boolean; onGuide: () => void }) {
  const text = useT().benefit
  const [offset, setOffset] = useState(0)
  const items = norwegian ? text.tips : text.generalTips
  const tip = items[(stepIndex + offset) % items.length]
  return (
    <aside className="benefit-card light-card" aria-label={text.label}>
      <h2><Sparkles size={18} />{tip.title}</h2>
      <p>{tip.text}</p>
      <div className="benefit-bottom"><button className="text-button" onClick={onGuide}>{norwegian ? text.guide4x4 : text.guide}<ArrowRight size={16} /></button><button className="icon-button tip-next" aria-label={text.nextTip} onClick={() => setOffset((value) => value + 1)}><ArrowRight size={20} /></button></div>
    </aside>
  )
}
