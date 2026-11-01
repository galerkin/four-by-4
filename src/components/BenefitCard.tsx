import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'

const tips = [
  { label: 'A STRONGER HEART', title: <>지금의 숨참이,<br />일상의 여유로.</>, text: '4×4 인터벌은 심폐 체력(VO₂max) 향상에 도움을 줄 수 있어요. 네 번의 집중을, 나를 위한 투자로 생각해요.' },
  { label: 'PACE, NOT A RACE', title: <>전력 질주보다,<br />끝까지 갈 수 있는 힘.</>, text: '최대 심박수의 85–95%가 고강도 구간의 목표예요. 첫 1–2분은 서서히 올리고, 무리해서 숫자를 쫓지 않아요.' },
  { label: 'RECOVERY IS TRAINING', title: <>쉬어가는 3분도,<br />운동의 일부니까.</>, text: '천천히 걷는 활동성 회복으로 다음 4분을 준비해요. 회복 구간까지 지켜야 네 번의 집중을 이어갈 수 있어요.' },
  { label: 'CONSISTENCY WINS', title: <>한 번의 최고보다,<br />꾸준한 나의 페이스.</>, text: 'NTNU는 체력 향상을 위해 주 2–3회 인터벌을 권해요. 개인차가 있으니 회복할 시간을 두고 빈도를 조절하세요.' },
  { label: 'MOVE YOUR WAY', title: <>달리기가 아니어도,<br />충분히 좋아요.</>, text: '자전거, 경사 걷기처럼 큰 근육을 쓰는 유산소 운동도 좋아요. 내 관절과 체력에 맞는 방법을 선택하세요.' },
]
const generalTips = [
  { label: 'LESS THINKING, MORE MOVING', title: <>순서는 맡겨두고,<br />움직임에 집중해요.</>, text: '정해 둔 구간이 끝나면 다음 단계로 자동 전환돼요. 시간은 앱이 챙길게요. 내 몸의 신호만 살펴주세요.' },
  { label: 'YOUR OWN RHYTHM', title: <>잘 맞는 운동은,<br />다시 하게 되니까.</>, text: '운동을 마친 뒤 시간과 구성을 조금씩 조절해 보세요. 나에게 맞는 프로그램을 파일로 저장하고 다시 꺼낼 수 있어요.' },
  { label: 'RECOVERY MATTERS', title: <>쉼도 계획하면,<br />더 멀리 갈 수 있어요.</>, text: '불편함을 참으며 이어갈 필요는 없어요. 필요하면 일시정지하고 쉬어가세요. 운동의 기준은 항상 내 몸이에요.' },
]

export function BenefitCard({ stepIndex, norwegian, onGuide }: { stepIndex: number; norwegian: boolean; onGuide: () => void }) {
  const [offset, setOffset] = useState(0)
  const items = norwegian ? tips : generalTips
  const index = (stepIndex + offset) % items.length
  const tip = items[index]
  return (
    <aside className="benefit-card" aria-label="운동 중 기억할 한 가지">
      <div className="benefit-top"><span><Sparkles size={15} /> 움직이는 이유</span><span className="tip-count">{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span></div>
      <div className="petal-art" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="benefit-copy"><span className="tiny-label">{tip.label}</span><h2>{tip.title}</h2><p>{tip.text}</p></div>
      <div className="benefit-bottom"><button className="text-button" onClick={onGuide}>{norwegian ? '4×4의 원리 알아보기' : '프로그램 실행 가이드'}<ArrowRight size={14} /></button><button className="icon-button tip-next" aria-label="다음 운동 팁" onClick={() => setOffset((value) => value + 1)}><ArrowRight size={18} /></button></div>
    </aside>
  )
}
