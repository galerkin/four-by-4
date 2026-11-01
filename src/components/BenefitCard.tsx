import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'

const tips = [
  { title: '지금의 숨참이, 일상의 여유로.', text: '4×4 인터벌은 심폐 체력(VO₂max) 향상에 도움을 줄 수 있어요.' },
  { title: '전력 질주보다, 끝까지 갈 힘.', text: '고강도 목표는 최대 심박수의 85–95%. 처음 1–2분은 서서히 올려요.' },
  { title: '쉬어가는 3분도 운동이에요.', text: '천천히 걸으며 회복해야 다음 4분을 지킬 수 있어요.' },
  { title: '한 번의 최고보다, 꾸준함.', text: '체력 향상을 위해서는 주 2–3회 인터벌이 권장돼요.' },
  { title: '달리기가 아니어도 좋아요.', text: '자전거·경사 걷기처럼 큰 근육을 쓰는 유산소도 충분해요.' },
]
const generalTips = [
  { title: '순서는 맡기고, 움직임에 집중.', text: '구간이 끝나면 자동으로 다음 단계로 넘어가요.' },
  { title: '잘 맞는 운동은 다시 하게 돼요.', text: '시간과 구성을 조금씩 조절해 나에게 맞춰 보세요.' },
  { title: '필요하면 언제든 쉬어가세요.', text: '운동의 기준은 항상 내 몸이에요.' },
]

export function BenefitCard({ stepIndex, norwegian, onGuide }: { stepIndex: number; norwegian: boolean; onGuide: () => void }) {
  const [offset, setOffset] = useState(0)
  const items = norwegian ? tips : generalTips
  const tip = items[(stepIndex + offset) % items.length]
  return (
    <aside className="benefit-card light-card" aria-label="운동 중 기억할 한 가지">
      <h2><Sparkles size={18} />{tip.title}</h2>
      <p>{tip.text}</p>
      <div className="benefit-bottom"><button className="text-button" onClick={onGuide}>{norwegian ? '4×4 가이드' : '실행 가이드'}<ArrowRight size={16} /></button><button className="icon-button tip-next" aria-label="다음 운동 팁" onClick={() => setOffset((value) => value + 1)}><ArrowRight size={20} /></button></div>
    </aside>
  )
}
