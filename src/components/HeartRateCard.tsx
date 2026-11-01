import { ArrowUpRight, Heart, Info } from 'lucide-react'
import { heartRateRange, maximumHeartRate, type HeartProfile } from '../lib/storage'
import type { ProgramStep } from '../lib/programs'

export function HeartRateCard({ step, profile, onSettings }: { step: ProgramStep; profile: HeartProfile | null; onSettings: () => void }) {
  const target = step.target
  const bpm = profile && target ? heartRateRange(profile, target) : null
  return (
    <section className="heart-card light-card" aria-labelledby="heart-title">
      <div className="card-heading"><div className="heading-with-icon"><span className="heart-icon"><Heart size={18} /></span><h2 id="heart-title">지금의 목표 심박수</h2></div><span className="soft-label">측정 아님</span></div>
      <div className="heart-value">{target ? <><strong>{bpm ? `${bpm.min}–${bpm.max}` : `${target.min}–${target.max}`}</strong><span>{bpm ? 'bpm' : '%'}</span></> : <strong className="no-target">내 페이스대로</strong>}</div>
      <p className="heart-caption">{target ? `${step.name} · 최대 심박수의 ${target.min}–${target.max}%` : '이 구간은 심박수 목표가 없어요.'}</p>
      <div className="heart-meter" aria-hidden="true"><div className="meter-track" />{target && <div className="meter-target" style={{ left: `${(target.min - 40) / 60 * 100}%`, width: `${(target.max - target.min) / 60 * 100}%` }} />}<div className="meter-labels"><span>가볍게</span><span>적당히</span><span>강하게</span></div></div>
      <button className="heart-settings" onClick={onSettings}><span>{profile ? `최대 심박수 ${maximumHeartRate(profile)} bpm · ${profile.method === 'age' ? '추정값' : '직접 입력'}` : '내 목표 심박수 계산하기'}</span><ArrowUpRight size={18} /></button>
      <p className="card-footnote"><Info size={13} />워치의 심박수를 직접 확인해 주세요.</p>
    </section>
  )
}
